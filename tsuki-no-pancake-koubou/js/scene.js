// ============================================================
// scene.js — 背景: 月面の工房、星空、地球、ランプ、テーブル
// ============================================================

import { state, TAU, rand, clamp } from './state.js';

let stars = [];
let shootingStar = null;
let shootTimer = 4;

export function initScene() {
  stars = [];
  const n = 90;
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random() * 0.72,
      r: rand(0.6, 2.1),
      tw: rand(0.5, 2.4),
      ph: rand(TAU),
      hue: Math.random() < 0.85 ? 0 : rand(180, 320),
    });
  }
}

export function updateScene(dt) {
  shootTimer -= dt;
  if (shootTimer <= 0 && !shootingStar) {
    shootingStar = {
      x: rand(0.15, 0.85), y: rand(0.04, 0.3),
      vx: rand(-0.25, -0.12), vy: rand(0.05, 0.1),
      life: 1.2,
    };
    shootTimer = rand(7, 16);
  }
  if (shootingStar) {
    shootingStar.x += shootingStar.vx * dt;
    shootingStar.y += shootingStar.vy * dt;
    shootingStar.life -= dt;
    if (shootingStar.life <= 0) shootingStar = null;
  }
}

export function drawScene(ctx) {
  const { W, H } = state;
  const darken = state.eclipse * 0.5;

  // 夜空グラデーション (日食中はさらに深い色に)
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, mix('#0b1035', '#05061c', darken));
  sky.addColorStop(0.55, mix('#1b2158', '#0a0d33', darken));
  sky.addColorStop(1, mix('#3a2f6b', '#1d1745', darken));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawStars(ctx);
  drawEarth(ctx);
  drawMoonHills(ctx);
  drawTable(ctx);
}

function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

function drawStars(ctx) {
  const { W, H } = state;
  const boost = 1 + state.eclipse * 0.9; // 日食で星が輝く
  for (const s of stars) {
    const a = (0.35 + 0.65 * Math.abs(Math.sin(state.time * s.tw + s.ph))) * boost;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = s.hue ? `hsl(${s.hue},80%,80%)` : '#fff8e8';
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, TAU);
    ctx.fill();
    if (s.r > 1.7) {
      ctx.globalAlpha = clamp(a * 0.5, 0, 1);
      ctx.fillRect(s.x * W - s.r * 3, s.y * H - 0.5, s.r * 6, 1);
      ctx.fillRect(s.x * W - 0.5, s.y * H - s.r * 3, 1, s.r * 6);
    }
  }
  ctx.globalAlpha = 1;

  if (shootingStar) {
    const ss = shootingStar;
    const grad = ctx.createLinearGradient(
      ss.x * W, ss.y * H,
      (ss.x - ss.vx * 0.5) * W, (ss.y - ss.vy * 0.5) * H
    );
    grad.addColorStop(0, `rgba(255,250,220,${clamp(ss.life, 0, 1)})`);
    grad.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ss.x * W, ss.y * H);
    ctx.lineTo((ss.x - ss.vx * 0.5) * W, (ss.y - ss.vy * 0.5) * H);
    ctx.stroke();
  }
}

// 空に浮かぶ地球
function drawEarth(ctx) {
  const { W, H } = state;
  const r = Math.min(W, H) * 0.075;
  // 縦画面では右上のボタン列を避けて少し左に置く
  const x = state.layout.portrait ? W * 0.68 : W * 0.82;
  const y = state.layout.portrait ? H * 0.1 : H * 0.12;
  ctx.save();
  // 大気の光
  const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
  glow.addColorStop(0, 'rgba(120,190,255,0.25)');
  glow.addColorStop(1, 'rgba(120,190,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
  // 本体
  const body = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
  body.addColorStop(0, '#9fd8ff');
  body.addColorStop(0.6, '#3f8fdd');
  body.addColorStop(1, '#1a4f96');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  // 大陸 (ゆっくり回っているように見せる)
  ctx.clip();
  ctx.fillStyle = 'rgba(122,200,120,0.85)';
  const t = state.time * 0.05;
  for (let i = 0; i < 4; i++) {
    const a = t + i * 1.7;
    const lx = x + Math.cos(a) * r * 0.9;
    ctx.beginPath();
    ctx.ellipse(lx, y + Math.sin(i * 2.3) * r * 0.45, r * 0.38, r * 0.24, i, 0, TAU);
    ctx.fill();
  }
  // 雲
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 3; i++) {
    const a = -t * 1.4 + i * 2.2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.8, y + Math.sin(i * 1.9) * r * 0.5, r * 0.3, r * 0.12, 0.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// 月面の丘 (地平線)
function drawMoonHills(ctx) {
  const { W, H } = state;
  const hy = H * 0.62;
  ctx.fillStyle = '#4a4470';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, hy + 20);
  for (let x = 0; x <= W; x += W / 24) {
    ctx.lineTo(x, hy + Math.sin(x * 0.008 + 2) * 14 + Math.sin(x * 0.02) * 8);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // クレーター
  ctx.fillStyle = 'rgba(30,26,60,0.35)';
  for (let i = 0; i < 5; i++) {
    const x = ((i * 0.23 + 0.08) % 1) * W;
    const y = hy + 24 + (i % 3) * 12;
    ctx.beginPath();
    ctx.ellipse(x, y, 16 + i * 4, 6 + i, 0, 0, TAU);
    ctx.fill();
  }
}

// 工房のテーブル
function drawTable(ctx) {
  const { W, H } = state;
  const { cy, plateR } = state.layout;
  const ty = Math.max(H * 0.55, cy - plateR * 1.15);
  const wood = ctx.createLinearGradient(0, ty, 0, H);
  wood.addColorStop(0, '#8a5a3b');
  wood.addColorStop(0.12, '#7a4c30');
  wood.addColorStop(1, '#5c3a26');
  ctx.fillStyle = wood;
  ctx.fillRect(0, ty, W, H - ty);
  // 木目
  ctx.strokeStyle = 'rgba(60,35,20,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = ty + 14 + i * ((H - ty) / 7);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += W / 10) {
      ctx.quadraticCurveTo(x + W / 20, y + Math.sin(x * 0.02 + i * 3) * 5, x + W / 10, y);
    }
    ctx.stroke();
  }
  // テーブルのふち
  ctx.fillStyle = 'rgba(255,230,190,0.12)';
  ctx.fillRect(0, ty, W, 5);
}

// 頭上のランプ (光源の見た目)
export function drawLamp(ctx) {
  const { lampX, lampY } = state.layout;
  const r = state.layout.R * 0.34;
  ctx.save();
  // コード
  ctx.strokeStyle = '#2a2445';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(lampX, -10);
  ctx.lineTo(lampX, lampY - r * 0.8);
  ctx.stroke();
  // 光のにじみ (わずかに揺らめく)
  const dim = (1 - state.eclipse * 0.55) * (1 + 0.05 * Math.sin(state.time * 6.3));
  const glow = ctx.createRadialGradient(lampX, lampY, r * 0.2, lampX, lampY, r * 3.8);
  glow.addColorStop(0, `rgba(255,236,170,${0.62 * dim})`);
  glow.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(lampX, lampY, r * 3.8, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // かさ
  ctx.fillStyle = '#f3b642';
  ctx.beginPath();
  ctx.moveTo(lampX - r, lampY);
  ctx.quadraticCurveTo(lampX, lampY - r * 1.5, lampX + r, lampY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d99a2b';
  ctx.beginPath();
  ctx.ellipse(lampX, lampY, r, r * 0.24, 0, 0, Math.PI);
  ctx.fill();
  // 電球
  const bulb = ctx.createRadialGradient(lampX, lampY + r * 0.15, 1, lampX, lampY + r * 0.15, r * 0.34);
  bulb.addColorStop(0, '#fffef2');
  bulb.addColorStop(1, `rgba(255,222,120,${0.9 * dim})`);
  ctx.fillStyle = bulb;
  ctx.beginPath();
  ctx.arc(lampX, lampY + r * 0.15, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}
