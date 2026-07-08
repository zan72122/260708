// ============================================================
// occluders.js — 光を遮るもの: おつきさまボードとクッキー
// 皿の横の「おきば」に置いてあり、パンケーキの上へドラッグすると
// 日食みたいな影を落とす
// ============================================================

import { state, TAU, rand } from './state.js';
import { makeOccluder } from './light.js';

let craterSeed = [];

export function initOccluders() {
  state.occluders.length = 0;
  craterSeed = [];
  for (let i = 0; i < 7; i++) {
    craterSeed.push({ a: rand(TAU), d: Math.sqrt(Math.random()) * 0.7, r: rand(0.08, 0.2) });
  }
  placeAtHome();
}

// おきば (ホーム位置) — レイアウト変更時にも呼ぶ
export function placeAtHome(force = false) {
  const { cy, plateR } = state.layout;
  const { W } = state;
  const homes = {
    moonboard: { x: W * 0.14, y: cy + plateR * 0.55 },
    cookie: { x: W * 0.86, y: cy + plateR * 0.6 },
  };
  if (state.occluders.length === 0) {
    const mb = makeOccluder('moonboard', homes.moonboard.x, homes.moonboard.y);
    const ck = makeOccluder('cookie', homes.cookie.x, homes.cookie.y);
    mb.home = homes.moonboard;
    ck.home = homes.cookie;
    state.occluders.push(mb, ck);
  } else {
    for (const oc of state.occluders) {
      oc.home = homes[oc.kind];
      if (force && !oc.grabbed) { oc.x = oc.home.x; oc.y = oc.home.y; }
    }
  }
}

export function updateOccluders(dt) {
  for (const oc of state.occluders) {
    oc.wobble += dt;
    // つかんでいないときはゆっくり浮遊
    if (!oc.grabbed) {
      oc.y += Math.sin(oc.wobble * 1.4) * dt * 2.4;
    }
  }
}

export function drawOccluders(ctx) {
  for (const oc of state.occluders) {
    const bob = oc.grabbed ? 0 : Math.sin(oc.wobble * 1.4) * oc.r * 0.03;
    ctx.save();
    ctx.translate(oc.x, oc.y + bob);
    const lift = oc.grabbed ? 1.06 : 1;
    ctx.scale(lift, lift);
    if (oc.kind === 'moonboard') drawMoonboard(ctx, oc.r);
    else drawCookie(ctx, oc.r);
    ctx.restore();
  }
}

// おつきさまボード: クレーターのある丸い月の板 + 持ち手
function drawMoonboard(ctx, r) {
  // 持ち手
  ctx.fillStyle = '#b98a55';
  ctx.save();
  ctx.rotate(0.8);
  roundedRect(ctx, r * 0.85, -r * 0.09, r * 0.75, r * 0.18, r * 0.09);
  ctx.fill();
  ctx.restore();
  // 月の本体
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, '#fff9db');
  g.addColorStop(0.6, '#f3e3a8');
  g.addColorStop(1, '#d9c078');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  // クレーター
  for (const c of craterSeed) {
    const x = Math.cos(c.a) * c.d * r;
    const y = Math.sin(c.a) * c.d * r;
    const cr = c.r * r;
    ctx.fillStyle = 'rgba(190,160,90,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,220,0.5)';
    ctx.beginPath();
    ctx.arc(x - cr * 0.2, y - cr * 0.25, cr * 0.68, 0, TAU);
    ctx.fill();
  }
  // にこにこ顔
  ctx.fillStyle = '#8a6f35';
  ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.08, r * 0.05, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.08, r * 0.05, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8a6f35';
  ctx.lineWidth = r * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.08, r * 0.16, 0.25, Math.PI - 0.25);
  ctx.stroke();
  // ふちどり
  ctx.strokeStyle = 'rgba(160,130,60,0.6)';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, 0, TAU);
  ctx.stroke();
}

// まるいクッキー: チョコチップ入り
function drawCookie(ctx, r) {
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, '#e8b878');
  g.addColorStop(0.7, '#c98f4e');
  g.addColorStop(1, '#a86f36');
  ctx.fillStyle = g;
  // でこぼこの縁
  ctx.beginPath();
  for (let i = 0; i <= 26; i++) {
    const a = (i / 26) * TAU;
    const rr = r * (1 + Math.sin(a * 9) * 0.03);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // チョコチップ
  const chips = [[-0.4, -0.25], [0.3, -0.42], [0.45, 0.2], [-0.15, 0.4], [-0.5, 0.25], [0.05, -0.05]];
  for (const [cx, cy] of chips) {
    ctx.fillStyle = '#5a3620';
    ctx.beginPath();
    ctx.ellipse(cx * r, cy * r, r * 0.13, r * 0.11, cx * 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,180,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx * r - r * 0.03, cy * r - r * 0.03, r * 0.05, r * 0.04, cx * 2, 0, TAU);
    ctx.fill();
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
