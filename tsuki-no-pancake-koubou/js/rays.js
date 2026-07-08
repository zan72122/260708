// ============================================================
// rays.js — 「ひかり」を目に見えるものにする演出:
//  1. ランプからの光の円錐 (ゴッドレイ)
//  2. 光の中を舞うチリ (きらきらのほこり)
//  3. 遮蔽物の下にできる「影の柱」 — どこが影になるか一目でわかる
// ============================================================

import { state, TAU, rand, clamp, smoothstep, dist } from './state.js';
import { shadowCenter } from './light.js';

let motes = [];

export function initRays() {
  motes = [];
  for (let i = 0; i < 26; i++) {
    motes.push({
      t: Math.random(),      // 円錐の中の横位置 0..1
      p: Math.random(),      // 上下位置 0..1 (0=ランプ 1=皿)
      speed: rand(0.03, 0.09),
      size: rand(1.2, 3),
      tw: rand(1.2, 3.2),
      ph: rand(TAU),
    });
  }
}

export function updateRays(dt) {
  for (const m of motes) {
    m.p += m.speed * dt;
    if (m.p > 1) {
      m.p = 0;
      m.t = Math.random();
    }
  }
}

// 円錐のジオメトリ (ランプ → 皿の幅)
function coneGeom() {
  const { lampX, lampY, cx, cy, plateR, R } = state.layout;
  return {
    sx: lampX, sy: lampY + R * 0.12,
    x1: cx - plateR * 1.02, x2: cx + plateR * 1.02,
    ty: cy,
  };
}

// 皿の後ろに描く光の円錐 (ゴッドレイ)
export function drawLightCone(ctx) {
  const g = coneGeom();
  const dim = (1 - state.eclipse * 0.7) * (1 + 0.04 * Math.sin(state.time * 6.3));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // 外側の広い円錐
  const grad = ctx.createLinearGradient(0, g.sy, 0, g.ty);
  grad.addColorStop(0, `rgba(255,240,190,${0.34 * dim})`);
  grad.addColorStop(0.7, `rgba(255,236,180,${0.16 * dim})`);
  grad.addColorStop(1, 'rgba(255,232,170,0.03)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(g.sx, g.sy);
  ctx.lineTo(g.x2, g.ty);
  ctx.lineTo(g.x1, g.ty);
  ctx.closePath();
  ctx.fill();
  // 内側の明るい芯
  const core = ctx.createLinearGradient(0, g.sy, 0, g.ty);
  core.addColorStop(0, `rgba(255,250,220,${0.30 * dim})`);
  core.addColorStop(1, 'rgba(255,245,200,0.02)');
  ctx.fillStyle = core;
  const cw = (g.x2 - g.x1) * 0.28;
  ctx.beginPath();
  ctx.moveTo(g.sx, g.sy);
  ctx.lineTo(g.sx + cw, g.ty);
  ctx.lineTo(g.sx - cw, g.ty);
  ctx.closePath();
  ctx.fill();
  // 舞うチリ
  for (const m of motes) {
    const x = g.sx + (g.x1 + (g.x2 - g.x1) * m.t - g.sx) * m.p;
    const y = g.sy + (g.ty - g.sy) * m.p;
    const a = (0.24 + 0.5 * Math.abs(Math.sin(state.time * m.tw + m.ph))) * dim * m.p;
    ctx.fillStyle = `rgba(255,250,225,${clamp(a, 0, 1)})`;
    ctx.beginPath();
    ctx.arc(x, y, m.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// 遮蔽物の下の「影の柱」— 光が遮られていることを見せる
export function drawShadowShafts(ctx) {
  const { cx, cy, plateR } = state.layout;
  ctx.save();
  for (const oc of state.occluders) {
    const s = shadowCenter(oc);
    // 皿から遠い (おきばにある) ときは描かない
    const near = 1 - smoothstep(plateR * 0.95, plateR * 1.45, dist(s.x, s.y, cx, cy));
    if (near <= 0.02) continue;
    const topY = oc.y + (oc.grabbed ? 0 : 0);
    const botY = Math.max(s.y, topY + 4);
    const grad = ctx.createLinearGradient(0, topY, 0, botY + oc.r * 0.4);
    grad.addColorStop(0, `rgba(34,26,78,${0.42 * near})`);
    grad.addColorStop(1, `rgba(34,26,78,${0.16 * near})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(oc.x - oc.r * 0.96, topY);
    ctx.lineTo(oc.x + oc.r * 0.96, topY);
    ctx.lineTo(s.x + oc.r * 0.99, botY);
    ctx.lineTo(s.x - oc.r * 0.99, botY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
