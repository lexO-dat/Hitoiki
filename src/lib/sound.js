// Cozy, synthesized sound effects (Web Audio). Soft marimba-like plucks on a pentatonic scale,
// a touch of reverb, nothing louder than a whisper. No audio files needed.
import { store } from './storage.js';

let ctx = null;
let master = null;
let wet = null;

const PENTA = [0, 2, 4, 7, 9]; // major pentatonic
const BASE = 392; // G4

function setup() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  // Small synthetic room: decaying noise impulse through a convolver.
  const len = Math.floor(ctx.sampleRate * 1.6);
  const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const verb = ctx.createConvolver();
  verb.buffer = impulse;
  wet = ctx.createGain();
  wet.gain.value = 0.22;
  verb.connect(wet).connect(master);
  master.verb = verb;
  return ctx;
}

const settings = () => store.get().settings;

function out() {
  const s = settings();
  if (!s.sound) return null;
  const c = setup();
  if (!c) return null;
  if (c.state === 'suspended') c.resume();
  master.gain.value = (s.volume ?? 0.7) * 0.5;
  return c;
}

// One soft pluck: sine body + quiet octave partial, fast attack, gentle exponential decay.
function pluck(freq, { when = 0, dur = 0.5, gain = 0.25, type = 'sine', bright = 2200 } = {}) {
  const c = out();
  if (!c) return;
  const t = c.currentTime + when;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(bright, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(300, bright / 3), t + dur);
  env.connect(lp);
  lp.connect(master);
  lp.connect(master.verb);
  for (const [mult, g] of [[1, 1], [2, 0.18], [3.01, 0.06]]) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, t);
    og.gain.value = g;
    o.connect(og).connect(env);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

const note = (step, octave = 0) => {
  const i = ((step % 5) + 5) % 5;
  const oct = Math.floor(step / 5) + octave;
  return BASE * 2 ** ((PENTA[i] + 12 * oct) / 12);
};

let lastTap = 0;
let tapStep = 0;

export const sfx = {
  // Generic board interaction: a gentle wandering melody so repeated taps never sound identical.
  tap() {
    const now = performance.now();
    if (now - lastTap < 45) return;
    lastTap = now;
    tapStep = (tapStep + [1, 2, -1, 1, -2, 3][Math.floor(Math.random() * 6)] + 10) % 10;
    pluck(note(tapStep), { dur: 0.35, gain: 0.12 });
  },
  // Rising note for path-style progress (e.g. Ruta): pitch follows how far you got.
  step(n) {
    const now = performance.now();
    if (now - lastTap < 30) return;
    lastTap = now;
    pluck(note(n % 12), { dur: 0.3, gain: 0.11 });
  },
  ui() {
    pluck(note(7), { dur: 0.12, gain: 0.05, bright: 1600 });
  },
  undo() {
    pluck(note(-3), { dur: 0.25, gain: 0.08, bright: 1200 });
  },
  error() {
    pluck(note(1, -1), { dur: 0.35, gain: 0.11, type: 'triangle', bright: 900 });
    pluck(note(0, -1) * 0.94, { when: 0.11, dur: 0.45, gain: 0.1, type: 'triangle', bright: 800 });
  },
  hint() {
    [6, 8, 10].forEach((s, i) => pluck(note(s), { when: i * 0.07, dur: 0.5, gain: 0.07, bright: 4000 }));
  },
  solve() {
    // Warm rolled chord, then a little sparkle on top.
    [0, 2, 4, 5, 7].forEach((s, i) => pluck(note(s), { when: i * 0.09, dur: 1.6, gain: 0.13 }));
    [10, 12].forEach((s, i) => pluck(note(s), { when: 0.55 + i * 0.12, dur: 1.2, gain: 0.06, bright: 5000 }));
  },
  // Browsers only allow audio after a user gesture.
  unlock() {
    if (settings().sound) out();
  },
};
