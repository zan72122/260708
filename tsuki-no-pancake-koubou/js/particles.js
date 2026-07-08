// ============================================================
// particles.js — きらきら・じゅわじゅわ・粉けむり・紙ふぶき
// すべての「気持ちいい」演出粒子を一括管理
// ============================================================

import { TAU, rand, randPick, state } from './state.js';

const MAX = 900;
let particles = [];

function push(p) {
  if (particles.length >= MAX) particles.shift();
  particles.push(p);
}

// きらきら星
export function spawnSparkle(x, y, n = 6, color = '#fff3b0') {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), sp = rand(12, 70);
    push({
      kind: 'sparkle', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
      life: rand(0.5, 1.1), t: 0,
      size: rand(2.5, 6), color, spin: rand(TAU),
    });
  }
}

// バターのじゅわじゅわ泡
export function spawnSizzle(x, y, r) {
  push({
    kind: 'sizzle',
    x: x + rand(-r, r), y: y + rand(-r, r),
    vx: rand(-6, 6), vy: rand(-34, -16),
    life: rand(0.35, 0.7), t: 0,
    size: rand(1.5, 3.5),
  });
}

// 粉砂糖の舞うけむり
export function spawnSugarDust(x, y, r) {
  for (let i = 0; i < 7; i++) {
    push({
      kind: 'dust',
      x: x + rand(-r, r), y: y + rand(-r, r),
      vx: rand(-14, 14), vy: rand(-8, 22),
      life: rand(0.5, 1), t: 0,
      size: rand(2, 5.5),
    });
  }
}

// チョコが固まる「カチッ」の光
export function spawnCrackle(x, y) {
  for (let i = 0; i < 4; i++) {
    const a = rand(TAU);
    push({
      kind: 'crackle', x, y,
      vx: Math.cos(a) * 26, vy: Math.sin(a) * 26,
      life: 0.45, t: 0, size: rand(2, 4),
    });
  }
}

// おいわいの紙ふぶき
export function spawnConfetti(x, y, n = 26) {
  const colors = ['#ff8fab', '#ffd166', '#8fd3ff', '#b8f2a8', '#e6b8ff'];
  for (let i = 0; i < n; i++) {
    const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
    const sp = rand(90, 260);
    push({
      kind: 'confetti', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(1.2, 2.2), t: 0,
      size: rand(4, 8), color: randPick(colors),
      spin: rand(TAU), spinV: rand(-8, 8),
    });
  }
}

// ハート (なでたときなど)
export function spawnHeart(x, y) {
  push({
    kind: 'heart', x, y,
    vx: rand(-12, 12), vy: rand(-46, -26),
    life: rand(0.8, 1.3), t: 0, size: rand(6, 11),
  });
}

// 境界通過の「いま変わった!」リング
export function spawnRing(x, y, color = '#ffcf70', size = 14) {
  push({
    kind: 'ring', x, y, vx: 0, vy: 0,
    life: 0.55, t: 0, size, color,
  });
}

// チョコが割れたかけら (回転しながら飛ぶ)
export function spawnShards(x, y, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), sp = rand(60, 190);
    push({
      kind: 'shard', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: rand(0.6, 1.1), t: 0,
      size: rand(4, 9), spin: rand(TAU), spinV: rand(-12, 12),
    });
  }
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), sp = rand(30, 110);
    push({
      kind: 'crumb', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
      life: rand(0.4, 0.8), t: 0, size: rand(1.5, 3),
    });
  }
}

// 固まる時の氷のような結晶 (ひかげの青いきらめき)
export function spawnCrystal(x, y) {
  push({
    kind: 'crystal', x, y,
    vx: rand(-8, 8), vy: rand(-26, -10),
    life: rand(0.6, 1.1), t: 0,
    size: rand(2.5, 5), spin: rand(TAU),
  });
}

// バターの湯気 (溶けている間もくもく)
export function spawnSteamPuff(x, y) {
  push({
    kind: 'steam', x, y,
    vx: rand(-8, 8), vy: rand(-42, -26),
    life: rand(0.7, 1.3), t: 0, size: rand(4, 9),
  });
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'confetti') {
      p.vy += 300 * dt;
      p.vx *= Math.pow(0.6, dt);
      p.spin += p.spinV * dt;
    } else if (p.kind === 'sparkle') {
      p.vy += 40 * dt;
    } else if (p.kind === 'dust') {
      p.vy += 26 * dt;
      p.vx *= Math.pow(0.4, dt);
    } else if (p.kind === 'shard') {
      p.vy += 380 * dt;
      p.spin += p.spinV * dt;
    } else if (p.kind === 'crumb') {
      p.vy += 260 * dt;
    } else if (p.kind === 'steam') {
      p.vx += Math.sin(p.t * 6 + p.size) * 18 * dt;
    }
  }
}

export function drawParticles(ctx) {
  ctx.save();
  for (const p of particles) {
    const k = 1 - p.t / p.life;
    if (p.kind === 'sparkle') {
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin + p.t * 3);
      star4(ctx, p.size * (0.5 + k * 0.5));
      ctx.restore();
    } else if (p.kind === 'sizzle') {
      ctx.globalAlpha = k * 0.85;
      ctx.strokeStyle = '#fff8dc';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + p.t * 2.4), 0, TAU);
      ctx.stroke();
    } else if (p.kind === 'dust') {
      ctx.globalAlpha = k * 0.75;
      ctx.fillStyle = '#fffdf6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'crackle') {
      ctx.globalAlpha = k;
      ctx.strokeStyle = '#d9c2ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x - p.size, p.y);
      ctx.lineTo(p.x + p.size, p.y);
      ctx.moveTo(p.x, p.y - p.size);
      ctx.lineTo(p.x, p.y + p.size);
      ctx.stroke();
    } else if (p.kind === 'confetti') {
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else if (p.kind === 'heart') {
      ctx.globalAlpha = k;
      ctx.fillStyle = '#ff8fb0';
      heart(ctx, p.x, p.y, p.size);
    } else if (p.kind === 'ring') {
      ctx.globalAlpha = k * 0.9;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3.5 * k + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + p.t / p.life * 3.2), 0, TAU);
      ctx.stroke();
    } else if (p.kind === 'shard') {
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = '#4a2716';
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.fillStyle = 'rgba(255,225,200,0.5)';
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.2);
      ctx.restore();
    } else if (p.kind === 'crumb') {
      ctx.globalAlpha = k;
      ctx.fillStyle = '#5a3620';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'crystal') {
      const tw = 0.5 + 0.5 * Math.abs(Math.sin(p.t * 12 + p.spin));
      ctx.globalAlpha = k * tw;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin + p.t * 2);
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    } else if (p.kind === 'steam') {
      ctx.globalAlpha = Math.sin((p.t / p.life) * Math.PI) * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + p.t * 1.8), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function star4(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(0, 0, s, 0);
  ctx.quadraticCurveTo(0, 0, 0, s);
  ctx.quadraticCurveTo(0, 0, -s, 0);
  ctx.quadraticCurveTo(0, 0, 0, -s);
  ctx.fill();
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x - s, y - s * 0.5, x - s * 0.4, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.4, y - s * 1.1, x + s, y - s * 0.5, x, y + s * 0.3);
  ctx.fill();
}

export function clearParticles() {
  particles = [];
}
