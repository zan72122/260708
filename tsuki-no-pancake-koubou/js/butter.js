// ============================================================
// butter.js — バター: 光が当たると3段階で溶ける
//  だんかい1: 角がプルプルふるえる
//  だんかい2: かたちがぐにゃりとくずれる
//  だんかい3: どろっと大きな金色の池に広がる
// 溶けている間は泡・湯気・オレンジの光をまとって「いま溶けてる!」
// ============================================================

import { state, CONST, TAU, clamp, rand, localToWorld, emit } from './state.js';
import { lightAt } from './light.js';
import {
  spawnSizzle, spawnSparkle, spawnRing, spawnSteamPuff,
} from './particles.js';
import { sfxSizzleHit, sfxCool } from './audio.js';

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
    lit: null,        // ひなたにいるか (境界通過の検出用)
    meltingNow: 0,    // いま溶けている強さ (光の演出用)
  };
  state.butters.push(b);
  emit('butterPlaced', b);
  return b;
}

export function updateButters(dt) {
  let sizzle = 0;
  const R = state.layout.R;
  for (const b of state.butters) {
    if (b.drop > 0) b.drop = Math.max(0, b.drop - dt * 1.4);
    const w = localToWorld(b.lx, b.ly);
    const light = lightAt(w.x, w.y);

    // 境界通過の検出 (ヒステリシスつき)
    const wasLit = b.lit;
    if (light > CONST.SHADOW_LIT_THRESHOLD) b.lit = true;
    else if (light < CONST.SHADOW_DARK_THRESHOLD) b.lit = false;
    if (wasLit !== null && wasLit !== b.lit && b.drop <= 0) {
      if (b.lit && b.melt < 1) {
        spawnRing(w.x, w.y, '#ffb347', R * 0.07);
        sfxSizzleHit();
      } else if (!b.lit) {
        spawnRing(w.x, w.y, '#8fc8ff', R * 0.06);
        sfxCool();
      }
    }

    let speed = 0;
    if (light > CONST.SHADOW_LIT_THRESHOLD && b.melt < 1 && b.drop <= 0) {
      // ひなた: じゅわっと溶ける (承認済み: 2倍速)
      speed = (light - CONST.SHADOW_LIT_THRESHOLD) * CONST.BUTTER_MELT_SPEED;
      b.melt = clamp(b.melt + dt * speed, 0, 1);
      sizzle += speed * (1.2 - b.melt * 0.5);
      // 泡と湯気をモリモリ (承認済み: エフェクト増量)
      const bubbleRate = dt * 46 * speed;
      for (let k = 0; k < 3; k++) {
        if (Math.random() < bubbleRate) {
          spawnSizzle(w.x, w.y, R * (0.05 + b.puddle * 0.22));
        }
      }
      if (Math.random() < dt * 7 * speed) {
        spawnSteamPuff(w.x + rand(-R * 0.05, R * 0.05), w.y - R * 0.04);
      }
      if (Math.random() < dt * 5 * speed) {
        spawnSparkle(w.x, w.y, 1, '#ffe9a0');
      }
      if (b.melt >= 1 && !b.meltedCounted) {
        b.meltedCounted = true;
        state.counters.butterMelted++;
        spawnSparkle(w.x, w.y, 14, '#ffe9a0');
        spawnRing(w.x, w.y, '#ffd76a', R * 0.1);
        emit('butterMelted', b);
      }
    }
    b.meltingNow += (clamp(speed * 3, 0, 1) - b.meltingNow) * clamp(dt * 5, 0, 1);
    // 池は溶け具合を追いかけて広がる (終盤は一気にどろっと)
    const chase = b.melt > 0.7 ? 3.2 : 1.6;
    b.puddle += (b.melt - b.puddle) * clamp(dt * chase, 0, 1);
  }
  state.sizzleLevel = clamp(sizzle, 0, 1);
}

// 池の半径 (承認済み: 大きな池)
function puddleRadius(b, R) {
  return R * (0.07 + 0.38 * Math.pow(Math.max(b.puddle, 0), 1.2));
}

export function drawButters(ctx) {
  const { R } = state.layout;
  ctx.save();
  // --- 溶けた池 (下層) ---
  for (const b of state.butters) {
    if (b.puddle <= 0.02) continue;
    const w = localToWorld(b.lx, b.ly);
    const pr = puddleRadius(b, R);
    // 縁がゆらめく金色の池
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * TAU;
      const rr = pr * (1 + 0.06 * Math.sin(a * 6 + state.time * 2 + b.wobble));
      const x = w.x + Math.cos(a) * rr;
      const y = w.y + Math.sin(a) * rr * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(w.x, w.y, pr * 0.08, w.x, w.y, pr);
    g.addColorStop(0, `rgba(255,236,150,${0.95 * b.puddle})`);
    g.addColorStop(0.65, `rgba(250,204,80,${0.9 * b.puddle})`);
    g.addColorStop(1, `rgba(238,178,44,${0.55 * b.puddle})`);
    ctx.fillStyle = g;
    ctx.fill();
    // 濃い金色の縁どり
    ctx.strokeStyle = `rgba(206,146,26,${0.55 * b.puddle})`;
    ctx.lineWidth = Math.max(1.5, pr * 0.06);
    ctx.stroke();
    // てらてらハイライト
    ctx.fillStyle = `rgba(255,255,235,${0.45 * b.puddle})`;
    ctx.beginPath();
    ctx.ellipse(w.x - pr * 0.3, w.y - pr * 0.3, pr * 0.32, pr * 0.16, -0.5, 0, TAU);
    ctx.fill();
  }
  // --- 溶けている最中のオレンジの光 (screen) ---
  for (const b of state.butters) {
    if (b.meltingNow <= 0.05) continue;
    const w = localToWorld(b.lx, b.ly);
    const gr = puddleRadius(b, R) * 1.6 + R * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(w.x, w.y, 1, w.x, w.y, gr);
    const a = 0.38 * b.meltingNow * (1 + 0.15 * Math.sin(state.time * 9));
    glow.addColorStop(0, `rgba(255,190,90,${a})`);
    glow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(w.x, w.y, gr, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // --- 四角いバター本体 (上層・3段階アニメ) ---
  for (const b of state.butters) {
    if (b.melt >= 0.98) continue;
    const w = localToWorld(b.lx, b.ly);
    // 承認済み: 4歳向けに大きく
    const size = R * 0.155 * (1 - b.melt * 0.7);
    const lift = b.drop * R * 0.6;
    // だんかい1 (melt<0.4): プルプルふるえ / だんかい2以降はぐにゃり
    const tremble = b.meltingNow *
      (b.melt < 0.4 ? b.melt / 0.4 : Math.max(0, (0.75 - b.melt) / 0.35));
    const jx = Math.sin(state.time * 31 + b.wobble) * size * 0.09 * tremble;
    const jy = Math.cos(state.time * 27 + b.wobble * 2) * size * 0.07 * tremble;
    const squish = 1 + b.melt * 0.5;                 // 横に広がる
    const h = size * (1 - b.melt * 0.55) / squish;   // 低くなる
    const gnyari = Math.sin(state.time * 7 + b.wobble) * b.melt * 0.16;
    ctx.save();
    ctx.translate(w.x + jx, w.y - lift + jy);
    ctx.rotate(state.rot + b.rot + gnyari);
    ctx.scale(squish, 1);
    const soft = size * (0.16 + b.melt * 0.6); // 角が丸くなっていく
    // 側面 (立体感)
    ctx.fillStyle = '#e8b93e';
    roundRect(ctx, -size, -h * 0.5 + size * 0.22, size * 2, h, soft);
    ctx.fill();
    // 上面
    const top = ctx.createLinearGradient(-size, -h, size, h * 0.4);
    top.addColorStop(0, '#fff3b8');
    top.addColorStop(1, '#f7d868');
    ctx.fillStyle = top;
    roundRect(ctx, -size, -h * 0.62, size * 2, h, soft);
    ctx.fill();
    // 光沢
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    roundRect(ctx, -size * 0.6, -h * 0.5, size * 0.7, h * 0.26, size * 0.12);
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
