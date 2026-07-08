// ============================================================
// pancake.js — 回転皿とパンケーキ本体の描画・回転制御
// パンケーキの焼き目テクスチャはオフスクリーンに事前生成する
// ============================================================

import { state, CONST, TAU, rand, clamp } from './state.js';

let tex = null;      // パンケーキテクスチャ
let texSize = 0;
let plateTex = null; // お皿テクスチャ
let steams = [];

export function rebuildPancakeTexture() {
  const R = state.layout.R;
  texSize = Math.ceil(R * 2 * state.dpr);
  tex = makePancakeTex(texSize);
  plateTex = makePlateTex(Math.ceil(state.layout.plateR * 2 * state.dpr));
}

// ---- 焼き目テクスチャ生成 ----
function makePancakeTex(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  // ベース: ふんわりきつね色
  const base = g.createRadialGradient(r - r * 0.25, r - r * 0.3, r * 0.2, r, r, r);
  base.addColorStop(0, '#f7cf8a');
  base.addColorStop(0.55, '#eeb968');
  base.addColorStop(0.86, '#d9964a');
  base.addColorStop(1, '#b97435');
  g.fillStyle = base;
  g.beginPath(); g.arc(r, r, r, 0, TAU); g.fill();
  g.save();
  g.beginPath(); g.arc(r, r, r, 0, TAU); g.clip();
  // 焼きムラ (大きなまだら)
  for (let i = 0; i < 26; i++) {
    const a = rand(TAU), d = Math.sqrt(Math.random()) * r * 0.82;
    const x = r + Math.cos(a) * d, y = r + Math.sin(a) * d;
    const rr = rand(r * 0.06, r * 0.2);
    const blot = g.createRadialGradient(x, y, 0, x, y, rr);
    const tone = Math.random() < 0.5 ? '199,132,62' : '236,190,120';
    blot.addColorStop(0, `rgba(${tone},${rand(0.12, 0.3)})`);
    blot.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = blot;
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  // 気泡の穴
  for (let i = 0; i < 60; i++) {
    const a = rand(TAU), d = Math.sqrt(Math.random()) * r * 0.88;
    const x = r + Math.cos(a) * d, y = r + Math.sin(a) * d;
    const rr = rand(1, size * 0.008);
    g.fillStyle = `rgba(150,90,40,${rand(0.15, 0.4)})`;
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,230,180,0.25)';
    g.beginPath(); g.arc(x - rr * 0.4, y - rr * 0.4, rr * 0.5, 0, TAU); g.fill();
  }
  // 縁の濃い焼き色リング
  g.strokeStyle = 'rgba(150,85,35,0.55)';
  g.lineWidth = size * 0.025;
  g.beginPath(); g.arc(r, r, r * 0.965, 0, TAU); g.stroke();
  g.restore();
  return c;
}

// ---- お皿テクスチャ ----
function makePlateTex(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const base = g.createRadialGradient(r - r * 0.2, r - r * 0.25, r * 0.2, r, r, r);
  base.addColorStop(0, '#fdfaff');
  base.addColorStop(0.72, '#e9e2f6');
  base.addColorStop(0.92, '#cfc4ea');
  base.addColorStop(1, '#a99ad0');
  g.fillStyle = base;
  g.beginPath(); g.arc(r, r, r, 0, TAU); g.fill();
  // 縁の星と月の模様 (回っているのが分かる)
  g.save();
  g.translate(r, r);
  for (let i = 0; i < 12; i++) {
    g.save();
    g.rotate((i / 12) * TAU);
    g.translate(0, -r * 0.9);
    g.fillStyle = i % 3 === 0 ? '#f5c76a' : '#b9a8e6';
    if (i % 3 === 0) drawStar(g, 0, 0, r * 0.05);
    else {
      g.beginPath(); g.arc(0, 0, r * 0.035, 0, TAU); g.fill();
    }
    g.restore();
  }
  g.restore();
  // 内側のリム
  g.strokeStyle = 'rgba(150,130,200,0.5)';
  g.lineWidth = size * 0.01;
  g.beginPath(); g.arc(r, r, r * 0.8, 0, TAU); g.stroke();
  return c;
}

function drawStar(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// ---- 回転更新 ----
export function updatePancake(dt) {
  const grabbedSpin = state.pointers.size > 0 && state._spinGrab;
  if (!grabbedSpin) {
    if (state.spinning) {
      // 自動回転へなめらかに近づける
      state.spinVel += (CONST.SPIN_BASE - state.spinVel) * clamp(dt * 1.2, 0, 1);
    } else {
      state.spinVel *= Math.pow(CONST.SPIN_FRICTION, dt * 60);
      if (Math.abs(state.spinVel) < 0.002) state.spinVel = 0;
    }
  }
  state.rot += state.spinVel * dt;
  state.totalSpin += Math.abs(state.spinVel * dt);

  // 湯気
  if (Math.random() < dt * 2.2 && steams.length < 8) {
    const a = rand(TAU), d = Math.sqrt(Math.random()) * 0.7;
    steams.push({
      lx: Math.cos(a) * d, ly: Math.sin(a) * d,
      t: 0, dur: rand(2.2, 3.4), drift: rand(-0.2, 0.2), size: rand(0.05, 0.1),
    });
  }
  for (let i = steams.length - 1; i >= 0; i--) {
    steams[i].t += dt;
    if (steams[i].t > steams[i].dur) steams.splice(i, 1);
  }
}

// ---- 描画 ----
export function drawPlate(ctx) {
  const { cx, cy, plateR } = state.layout;
  // 皿の落ち影
  ctx.save();
  ctx.fillStyle = 'rgba(20,12,40,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx + plateR * 0.03, cy + plateR * 0.07, plateR * 1.02, plateR * 0.99, 0, 0, TAU);
  ctx.fill();
  // 皿本体 (回転)
  ctx.translate(cx, cy);
  ctx.rotate(state.rot);
  ctx.drawImage(plateTex, -plateR, -plateR, plateR * 2, plateR * 2);
  ctx.restore();
  // ターンテーブルの軸の見た目
  ctx.save();
  ctx.fillStyle = 'rgba(90,70,140,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + plateR * 1.02, plateR * 0.3, plateR * 0.05, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawPancakeBase(ctx) {
  const { cx, cy, R } = state.layout;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.rot);
  ctx.drawImage(tex, -R, -R, R * 2, R * 2);
  ctx.restore();
  // ふちのリムライト
  ctx.save();
  ctx.strokeStyle = 'rgba(255,240,200,0.35)';
  ctx.lineWidth = Math.max(2, R * 0.015);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.985, Math.PI * 0.9, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
}

export function drawSteam(ctx) {
  const { cx, cy, R } = state.layout;
  ctx.save();
  for (const s of steams) {
    const p = s.t / s.dur;
    const c = Math.cos(state.rot), sn = Math.sin(state.rot);
    const wx = cx + R * (s.lx * c - s.ly * sn);
    const wy = cy + R * (s.lx * sn + s.ly * c) - p * R * 0.5;
    const a = Math.sin(p * Math.PI) * 0.18;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(wx + Math.sin(p * 5 + s.drift * 20) * R * 0.04, wy, R * s.size * (0.6 + p), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
