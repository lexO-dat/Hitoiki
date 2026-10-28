// Cozy, synthesized, *musical* sound effects (Web Audio, no audio files).
//
// Design (see README → Sonido):
//  - Everything you play is a note of a slow chord progression (I – vi – IV – V) in the day's key,
//    so a game session becomes a little melody instead of the same click over and over.
//  - Momentum: quick consecutive moves climb up the chord like an arpeggio (Peggle-style combo);
//    pausing lets it settle, a mistake breaks it. Erasing walks back down.
//  - Progress: in path games the pitch follows how much of the board is done, and the
//    progression reaches its home chord exactly when the puzzle is solved.
//  - Variety without noise: each game has its own instrument, each day its own key, and every
//    note is humanized (tiny detune, velocity, timing and stereo position).
//  - Rewards: occasional sparkles, several solve cadences, a bigger one for perfect games, and a
//    fixed "streak" motif (signature sounds stay identical so they are recognizable).
//  - Optional soft ambient pad that follows the chords while you play.
import { store } from './storage.js';
import { todayKey } from './dates.js';

let ctx = null;
let master = null;
let verb = null;

function setup() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  // Gentle limiter so stacked notes never get harsh.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  // Small synthetic room: decaying noise impulse through a convolver.
  const len = Math.floor(ctx.sampleRate * 1.8);
  const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  verb = ctx.createGain();
  verb.gain.value = 0.25;
  verb.connect(conv).connect(master);
  // Never keep sounding in the background (the pad would otherwise play with the app closed).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {});
    else if (settings().sound) ctx.resume().catch(() => {});
  });
  return ctx;
}

const settings = () => store.get().settings;

function out() {
  const s = settings();
  if (!s.sound) return null;
  const c = setup();
  if (!c) return null;
  if (c.state === 'suspended') c.resume().catch(() => {});
  master.gain.value = (s.volume ?? 0.7) * 0.55;
  return c;
}

// ---------------------------------------------------------------- harmony

const C4 = 261.63;
const ROOTS = [0, 2, 3, 5, 7, 9]; // C, D, E♭, F, G, A: every day sounds a bit different
const PENTA = [0, 2, 4, 7, 9];
// Cozy voicings (pitch classes relative to the key): I add9, vi7, IV maj7, V sus.
const PROGRESSION = [
  [0, 4, 7, 2],
  [9, 0, 4, 7],
  [5, 9, 0, 4],
  [7, 0, 2, 5],
];

const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
let keyRoot = ROOTS[hash(todayKey()) % ROOTS.length];
const hz = (semi) => C4 * 2 ** ((keyRoot + semi) / 12);

// All semitone offsets (from the key root) of the given pitch classes between lo and hi.
function ladder(pcs, lo = -5, hi = 26) {
  const out = [];
  for (let s = lo; s <= hi; s++) if (pcs.includes(((s % 12) + 12) % 12)) out.push(s);
  return out;
}

let chordIdx = 0;
const chord = () => PROGRESSION[chordIdx % PROGRESSION.length];

// ---------------------------------------------------------------- instruments

// partials: [frequency multiple, relative gain]; drop: pitch glides down from this multiple.
const INSTRUMENTS = {
  marimba: { partials: [[1, 1], [4, 0.22], [9.2, 0.04]], dur: 0.5, bright: 2600 },
  kalimba: { partials: [[1, 1], [2, 0.12], [6.1, 0.09]], dur: 0.7, bright: 3200 },
  bell: { partials: [[1, 1], [2.76, 0.28], [5.4, 0.1], [8.93, 0.04]], dur: 1.3, bright: 4200, gain: 0.75 },
  harp: { partials: [[1, 1], [2, 0.3], [3, 0.1]], dur: 0.8, bright: 2400, type: 'triangle', gain: 0.85 },
  wood: { partials: [[1, 1], [2.4, 0.2]], dur: 0.2, bright: 1800 },
  drop: { partials: [[1, 1], [2, 0.1]], dur: 0.35, bright: 2600, drop: 1.25 },
};

const GAME_INSTRUMENT = {
  queens: 'marimba',
  tango: 'marimba',
  zip: 'kalimba',
  lits: 'kalimba',
  bridges: 'bell',
  sets: 'bell',
  mind: 'bell',
  shikaku: 'harp',
  sudoku: 'harp',
  pipes: 'wood',
  kami: 'drop',
};

let instrument = 'marimba';
let voices = 0;
const rand = (a, b) => a + Math.random() * (b - a);

// One humanized note.
// `force`: rewards always sound, even when many notes are still ringing.
function play(freq, { when = 0, gain = 0.2, inst = instrument, dur, bright, pan = rand(-0.3, 0.3), dark = false, force = false } = {}) {
  const c = out();
  if (!c || (voices > 18 && !force)) return;
  const I = INSTRUMENTS[inst];
  const d = dur ?? I.dur;
  const b = (bright ?? I.bright) * (dark ? 0.45 : 1);
  const t = c.currentTime + when + rand(0, 0.008);
  const g = gain * (I.gain ?? 1) * rand(0.85, 1.05);
  const f = freq * 2 ** (rand(-5, 5) / 1200); // ±5 cents
  if (import.meta.env?.DEV) window.__sfxNotes?.push({ hz: Math.round(freq), inst, gain: +g.toFixed(3), at: Math.round(performance.now()) });

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(g, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + d);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(b, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(300, b / 3), t + d);
  const p = c.createStereoPanner ? c.createStereoPanner() : null;
  if (p) p.pan.value = pan;
  env.connect(lp);
  (p ? lp.connect(p) : lp).connect(master);
  lp.connect(verb);

  voices++;
  let left = I.partials.length;
  for (const [mult, pg] of I.partials) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = I.type ?? 'sine';
    o.frequency.setValueAtTime(f * mult * (I.drop ?? 1), t);
    if (I.drop) o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.06);
    og.gain.value = pg;
    o.connect(og).connect(env);
    o.start(t);
    o.stop(t + d + 0.05);
    o.onended = () => --left === 0 && voices--;
  }
}

// ---------------------------------------------------------------- ambient pad

let pad = null;

function padChord(pcs) {
  if (!pad) return;
  const c = ctx;
  const t = c.currentTime;
  pad.oscs.forEach((o, i) => {
    const pc = pcs[Math.floor(i / 2) % pcs.length];
    const semi = (pc < 7 ? pc : pc - 12) - 12; // low and close voicing
    o.frequency.setTargetAtTime(hz(semi) * (i % 2 ? 1.003 : 0.997), t, 0.6);
  });
}

function startPad() {
  const c = out();
  if (!c || pad || !settings().music) return;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 2.5);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 650;
  // Slow "breathing" of the filter.
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start();
  gain.connect(lp);
  lp.connect(master);
  lp.connect(verb);
  const oscs = Array.from({ length: 6 }, () => {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.connect(gain);
    o.start();
    return o;
  });
  pad = { gain, oscs, lfo };
  padChord(chord());
}

function stopPad(fade = 1.2) {
  if (!pad || !ctx) return;
  const { gain, oscs, lfo } = pad;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  [...oscs, lfo].forEach((o) => o.stop(t + fade + 0.1));
  pad = null;
}

// ---------------------------------------------------------------- game state

const COMBO_WINDOW = 1600; // ms between moves that keeps the run going
const MOVES_PER_CHORD = 6;
let combo = 0;
let lastMove = 0;
let moves = 0;
let wander = 0;
let lastTick = 0;
let quietUntil = 0; // undo/clear already made their own sound

function advanceChord() {
  chordIdx++;
  padChord(chord());
}

// Note `i` steps up the current chord, starting a bit below the middle of the range.
function chordNote(i) {
  const l = ladder(chord(), -2, 26);
  return l[Math.max(0, Math.min(l.length - 1, i))];
}

function throttled(ms) {
  const now = performance.now();
  if (now - lastTick < ms) return true;
  lastTick = now;
  return false;
}

export const sfx = {
  // Called when a game screen opens / closes.
  enterGame(gameId) {
    instrument = GAME_INSTRUMENT[gameId] ?? 'marimba';
    keyRoot = ROOTS[hash(todayKey()) % ROOTS.length];
    chordIdx = 0;
    combo = 0;
    moves = 0;
    startPad();
  },
  leaveGame() {
    stopPad();
  },
  // A board change. delta > 0: something placed, < 0: something removed, 0: changed in place.
  move(delta = 1) {
    if (performance.now() < quietUntil || throttled(45)) return;
    const now = performance.now();
    const quick = now - lastMove < COMBO_WINDOW;
    lastMove = now;
    if (delta < 0) {
      combo = Math.max(0, combo - 1);
      play(hz(chordNote(combo + 2)), { gain: 0.1, dark: true });
      return;
    }
    combo = quick ? combo + 1 : 0;
    if (++moves % MOVES_PER_CHORD === 0) advanceChord();
    const l = ladder(chord(), -2, 26);
    // A new run starts on a slightly different note each time, then climbs one chord tone per move;
    // at the top it spirals back down an octave and keeps climbing, marked by a bell.
    if (combo === 0) wander = (wander + 1 + Math.floor(Math.random() * 2)) % 3;
    const start = 2 + wander;
    const span = l.length - start;
    const idx = start + (combo % span);
    play(hz(l[idx]), { gain: 0.13 + Math.min(combo, 8) * 0.006 });
    if (combo > 0 && combo % span === 0) play(hz(l[l.length - 1] + 12), { when: 0.05, gain: 0.06, inst: 'bell' });
    // Every 8 moves in a row: a little bell on top.
    else if (combo > 0 && combo % 8 === 0) play(hz(l[idx] + 12), { when: 0.06, gain: 0.06, inst: 'bell' });
    // Variable reward: now and then a quiet sparkle.
    else if (Math.random() < 0.07) play(hz(l[Math.min(idx + 2, l.length - 1)] + 12), { when: 0.09, gain: 0.04, inst: 'bell' });
  },

  // Path games (Ruta): pitch follows progress through the board; the progression lands on its home
  // chord at the end. `n` cells drawn out of `total`.
  step(n, total = 36) {
    if (throttled(28)) return;
    const p = Math.min(1, n / total);
    const target = Math.min(PROGRESSION.length - 1, Math.floor(p * PROGRESSION.length));
    if (target !== chordIdx % PROGRESSION.length) {
      chordIdx = target;
      padChord(chord());
    }
    const l = ladder(PENTA.concat(chord()), -2, 28);
    // Little rising arpeggios whose starting note climbs with progress, so long paths never repeat a note.
    const idx = Math.min(l.length - 1, Math.floor(p * (l.length - 4)) + (n % 4));
    play(hz(l[idx]), { gain: 0.11 + p * 0.05, bright: 2200 + p * 3000 });
    if (p > 0.85) play(hz(l[idx] + 12), { when: 0.04, gain: 0.03, inst: 'bell' });
  },
  // Path shortened (moving back over the line).
  rewind(n, total = 36) {
    if (throttled(60)) return;
    const l = ladder(PENTA, -2, 28);
    play(hz(l[Math.round(Math.min(1, n / total) * (l.length - 1))]), { gain: 0.07, dark: true, dur: 0.25 });
  },

  ui() {
    play(hz([12, 14, 16][Math.floor(Math.random() * 3)]), { gain: 0.05, inst: 'wood', dur: 0.1, pan: 0 });
  },
  undo() {
    combo = 0;
    quietUntil = performance.now() + 200;
    play(hz(chordNote(4)), { gain: 0.07, dark: true, dur: 0.25 });
    play(hz(chordNote(2)), { when: 0.07, gain: 0.06, dark: true, dur: 0.3 });
  },
  error() {
    combo = 0;
    play(hz(-11), { gain: 0.11, inst: 'harp', dark: true, dur: 0.35, pan: 0 });
    play(hz(-12), { when: 0.11, gain: 0.1, inst: 'harp', dark: true, dur: 0.45, pan: 0 });
  },
  hint() {
    const l = ladder(chord(), 12, 36);
    l.slice(0, 5).forEach((s, i) => play(hz(s), { when: i * 0.05, gain: 0.05, inst: 'bell', pan: -0.4 + i * 0.2 }));
  },

  // `perfect`: no hints and no mistakes.
  solve({ perfect = false } = {}) {
    stopPad(2);
    const home = ladder(PROGRESSION[0], 0, 26);
    const cadences = [
      // rolled chord up
      () => home.slice(0, 6).forEach((s, i) => play(hz(s), { when: i * 0.08, gain: 0.13, force: true, dur: 1.6 })),
      // V → I
      () => {
        ladder(PROGRESSION[3], 2, 14).forEach((s, i) => play(hz(s), { when: i * 0.06, gain: 0.1, force: true, dur: 0.6 }));
        home.slice(1, 6).forEach((s, i) => play(hz(s), { when: 0.35 + i * 0.05, gain: 0.13, force: true, dur: 1.8 }));
      },
      // pentatonic run, then bloom
      () => {
        ladder(PENTA, 0, 14).forEach((s, i) => play(hz(s), { when: i * 0.05, gain: 0.08, force: true, dur: 0.4 }));
        home.slice(0, 5).forEach((s) => play(hz(s), { when: 0.45, gain: 0.11, force: true, dur: 1.9 }));
      },
    ];
    cadences[Math.floor(Math.random() * cadences.length)]();
    // Sparkle on top; a longer cascading one for perfect games.
    const top = ladder(PROGRESSION[0], 24, 40);
    (perfect ? [...top].reverse().concat(top) : top.slice(0, 2)).forEach((s, i) =>
      play(hz(s), { when: 0.6 + i * (perfect ? 0.07 : 0.12), gain: perfect ? 0.05 : 0.06, inst: 'bell', pan: Math.sin(i) * 0.5, force: true }),
    );
    chordIdx = 0;
  },
  // Fixed signature motif: today's puzzles are done and the streak goes on.
  streak() {
    [0, 7, 12, 16].forEach((s, i) => play(hz(s), { when: i * 0.14, gain: 0.1, inst: 'bell', force: true, dur: 1.8, pan: 0 }));
    play(hz(-12), { gain: 0.08, inst: 'harp', force: true, dur: 2.4, pan: 0 });
  },
  // Volume slider preview.
  preview() {
    [0, 4, 7, 14].forEach((s, i) => play(hz(s), { when: i * 0.07, gain: 0.12, force: true, dur: 1 }));
  },

  // Browsers only allow audio after a user gesture.
  unlock() {
    if (settings().sound) out();
  },
};
