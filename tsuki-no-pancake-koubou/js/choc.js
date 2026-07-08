// ============================================================
// choc.js — チョコソース: 指でかけると太い線になり、影の中で固まる
//  とろとろ: 明るいミルクチョコでツヤツヤ
//  カチカチ: ほぼ黒のマットな板チョコブロックに立体化、
//            固まる瞬間に白いヒビがピキピキッと走る
//  カチカチをタップするとパキッと割れてかけらが飛ぶ
// ============================================================

import {
  state, CONST, TAU, clamp, rand,
  localToWorld, dist, emit,
} from './state.js';
import { lightAt } from './light.js';
import {
  spawnSparkle, spawnCrackle, spawnCrystal, spawnRing, spawnShards,
} from './particles.js';
import { sfxCrack, sfxFreeze, sfxBreak } from './audio.js';

let totalPoints = 0;

// ドラッグ開始で新しいストローク
export function beginChocStroke(lx, ly) {
  const stroke = { points: [], lit: null };
  state.chocStrokes.push(stroke);
  addChocPoint(stroke, lx, ly);
  return stroke;
}

export function addChocPoint(stroke, lx, ly) {
  const pts = stroke.points;
  const last = pts[pts.length - 1];
  if (last && Math.hypot(lx - last.lx, ly - last.ly) < 0.024) return;
  pts.push({
    lx, ly,
    hard: 0,          // 0=とろとろ 1=カチカチ
    hardCounted: false,
    crackT: 0,        // ヒビ演出の残り時間
    w: rand(0.032, 0.044), // 承認済み: 4歳向けに太く
  });
  totalPoints++;
  while (totalPoints > CONST.CHOC_MAX_POINTS && state.chocStrokes.length) {
    const old = state.chocStrokes[0];
    totalPoints -= old.points.length;
    state.chocStrokes.shift();
  }
}

export function updateChoc(dt) {
  let newlyHard = 0;
  const R = state.layout.R;
  for (const stroke of state.chocStrokes) {
    const pts = stroke.points;
    if (!pts.length) continue;
    // ストローク中央で境界通過を検出
    const mid = pts[pts.length >> 1];
    const mw = localToWorld(mid.lx, mid.ly);
    const midLight = lightAt(mw.x, mw.y);
    const wasLit = stroke.lit;
    if (midLight > CONST.SHADOW_LIT_THRESHOLD) stroke.lit = true;
    else if (midLight < CONST.SHADOW_DARK_THRESHOLD) stroke.lit = false;
    if (wasLit !== null && wasLit !== stroke.lit && !stroke.lit) {
      spawnRing(mw.x, mw.y, '#a8d8ff', R * 0.07);
      sfxFreeze();
    }

    for (const p of pts) {
      if (p.crackT > 0) p.crackT -= dt;
      const w = localToWorld(p.lx, p.ly);
      const light = lightAt(w.x, w.y);
      if (light < CONST.SHADOW_DARK_THRESHOLD) {
        // ひかげ: 固まる (承認済み: 2倍速)
        const speed = (CONST.SHADOW_DARK_THRESHOLD - light) * CONST.CHOC_HARDEN_SPEED + 0.5;
        const before = p.hard;
        p.hard = clamp(p.hard + dt * speed, 0, 1);
        // 固まっている最中は青い結晶がきらめく
        if (p.hard < 1 && Math.random() < dt * 5) {
          spawnCrystal(w.x + rand(-4, 4), w.y + rand(-4, 4));
        }
        if (p.hard >= 1 && before < 1) {
          p.crackT = 0.55; // ヒビ演出スタート
          if (!p.hardCounted) {
            p.hardCounted = true;
            newlyHard++;
          }
          spawnCrackle(w.x, w.y);
          if (Math.random() < 0.5) spawnSparkle(w.x, w.y, 2, '#dcecff');
        }
      } else if (light > CONST.SHADOW_LIT_THRESHOLD) {
        // ひなた: ゆっくり溶けなおす
        const before = p.hard;
        p.hard = clamp(p.hard - dt * CONST.CHOC_REMELT_SPEED, 0, 1);
        if (before >= 1 && p.hard < 1) p.hardCounted = false;
      }
    }
  }
  if (newlyHard > 0) {
    state.counters.chocHardened += newlyHard;
    sfxCrack();
    emit('chocHardened', { count: newlyHard });
  }
}

// カチカチのチョコをタップで割る。割れたら true
export function breakChocAt(wx, wy) {
  const R = state.layout.R;
  const rad = R * 0.15;
  let broke = 0;
  let hitX = 0, hitY = 0;
  const survivors = [];
  for (const stroke of state.chocStrokes) {
    let run = [];
    const flush = () => {
      if (run.length) survivors.push({ points: run, lit: stroke.lit });
      run = [];
    };
    for (const p of stroke.points) {
      const w = localToWorld(p.lx, p.ly);
      if (p.hard >= 0.55 && dist(wx, wy, w.x, w.y) < rad) {
        broke++;
        hitX = w.x; hitY = w.y;
        flush();
      } else {
        run.push(p);
      }
    }
    flush();
  }
  if (!broke) return false;
  state.chocStrokes.length = 0;
  state.chocStrokes.push(...survivors);
  totalPoints = survivors.reduce((n, s) => n + s.points.length, 0);
  state.counters.chocBroken += broke;
  spawnShards(hitX, hitY, Math.min(4 + broke * 2, 14));
  spawnRing(hitX, hitY, '#ffffff', R * 0.06);
  sfxBreak();
  emit('chocBroken', { count: broke });
  return true;
}

export function drawChoc(ctx) {
  const { R } = state.layout;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of state.chocStrokes) {
    const pts = stroke.points;
    if (pts.length === 0) continue;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const w1 = localToWorld(p.lx, p.ly);
      const lw = R * p.w * 2;
      if (p.hard >= 0.85) {
        drawHardBlock(ctx, p, w1, lw, i);
        continue;
      }
      // とろとろ〜半がため: 色の差を極端に
      const t = p.hard;
      const r = Math.round(158 - t * 110);
      const g = Math.round(98 - t * 70);
      const b = Math.round(52 - t * 36);
      if (q && q.hard < 0.85) {
        const w2 = localToWorld(q.lx, q.ly);
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(w1.x, w1.y);
        ctx.lineTo(w2.x, w2.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(w1.x, w1.y, lw / 2, 0, TAU);
        ctx.fill();
      }
      // とろとろの強いツヤ
      if (t < 0.5) {
        ctx.fillStyle = `rgba(255,228,200,${0.5 * (1 - t * 2)})`;
        ctx.beginPath();
        ctx.ellipse(w1.x - lw * 0.16, w1.y - lw * 0.18, lw * 0.2, lw * 0.11, -0.6, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

// カチカチの立体板チョコブロック
function drawHardBlock(ctx, p, w, lw, i) {
  const s = lw * 0.72;
  const ang = (i * 0.7 + p.lx * 5) % 0.5 - 0.25;
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(state.rot + ang);
  // 落ち影 (盛り上がって見える)
  ctx.fillStyle = 'rgba(25,12,6,0.4)';
  ctx.fillRect(-s + s * 0.16, -s * 0.72 + s * 0.2, s * 2, s * 1.44);
  // 本体: ほぼ黒のマットチョコ
  ctx.fillStyle = '#2a1409';
  ctx.fillRect(-s, -s * 0.72, s * 2, s * 1.44);
  // 上面のベベル (板チョコ感)
  ctx.fillStyle = '#3f2211';
  ctx.fillRect(-s * 0.78, -s * 0.5, s * 1.56, s * 1.0);
  // 上辺のエッジハイライト
  ctx.fillStyle = 'rgba(140,90,60,0.8)';
  ctx.fillRect(-s, -s * 0.72, s * 2, s * 0.14);
  // 固まった瞬間の白いヒビ (ピキピキッ)
  if (p.crackT > 0) {
    const a = clamp(p.crackT / 0.55, 0, 1);
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`;
    ctx.lineWidth = Math.max(1, s * 0.09);
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const ca = (k / 3) * TAU + p.w * 100;
      ctx.moveTo(0, 0);
      const mx = Math.cos(ca) * s * 0.6, my = Math.sin(ca) * s * 0.45;
      ctx.lineTo(mx, my);
      ctx.lineTo(mx + Math.cos(ca + 0.7) * s * 0.4, my + Math.sin(ca + 0.7) * s * 0.3);
    }
    ctx.stroke();
  }
  ctx.restore();
  // ときどきキラッ
  if ((state.frame + i * 13) % 110 < 3) {
    spawnSparkle(w.x, w.y, 1, '#e8d5ff');
  }
}

export function clearChoc() {
  state.chocStrokes.length = 0;
  totalPoints = 0;
}
