// ============================================================
// honey.js — はちみつ: とろりと落ちて、あたたかい(明るい)側へ
// グイグイ流れる。流れた跡は太いツヤツヤの帯になって残り、
// 影に入るとピタッと止まって白くにごった「ねばり」質感になる
// ============================================================

import {
  state, CONST, TAU, clamp, rand,
  localToWorld, worldVecToLocal, emit,
} from './state.js';
import { lightAt, lightGradient } from './light.js';
import { spawnSparkle, spawnRing, spawnCrystal } from './particles.js';
import { sfxCool } from './audio.js';

export function addHoney(lx, ly) {
  if (state.honeys.length >= CONST.HONEY_MAX) state.honeys.shift();
  const h = {
    lx, ly,
    vx: 0, vy: 0,        // ローカル速度
    r: rand(0.06, 0.095), // 承認済み: 4歳向けに大きく
    trail: [],           // {lx,ly,a}
    glisten: rand(TAU),
    flowed: 0,           // 流れた距離 (ミッション用)
    drop: 0.4,
    light: 1,            // いまいる場所の光量 (見た目に使う)
    lit: null,
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
    h.light += (light - h.light) * clamp(dt * 6, 0, 1);

    // 境界通過: 影に入るとピタッと止まる
    const wasLit = h.lit;
    if (light > CONST.SHADOW_LIT_THRESHOLD) h.lit = true;
    else if (light < CONST.SHADOW_DARK_THRESHOLD) h.lit = false;
    if (wasLit !== null && wasLit !== h.lit && !h.lit) {
      h.vx *= 0.05;
      h.vy *= 0.05;
      spawnRing(w.x, w.y, '#8fc8ff', R * 0.05);
      sfxCool();
    }

    // あたたかい方 (明るい方) へ流れる力 (承認済み: 高速化)
    const grad = lightGradient(w.x, w.y);
    const gLocal = worldVecToLocal(grad.x * R, grad.y * R);
    const fluidity = 0.1 + light * 0.9;
    const force = CONST.HONEY_FORCE * fluidity;
    h.vx += gLocal.x * force * dt;
    h.vy += gLocal.y * force * dt;
    // ねばり: ひなたはよく滑り、影ではほぼ止まる
    const retention = h.lit === false ? 0.015 : 0.5;
    const drag = Math.pow(retention, dt);
    h.vx *= drag;
    h.vy *= drag;
    const step = Math.hypot(h.vx * dt, h.vy * dt);
    h.lx += h.vx * dt;
    h.ly += h.vy * dt;
    h.flowed += step;
    if (h.flowed > 0.1 && !h.flowCounted) {
      h.flowCounted = true;
      state.counters.honeyFlow++;
      emit('honeyFlowed', h);
    }
    // パンケーキの縁で止まる
    const d = Math.hypot(h.lx, h.ly);
    const maxD = 0.93 - h.r;
    if (d > maxD) {
      h.lx *= maxD / d;
      h.ly *= maxD / d;
      h.vx *= 0.3;
      h.vy *= 0.3;
    }
    // 流れの跡 (太いツヤ帯になる)
    if (step > 0.0015 && (state.frame & 1) === 0) {
      h.trail.push({ lx: h.lx, ly: h.ly, a: 0.85 });
      if (h.trail.length > 18) h.trail.shift();
    }
    for (const t of h.trail) t.a -= dt * 0.1;
    while (h.trail.length && h.trail[0].a <= 0) h.trail.shift();
    // 流れているときのきらめき (承認済み: 増量)
    if (step > 0.002) {
      if (Math.random() < dt * 18) spawnSparkle(w.x, w.y, 1, '#ffdf8f');
    }
    // 影の中では結晶っぽいきらめき
    if (h.lit === false && Math.random() < dt * 1.2) {
      spawnCrystal(w.x + rand(-6, 6), w.y + rand(-6, 6));
    }
  }
}

export function drawHoneys(ctx) {
  const { R } = state.layout;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // --- 跡: 太いツヤツヤの帯 ---
  for (const h of state.honeys) {
    const tr = h.trail;
    if (tr.length < 2) continue;
    for (let i = 0; i < tr.length - 1; i++) {
      const a = Math.min(tr[i].a, tr[i + 1].a);
      if (a <= 0) continue;
      const w1 = localToWorld(tr[i].lx, tr[i].ly);
      const w2 = localToWorld(tr[i + 1].lx, tr[i + 1].ly);
      const lw = R * h.r * 1.5;
      // 帯本体
      ctx.strokeStyle = `rgba(226,148,34,${a * 0.75})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(w1.x, w1.y);
      ctx.lineTo(w2.x, w2.y);
      ctx.stroke();
      // 上に走るツヤの筋
      ctx.strokeStyle = `rgba(255,224,150,${a * 0.55})`;
      ctx.lineWidth = lw * 0.32;
      ctx.beginPath();
      ctx.moveTo(w1.x - lw * 0.14, w1.y - lw * 0.14);
      ctx.lineTo(w2.x - lw * 0.14, w2.y - lw * 0.14);
      ctx.stroke();
    }
  }
  // --- 本体 ---
  for (const h of state.honeys) {
    const w = localToWorld(h.lx, h.ly);
    const lift = h.drop * R * 0.8;
    const speed = Math.hypot(h.vx, h.vy);
    // 流れている先端はぷるぷる脈打つ
    const pulse = speed > 0.02 ? 1 + 0.12 * Math.sin(state.time * 11 + h.glisten) : 1;
    const rr = R * h.r * pulse * (1 + Math.sin(state.time * 3 + h.glisten) * 0.04);
    const y = w.y - lift;
    // 落ちてくる糸
    if (h.drop > 0.02) {
      ctx.strokeStyle = 'rgba(240,170,60,0.8)';
      ctx.lineWidth = rr * 0.4;
      ctx.beginPath();
      ctx.moveTo(w.x, y - R * 0.5);
      ctx.lineTo(w.x, y);
      ctx.stroke();
    }
    const inShade = h.lit === false;
    const body = ctx.createRadialGradient(w.x - rr * 0.3, y - rr * 0.3, rr * 0.1, w.x, y, rr);
    if (inShade) {
      // 影: 白くにごった「ねばり」の質感
      body.addColorStop(0, 'rgba(240,196,120,0.95)');
      body.addColorStop(0.6, 'rgba(206,140,50,0.95)');
      body.addColorStop(1, 'rgba(172,112,36,0.92)');
    } else {
      body.addColorStop(0, 'rgba(255,205,105,0.95)');
      body.addColorStop(0.65, 'rgba(235,155,35,0.92)');
      body.addColorStop(1, 'rgba(200,120,20,0.85)');
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    // 動いている方向にすこし伸びる (矢印感)
    const sp = clamp(speed * 9, 0, 0.6);
    const ang = Math.atan2(h.vy, h.vx) + state.rot;
    ctx.ellipse(w.x, y, rr * (1 + sp), rr * (1 - sp * 0.4), ang, 0, TAU);
    ctx.fill();
    if (inShade) {
      // にごりの白いもや
      ctx.fillStyle = 'rgba(255,246,230,0.3)';
      ctx.beginPath();
      ctx.ellipse(w.x, y - rr * 0.15, rr * 0.6, rr * 0.4, 0, 0, TAU);
      ctx.fill();
    } else {
      // つやハイライト
      ctx.fillStyle = 'rgba(255,250,225,0.8)';
      ctx.beginPath();
      ctx.ellipse(w.x - rr * 0.32, y - rr * 0.34, rr * 0.32, rr * 0.19, -0.6, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
