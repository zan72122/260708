// ============================================================
// light.js — 光と影のシステム
// 上からの光を、月ボード・クッキー・フルーツが遮る。
// lightAt(x,y) が 0(まっくら)〜1(ひなた) を返す。
// ============================================================

import { state, CONST, clamp, smoothstep, dist, emit, TAU } from './state.js';

// 光のわずかな傾き: 影は遮蔽物より少し下にずれて見やすくなる
export const LIGHT_TILT = { x: 0.06, y: 0.13 };

// 遮蔽物 (ワールド座標・皿と一緒には回らない)
export function makeOccluder(kind, x, y) {
  const R = state.layout.R;
  const def = {
    moonboard: { r: R * 0.62, soft: R * 0.16, dark: 0.92 },
    cookie: { r: R * 0.30, soft: R * 0.10, dark: 0.88 },
  }[kind];
  return {
    kind,
    x, y,
    r: def.r,
    soft: def.soft,
    dark: def.dark,
    holdH: R * 0.5, // 浮いている高さ (見た目用)
    wobble: Math.random() * TAU,
    grabbed: false,
  };
}

// 遮蔽物の影の中心 (光の傾きぶんオフセット)
export function shadowCenter(oc) {
  return {
    x: oc.x + oc.holdH * LIGHT_TILT.x,
    y: oc.y + oc.holdH * LIGHT_TILT.y,
  };
}

// フルーツの影 (パンケーキの上に置いた実体が落とす小さな影)
function fruitShadow(fruit, wx, wy) {
  const R = state.layout.R;
  const h = R * 0.055; // フルーツの高さ相当
  return {
    x: wx + h * LIGHT_TILT.x * 3.2,
    y: wy + h * LIGHT_TILT.y * 3.2,
    r: fruit.shadowR * R,
    soft: fruit.shadowR * R * 0.55,
    dark: 0.62,
  };
}

// このフレームの影リストをキャッシュ (毎フレーム更新)
let shadowCache = [];

export function updateLight() {
  shadowCache = [];
  for (const oc of state.occluders) {
    const c = shadowCenter(oc);
    shadowCache.push({ x: c.x, y: c.y, r: oc.r, soft: oc.soft, dark: oc.dark });
  }
  for (const f of state.fruits) {
    const w = f.world; // fruits.js が毎フレーム world 座標を更新
    if (w) shadowCache.push(fruitShadow(f, w.x, w.y));
  }
  updateEclipse();
}

// 指定ワールド座標の光量 0..1
export function lightAt(wx, wy) {
  let l = 1;
  for (const s of shadowCache) {
    const d = dist(wx, wy, s.x, s.y);
    const occ = 1 - smoothstep(s.r - s.soft, s.r + s.soft, d);
    l *= 1 - s.dark * occ;
  }
  return clamp(CONST.AMBIENT + (1 - CONST.AMBIENT) * l, 0, 1);
}

// 光の勾配 (明るい方向を指すベクトル) — はちみつの流れに使う
export function lightGradient(wx, wy) {
  const e = state.layout.R * 0.06;
  const gx = lightAt(wx + e, wy) - lightAt(wx - e, wy);
  const gy = lightAt(wx, wy + e) - lightAt(wx, wy - e);
  return { x: gx / (2 * e), y: gy / (2 * e) };
}

// ---- 日食判定 ----
// 大きな遮蔽物の影がパンケーキ中心を覆うと「にっしょく」
function updateEclipse() {
  const { cx, cy, R } = state.layout;
  let best = 0;
  for (const oc of state.occluders) {
    const c = shadowCenter(oc);
    const d = dist(c.x, c.y, cx, cy);
    const cover = 1 - smoothstep(0, R * CONST.ECLIPSE_DIST + oc.r * 0.35, d);
    if (cover > best) best = cover;
  }
  const was = state.eclipseActive;
  state.eclipse += (best - state.eclipse) * clamp(state.dt * 3, 0, 1);
  state.eclipseActive = state.eclipse > 0.55;
  if (!was && state.eclipseActive) {
    state.counters.eclipses++;
    emit('eclipse', {});
  }
}

// ---- 影の描画 ----
// パンケーキと皿の上に、やわらかい影を multiply で落とす
export function drawShadows(ctx) {
  const { cx, cy, plateR } = state.layout;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, plateR * 1.06, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  for (const s of shadowCache) {
    const g = ctx.createRadialGradient(s.x, s.y, Math.max(1, s.r - s.soft), s.x, s.y, s.r + s.soft);
    const inner = 1 - s.dark * 0.75;
    g.addColorStop(0, `rgba(${58 * inner + 30},${44 * inner + 26},${86 * inner + 40},${0.55 * s.dark + 0.25})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r + s.soft, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ひなたの温かいハイライト (overlay)
export function drawWarmLight(ctx) {
  const { cx, cy, R } = state.layout;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = 'overlay';
  const g = ctx.createRadialGradient(
    cx - R * 0.25, cy - R * 0.3, R * 0.1,
    cx, cy, R * 1.25
  );
  const warm = 0.30 * (1 - state.eclipse * 0.85);
  g.addColorStop(0, `rgba(255,220,150,${warm})`);
  g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
}

// 日食のコロナ演出 (遮蔽物のまわりに光の輪)
export function drawCorona(ctx) {
  if (state.eclipse < 0.2) return;
  for (const oc of state.occluders) {
    const a = state.eclipse * 0.9;
    const pulse = 1 + 0.05 * Math.sin(state.time * 3);
    const g = ctx.createRadialGradient(oc.x, oc.y, oc.r * 0.92, oc.x, oc.y, oc.r * 1.7 * pulse);
    g.addColorStop(0, `rgba(255,246,214,${a * 0.9})`);
    g.addColorStop(0.25, `rgba(255,230,170,${a * 0.4})`);
    g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(oc.x, oc.y, oc.r * 1.8 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
