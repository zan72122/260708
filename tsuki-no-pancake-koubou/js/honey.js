// ============================================================
// honey.js — はちみつ: とろりと落ちて、あたたかい(明るい)側へ流れる
// ============================================================

import {
  state, CONST, TAU, clamp, rand,
  localToWorld, worldVecToLocal, emit,
} from './state.js';
import { lightAt, lightGradient } from './light.js';
import { spawnSparkle } from './particles.js';

export function addHoney(lx, ly) {
  if (state.honeys.length >= CONST.HONEY_MAX) state.honeys.shift();
  const h = {
    lx, ly,
    vx: 0, vy: 0,        // ローカル速度
    r: rand(0.045, 0.075),
    trail: [],           // {lx,ly,a}
    glisten: rand(TAU),
    flowed: 0,           // 流れた距離 (ミッション用)
    drop: 0.4,
  };
  state.honeys.push(h);
  state.counters.honeyDrops++;
  emit('honeyPlaced', h);
  return h;
}

export function updateHoneys(dt) {
  const { R } = state.layout;
  for (const h of state.honeys) {
    if (h.drop > 0) { h.drop = Math.max(0, h.drop - dt * 1.6); continue; }
    const w = localToWorld(h.lx, h.ly);
    const light = lightAt(w.x, w.y);
    // あたたかい方 (明るい方) へ流れる力
    const grad = lightGradient(w.x, w.y);
    const gLocal = worldVecToLocal(grad.x * R, grad.y * R);
    // あたたかいほどサラサラ流れる
    const fluidity = 0.15 + light * 0.85;
    const force = 0.55 * fluidity;
    h.vx += gLocal.x * force * dt;
    h.vy += gLocal.y * force * dt;
    // ねばり (影の中ではほぼ止まる)
    const drag = Math.pow(0.12 + 0.5 * (1 - fluidity), dt);
    h.vx *= drag;
    h.vy *= drag;
    const step = Math.hypot(h.vx * dt, h.vy * dt);
    h.lx += h.vx * dt;
    h.ly += h.vy * dt;
    h.flowed += step;
    if (h.flowed > 0.12 && !h.flowCounted) {
      h.flowCounted = true;
      state.counters.honeyFlow++;
      emit('honeyFlowed', h);
    }
    // パンケーキの縁で止まる
    const d = Math.hypot(h.lx, h.ly);
    const maxD = 0.94 - h.r;
    if (d > maxD) {
      h.lx *= maxD / d;
      h.ly *= maxD / d;
      h.vx *= 0.3;
      h.vy *= 0.3;
    }
    // 流れの跡
    if (step > 0.0016 && (state.frame & 1) === 0) {
      h.trail.push({ lx: h.lx, ly: h.ly, a: 0.5 });
      if (h.trail.length > 26) h.trail.shift();
    }
    for (const t of h.trail) t.a -= dt * 0.14;
    while (h.trail.length && h.trail[0].a <= 0) h.trail.shift();
    // 流れているときのきらめき
    if (step > 0.003 && Math.random() < dt * 6) {
      spawnSparkle(w.x, w.y, 1, '#ffdf8f');
    }
  }
}

export function drawHoneys(ctx) {
  const { R } = state.layout;
  ctx.save();
  // --- 跡 (とろりとした帯) ---
  for (const h of state.honeys) {
    for (const t of h.trail) {
      if (t.a <= 0) continue;
      const w = localToWorld(t.lx, t.ly);
      ctx.fillStyle = `rgba(224,150,40,${t.a * 0.5})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, R * h.r * 0.62, 0, TAU);
      ctx.fill();
    }
  }
  // --- 本体 (2パスでぷっくり感) ---
  for (const h of state.honeys) {
    const w = localToWorld(h.lx, h.ly);
    const lift = h.drop * R * 0.8;
    const rr = R * h.r * (1 + Math.sin(state.time * 3 + h.glisten) * 0.05);
    const y = w.y - lift;
    // 落ちてくる糸
    if (h.drop > 0.02) {
      ctx.strokeStyle = 'rgba(240,170,60,0.8)';
      ctx.lineWidth = rr * 0.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w.x, y - R * 0.5);
      ctx.lineTo(w.x, y);
      ctx.stroke();
    }
    const body = ctx.createRadialGradient(w.x - rr * 0.3, y - rr * 0.3, rr * 0.1, w.x, y, rr);
    body.addColorStop(0, 'rgba(255,205,105,0.95)');
    body.addColorStop(0.65, 'rgba(235,155,35,0.92)');
    body.addColorStop(1, 'rgba(200,120,20,0.85)');
    ctx.fillStyle = body;
    ctx.beginPath();
    // 動いている方向にすこし伸びる
    const sp = clamp(Math.hypot(h.vx, h.vy) * 8, 0, 0.5);
    const ang = Math.atan2(h.vy, h.vx) + state.rot;
    ctx.ellipse(w.x, y, rr * (1 + sp), rr * (1 - sp * 0.4), ang, 0, TAU);
    ctx.fill();
    // つやハイライト
    ctx.fillStyle = 'rgba(255,250,225,0.75)';
    ctx.beginPath();
    ctx.ellipse(w.x - rr * 0.32, y - rr * 0.34, rr * 0.3, rr * 0.18, -0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
