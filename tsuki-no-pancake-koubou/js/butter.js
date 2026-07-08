// ============================================================
// butter.js — バター: 光が当たるとじゅわっと溶けて金色の池になる
// ============================================================

import { state, CONST, TAU, clamp, rand, localToWorld, emit } from './state.js';
import { lightAt } from './light.js';
import { spawnSizzle, spawnSparkle } from './particles.js';

// lx,ly: パンケーキローカル座標 (半径1単位)
export function addButter(lx, ly) {
  if (state.butters.length >= CONST.BUTTER_MAX) state.butters.shift();
  const b = {
    lx, ly,
    melt: 0,          // 0=四角いまま 1=完全に溶けた
    puddle: 0,        // 池の広がり
    wobble: rand(TAU),
    rot: rand(-0.4, 0.4),
    meltedCounted: false,
    drop: 0.35,       // 上から落ちてくる演出
  };
  state.butters.push(b);
  emit('butterPlaced', b);
  return b;
}

export function updateButters(dt) {
  let sizzle = 0;
  for (const b of state.butters) {
    if (b.drop > 0) b.drop = Math.max(0, b.drop - dt * 1.4);
    const w = localToWorld(b.lx, b.ly);
    const light = lightAt(w.x, w.y);
    if (light > CONST.SHADOW_LIT_THRESHOLD && b.melt < 1) {
      // ひなた: じゅわっと溶ける
      const speed = (light - CONST.SHADOW_LIT_THRESHOLD) * 0.5;
      b.melt = clamp(b.melt + dt * speed, 0, 1);
      sizzle += speed * (1 - b.melt * 0.6);
      if (Math.random() < dt * 8 * speed) {
        spawnSizzle(w.x, w.y, state.layout.R * 0.04);
      }
      if (b.melt >= 1 && !b.meltedCounted) {
        b.meltedCounted = true;
        state.counters.butterMelted++;
        spawnSparkle(w.x, w.y, 8, '#ffe9a0');
        emit('butterMelted', b);
      }
    }
    // 池は溶け具合を追いかけて広がる
    b.puddle += (b.melt - b.puddle) * clamp(dt * 1.5, 0, 1);
  }
  state.sizzleLevel = clamp(sizzle, 0, 1);
}

export function drawButters(ctx) {
  const { R } = state.layout;
  ctx.save();
  // --- 溶けた池 (下層) ---
  for (const b of state.butters) {
    if (b.puddle <= 0.02) continue;
    const w = localToWorld(b.lx, b.ly);
    const pr = R * (0.05 + b.puddle * 0.16);
    const wob = 1 + Math.sin(state.time * 2 + b.wobble) * 0.04;
    const g = ctx.createRadialGradient(w.x, w.y, pr * 0.1, w.x, w.y, pr * wob);
    g.addColorStop(0, `rgba(255,232,140,${0.85 * b.puddle})`);
    g.addColorStop(0.7, `rgba(250,206,88,${0.7 * b.puddle})`);
    g.addColorStop(1, 'rgba(246,190,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(w.x, w.y, pr * wob, pr * 0.92, b.wobble, 0, TAU);
    ctx.fill();
    // てらてらハイライト
    ctx.fillStyle = `rgba(255,255,235,${0.35 * b.puddle})`;
    ctx.beginPath();
    ctx.ellipse(w.x - pr * 0.3, w.y - pr * 0.3, pr * 0.28, pr * 0.14, -0.5, 0, TAU);
    ctx.fill();
  }
  // --- 四角いバター本体 (上層) ---
  for (const b of state.butters) {
    if (b.melt >= 0.98) continue;
    const w = localToWorld(b.lx, b.ly);
    const size = R * 0.11 * (1 - b.melt * 0.75);
    const h = size * (1 - b.melt * 0.5);
    const lift = b.drop * R * 0.6;
    ctx.save();
    ctx.translate(w.x, w.y - lift);
    ctx.rotate(state.rot + b.rot);
    const soft = b.melt * size * 0.4; // 溶けかけの角丸
    // 側面 (立体感)
    ctx.fillStyle = '#e8b93e';
    roundRect(ctx, -size, -h * 0.5 + size * 0.22, size * 2, h, soft + size * 0.15);
    ctx.fill();
    // 上面
    const top = ctx.createLinearGradient(-size, -h, size, h * 0.4);
    top.addColorStop(0, '#fff3b8');
    top.addColorStop(1, '#f7d868');
    ctx.fillStyle = top;
    roundRect(ctx, -size, -h * 0.62, size * 2, h, soft + size * 0.15);
    ctx.fill();
    // 光沢
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(ctx, -size * 0.6, -h * 0.5, size * 0.7, h * 0.24, size * 0.1);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
