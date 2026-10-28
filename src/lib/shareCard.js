// Result card image for sharing (1080×1350, the portrait size social apps show best):
// washi paper, the game's hanko, the time, the day's ensō and the streak.
import { formatTime } from './dates.js';

const W = 1080;
const H = 1350;
const C = { paper: '#f3eee4', card: '#fbf8f1', ink: '#2a2622', ink2: '#6f6559', line: '#e2d9c9', shu: '#cf4b2f' };

function fiber(ctx) {
  // Light paper grain so the card doesn't look flat.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(110, 90, 60, ${Math.random() * 0.05})`;
    const len = 2 + Math.random() * 10;
    ctx.save();
    ctx.translate(Math.random() * W, Math.random() * H);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillRect(0, 0, len, 1);
    ctx.restore();
  }
}

function seal(target, kanji, x, y, size) {
  // Drawn on its own layer so the "missing ink" specks only affect the seal, not the paper.
  const layer = document.createElement('canvas');
  layer.width = layer.height = size * 1.2;
  const ctx = layer.getContext('2d');
  ctx.translate(layer.width / 2, layer.height / 2);
  ctx.rotate(-0.09);
  ctx.strokeStyle = C.shu;
  ctx.fillStyle = C.shu;
  ctx.lineWidth = size * 0.07;
  const h = size / 2 - ctx.lineWidth;
  ctx.beginPath();
  ctx.roundRect(-h, -h, h * 2, h * 2, size * 0.14);
  ctx.stroke();
  ctx.font = `700 ${size * 0.58}px 'Shippori Mincho', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kanji, 0, size * 0.03);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i++) {
    ctx.beginPath();
    ctx.arc((Math.random() - 0.5) * size, (Math.random() - 0.5) * size, Math.random() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  target.drawImage(layer, x - layer.width / 2, y - layer.height / 2);
}

function enso(ctx, x, y, r, value, total = 4) {
  const seg = (Math.PI * 2) / total;
  const gap = 0.22;
  for (let i = 0; i < total; i++) {
    const a0 = -Math.PI / 2 + 0.12 + i * seg + gap / 2;
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a0 + seg - gap);
    ctx.strokeStyle = i < value ? C.shu : C.line;
    ctx.lineWidth = i < value ? 16 - (i % 2) * 2 : 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export async function renderResultCard({ game, modeLabel, subtitle, result, streak = 0, dayDone = null }) {
  const fonts = [`700 80px 'Shippori Mincho'`, `400 40px 'Zen Maru Gothic'`, `700 40px 'Zen Maru Gothic'`];
  await Promise.all(fonts.map((f) => document.fonts?.load(f, `${game.kanji}Hitoiki一息0123456789:`).catch(() => {})));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const perfect = !result.hints && !result.mistakes;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  const wash = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 900);
  wash.addColorStop(0, game.bg);
  wash.addColorStop(1, 'rgba(243,238,228,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  fiber(ctx);

  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink;
  ctx.font = `700 46px 'Shippori Mincho', serif`;
  ctx.fillText('Hitoiki', 80, 120);
  ctx.fillStyle = C.shu;
  ctx.font = `700 30px 'Shippori Mincho', serif`;
  ctx.fillText('一息', 255, 120);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink2;
  ctx.font = `400 32px 'Zen Maru Gothic', sans-serif`;
  ctx.fillText(subtitle, W - 80, 118);

  seal(ctx, game.kanji, W / 2, 400, 280);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.font = `700 86px 'Shippori Mincho', serif`;
  ctx.fillText(game.name, W / 2, 660);
  ctx.fillStyle = C.ink2;
  ctx.font = `400 36px 'Zen Maru Gothic', sans-serif`;
  ctx.fillText(modeLabel, W / 2, 718);

  ctx.fillStyle = C.ink;
  ctx.font = `700 150px 'Shippori Mincho', serif`;
  ctx.fillText(formatTime(result.time), W / 2, 890);
  if (perfect) {
    ctx.fillStyle = C.shu;
    ctx.font = `700 36px 'Zen Maru Gothic', sans-serif`;
    ctx.fillText('✦ Perfecto: sin pistas ni errores', W / 2, 960);
  }

  // Footer card: day progress and streak.
  ctx.fillStyle = C.card;
  ctx.beginPath();
  ctx.roundRect(80, 1040, W - 160, 200, 40);
  ctx.fill();
  if (dayDone !== null) enso(ctx, 200, 1140, 58, dayDone);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink;
  ctx.font = `700 46px 'Shippori Mincho', serif`;
  const x = dayDone !== null ? 300 : 130;
  ctx.fillText(dayDone !== null ? (dayDone >= 4 ? 'Día sellado' : `${dayDone} de 4 hoy`) : 'Un respiro más', x, 1125);
  ctx.fillStyle = C.ink2;
  ctx.font = `400 34px 'Zen Maru Gothic', sans-serif`;
  ctx.fillText(streak > 0 ? `Racha de ${streak} ${streak === 1 ? 'día' : 'días'} 🔥` : 'Puzzles de lógica para un respiro', x, 1180);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink2;
  ctx.font = `400 28px 'Zen Maru Gothic', sans-serif`;
  ctx.fillText('Hitoiki · un respiro para la mente', W / 2, 1300);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
