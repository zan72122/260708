// ============================================================
// choc.js — チョコソース: 指でかけると線になり、影の中でカチッと固まる
// 固まったチョコは色が締まり、キラッと光る。ひなたに戻すと再び溶ける
// ============================================================

import {
  state, CONST, TAU, clamp, rand,
  localToWorld, emit,
} from './state.js';
import { lightAt } from './light.js';
import { spawnSparkle, spawnCrackle } from './particles.js';
import { sfxCrack } from './audio.js';

let totalPoints = 0;

// ドラッグ開始で新しいストローク
export function beginChocStroke(lx, ly) {
  const stroke = { points: [], done: false };
  state.chocStrokes.push(stroke);
  addChocPoint(stroke, lx, ly);
  return stroke;
}

export function addChocPoint(stroke, lx, ly) {
  const pts = stroke.points;
  const last = pts[pts.length - 1];
  if (last && Math.hypot(lx - last.lx, ly - last.ly) < 0.022) return;
  pts.push({
    lx, ly,
    hard: 0,          // 0=とろとろ 1=カチカチ
    hardCounted: false,
    w: rand(0.020, 0.030),
  });
  totalPoints++;
  // 上限を超えたら古いストロークから消す
  while (totalPoints > CONST.CHOC_MAX_POINTS && state.chocStrokes.length) {
    const old = state.chocStrokes[0];
    totalPoints -= old.points.length;
    state.chocStrokes.shift();
  }
}

export function updateChoc(dt) {
  let newlyHard = 0;
  for (const stroke of state.chocStrokes) {
    for (const p of stroke.points) {
      const w = localToWorld(p.lx, p.ly);
      const light = lightAt(w.x, w.y);
      if (light < CONST.SHADOW_DARK_THRESHOLD) {
        // ひかげ: 固まる
        const speed = (CONST.SHADOW_DARK_THRESHOLD - light) * 1.6 + 0.25;
        p.hard = clamp(p.hard + dt * speed, 0, 1);
        if (p.hard >= 1 && !p.hardCounted) {
          p.hardCounted = true;
          newlyHard++;
          if (Math.random() < 0.4) spawnCrackle(w.x, w.y);
        }
      } else if (light > CONST.SHADOW_LIT_THRESHOLD) {
        // ひなた: ゆっくり溶けなおす
        const before = p.hard;
        p.hard = clamp(p.hard - dt * 0.22, 0, 1);
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

export function drawChoc(ctx) {
  const { R } = state.layout;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of state.chocStrokes) {
    const pts = stroke.points;
    if (pts.length === 0) continue;
    // セグメントごとに硬さで色を変える
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const w1 = localToWorld(p.lx, p.ly);
      const lw = R * p.w * 2 * (1 - p.hard * 0.25);
      // とろとろ=明るいチョコ / カチカチ=濃いチョコ
      const r = Math.round(120 - p.hard * 55);
      const g = Math.round(72 - p.hard * 38);
      const b = Math.round(38 - p.hard * 16);
      if (q) {
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
      // とろとろの光沢
      if (p.hard < 0.5) {
        ctx.fillStyle = `rgba(255,220,190,${0.35 * (1 - p.hard * 2)})`;
        ctx.beginPath();
        ctx.arc(w1.x - lw * 0.16, w1.y - lw * 0.16, lw * 0.16, 0, TAU);
        ctx.fill();
      }
      // カチカチのキラッ
      if (p.hard >= 1 && (state.frame + i * 7) % 90 < 4) {
        spawnSparkle(w1.x, w1.y, 1, '#e8d5ff');
      }
    }
  }
  ctx.restore();
}

export function clearChoc() {
  state.chocStrokes.length = 0;
  totalPoints = 0;
}
