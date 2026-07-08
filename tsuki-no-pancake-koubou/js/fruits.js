// ============================================================
// fruits.js — いちご・ブルーベリー・バナナ: パンケーキに乗せると
// 一緒にくるくる回り、小さな影を落とす
// ============================================================

import {
  state, CONST, TAU, rand, localToWorld, emit,
} from './state.js';
import { spawnSparkle } from './particles.js';

const FRUIT_DEFS = {
  strawberry: { shadowR: 0.075, baseR: 0.085 },
  blueberry: { shadowR: 0.045, baseR: 0.05 },
  banana: { shadowR: 0.07, baseR: 0.09 },
};

export function addFruit(kind, lx, ly) {
  if (state.fruits.length >= CONST.FRUIT_MAX) state.fruits.shift();
  const def = FRUIT_DEFS[kind];
  const f = {
    kind, lx, ly,
    rot: rand(TAU),
    shadowR: def.shadowR,
    baseR: def.baseR,
    world: null,
    drop: 0.5,     // ぽとんと落ちる演出
    squash: 0,     // 着地のぷにっ
    grabbed: false,
  };
  state.fruits.push(f);
  state.counters.fruitsPlaced++;
  emit('fruitPlaced', f);
  return f;
}

export function updateFruits(dt) {
  for (let i = state.fruits.length - 1; i >= 0; i--) {
    const f = state.fruits[i];
    if (f.drop > 0) {
      f.drop -= dt * 2.2;
      if (f.drop <= 0) {
        f.drop = 0;
        f.squash = 1;
        const w = localToWorld(f.lx, f.ly);
        spawnSparkle(w.x, w.y, 5, '#ffd7e8');
        emit('fruitLanded', f);
      }
    }
    if (f.squash > 0) f.squash = Math.max(0, f.squash - dt * 4);
    f.world = localToWorld(f.lx, f.ly);
    // パンケーキの外へドラッグされたらポフッと消える
    if (!f.grabbed && Math.hypot(f.lx, f.ly) > 1.25) {
      spawnSparkle(f.world.x, f.world.y, 10, '#ffffff');
      state.fruits.splice(i, 1);
    }
  }
}

export function drawFruits(ctx) {
  const { R } = state.layout;
  for (const f of state.fruits) {
    const w = f.world || localToWorld(f.lx, f.ly);
    const lift = f.drop * R * 0.7;
    const sq = 1 + f.squash * 0.25;
    ctx.save();
    ctx.translate(w.x, w.y - lift);
    ctx.rotate(state.rot + f.rot);
    ctx.scale(sq, 1 / sq);
    const s = R * f.baseR;
    if (f.kind === 'strawberry') drawStrawberry(ctx, s);
    else if (f.kind === 'blueberry') drawBlueberry(ctx, s);
    else drawBanana(ctx, s);
    ctx.restore();
  }
}

function drawStrawberry(ctx, s) {
  // 実 (ハート形に近いしずく)
  const g = ctx.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s * 1.1);
  g.addColorStop(0, '#ff7d8e');
  g.addColorStop(0.55, '#f43b52');
  g.addColorStop(1, '#c81f36');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.bezierCurveTo(-s * 1.05, s * 0.35, -s * 0.85, -s * 0.75, 0, -s * 0.65);
  ctx.bezierCurveTo(s * 0.85, -s * 0.75, s * 1.05, s * 0.35, 0, s);
  ctx.fill();
  // つぶつぶ
  ctx.fillStyle = 'rgba(255,238,170,0.9)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const rr = s * (0.35 + (i % 3) * 0.14);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * rr * 0.7, Math.sin(a) * rr * 0.6, s * 0.055, s * 0.085, a, 0, TAU);
    ctx.fill();
  }
  // へた
  ctx.fillStyle = '#3fae52';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * s * 0.28, -s * 0.62 + Math.sin(a) * s * 0.12, s * 0.22, s * 0.09, a * 0.5, 0, TAU);
    ctx.fill();
  }
  // つや
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.32, -s * 0.2, s * 0.2, s * 0.12, -0.6, 0, TAU);
  ctx.fill();
}

function drawBlueberry(ctx, s) {
  const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s);
  g.addColorStop(0, '#8fa8e8');
  g.addColorStop(0.6, '#4a5fc0');
  g.addColorStop(1, '#2d3a8c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  ctx.fill();
  // おへそ (がく)
  ctx.strokeStyle = 'rgba(20,25,70,0.8)';
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * s * 0.25, Math.sin(a) * s * 0.25);
  }
  ctx.stroke();
  // ブルーム (白い粉)
  ctx.fillStyle = 'rgba(220,230,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.3, -s * 0.32, s * 0.26, s * 0.15, -0.6, 0, TAU);
  ctx.fill();
}

function drawBanana(ctx, s) {
  // 輪切りバナナ
  const g = ctx.createRadialGradient(-s * 0.2, -s * 0.2, s * 0.1, 0, 0, s);
  g.addColorStop(0, '#fff6cf');
  g.addColorStop(0.8, '#f7e39a');
  g.addColorStop(1, '#e8c96a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#d9b855';
  ctx.lineWidth = s * 0.1;
  ctx.stroke();
  // 中心の種模様
  ctx.fillStyle = 'rgba(190,160,80,0.7)';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.22, s * 0.1, s * 0.05, a, 0, TAU);
    ctx.fill();
  }
}
