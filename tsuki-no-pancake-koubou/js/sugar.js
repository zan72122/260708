// ============================================================
// sugar.js — 粉砂糖: たっぷり積もって白い山になり、
// ひなたの砂糖はキラキラ光りながらスーッと溶けて消え、
// 影の形だけがくっきり残る (影のスタンプあそび)
// パンケーキローカル座標のグリッドで管理する
// ============================================================

import { state, CONST, clamp, rand, TAU, emit } from './state.js';
import { lightAt } from './light.js';
import { spawnSugarDust, spawnSparkle } from './particles.js';

const N = CONST.SUGAR_N;
const PILE_MAX = 1.6;      // 砂糖の最大の厚み
let grid = new Float32Array(N * N);
let img = null;
let cvs = null;
let gctx = null;
let dirty = true;
let updateRow = 0;
let totalSugar = 0;
let flash = 0;             // 大きく溶けた瞬間の輪郭グロー

export function initSugar() {
  cvs = document.createElement('canvas');
  cvs.width = cvs.height = N;
  gctx = cvs.getContext('2d');
  img = gctx.createImageData(N, N);
  grid.fill(0);
  dirty = true;
}

// セル中心のローカル座標 (半径1単位)
function cellToLocal(i, j) {
  return { x: (i + 0.5) / N * 2 - 1, y: (j + 0.5) / N * 2 - 1 };
}

// ふりかける: たっぷり積もる (承認済み: 増量 + 厚み)
export function sprinkleSugar(lx, ly, amount = 1) {
  const spread = 0.17;
  const n = 30 * amount;
  for (let k = 0; k < n; k++) {
    const a = rand(TAU), d = Math.sqrt(Math.random()) * spread;
    const x = lx + Math.cos(a) * d;
    const y = ly + Math.sin(a) * d;
    if (x * x + y * y > 0.92) continue;
    const i = clamp(Math.floor((x + 1) / 2 * N), 0, N - 1);
    const j = clamp(Math.floor((y + 1) / 2 * N), 0, N - 1);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        const add = (di === 0 && dj === 0 ? 0.85 : 0.3) * rand(0.6, 1);
        const idx = jj * N + ii;
        const before = grid[idx];
        grid[idx] = clamp(before + add, 0, PILE_MAX);
        totalSugar += grid[idx] - before;
      }
    }
  }
  state.counters.sugarSprinkled++;
  dirty = true;
  emit('sugarSprinkled', {});
}

// 段階更新: 毎フレーム数行ずつ光を評価して溶かす
export function updateSugar(dt) {
  flash = Math.max(0, flash - dt * 1.8);
  if (totalSugar <= 0.01) return;
  const rows = 10;
  const stepDt = dt * (N / rows);
  let melted = 0;
  let sparkleBudget = 7; // 溶けのキラキラは1フレームこの数まで
  const c = Math.cos(state.rot), s = Math.sin(state.rot);
  const { cx, cy, R } = state.layout;
  for (let r = 0; r < rows; r++) {
    const j = updateRow;
    updateRow = (updateRow + 1) % N;
    for (let i = 0; i < N; i++) {
      const idx = j * N + i;
      const v = grid[idx];
      if (v <= 0.003) continue;
      const p = cellToLocal(i, j);
      if (p.x * p.x + p.y * p.y > 1) { grid[idx] = 0; continue; }
      const wx = cx + R * (p.x * c - p.y * s);
      const wy = cy + R * (p.x * s + p.y * c);
      const light = lightAt(wx, wy);
      if (light > CONST.SHADOW_DARK_THRESHOLD) {
        // 明るいほど早くとける (承認済み: 2倍速)
        const rate = (light - CONST.SHADOW_DARK_THRESHOLD) * CONST.SUGAR_MELT_SPEED;
        const before = grid[idx];
        grid[idx] = Math.max(0, before - rate * stepDt);
        melted += before - grid[idx];
        dirty = true;
        // キラキラ光りながら消えていく
        if (sparkleBudget > 0 && Math.random() < 0.028) {
          sparkleBudget--;
          spawnSparkle(wx, wy, 1, '#ffffff');
        }
      }
    }
  }
  if (melted > 0) {
    totalSugar = Math.max(0, totalSugar - melted);
    state.counters.sugarMelted += melted;
    // 大きく溶けている間、残った影の形の輪郭が光る
    flash = clamp(flash + melted * 0.25, 0, 0.9);
  }
}

// グリッド → オフスクリーン画像 (厚みの陰影つき)
function renderGrid() {
  const data = img.data;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const idx = j * N + i;
      const v = grid[idx];
      const o = idx * 4;
      if (v <= 0.004) { data[o + 3] = 0; continue; }
      // 上のセルより低いところは山かげで少し暗く (厚み表現)
      const above = j > 0 ? grid[idx - N] : v;
      const shade = clamp((above - v) * 0.7, 0, 0.4);
      const bright = 255 - shade * 95;
      data[o] = bright;
      data[o + 1] = bright - 2;
      data[o + 2] = Math.min(255, bright + 2);
      // 厚いほど不透明な白い山 + 粒感のゆらぎ
      const alpha = 80 + v * 130 + ((idx * 2654435761) % 31);
      data[o + 3] = Math.min(255, alpha);
    }
  }
  gctx.putImageData(img, 0, 0);
  dirty = false;
}

export function drawSugar(ctx) {
  if (totalSugar <= 0.01) return;
  if (dirty && (state.frame % 2 === 0)) renderGrid();
  const { cx, cy, R } = state.layout;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.rot);
  ctx.imageSmoothingEnabled = true;
  // 溶けている間: 残った形の縁が白く光る
  if (flash > 0.05) {
    ctx.shadowColor = `rgba(255,255,255,${clamp(flash, 0, 0.85)})`;
    ctx.shadowBlur = R * 0.07 * flash;
  }
  ctx.globalAlpha = 0.97;
  ctx.drawImage(cvs, -R, -R, R * 2, R * 2);
  ctx.restore();
}

// ふりかけ中の舞う粉の演出
export function sugarPuff(wx, wy) {
  spawnSugarDust(wx, wy, state.layout.R * 0.16);
  spawnSugarDust(wx, wy, state.layout.R * 0.09);
}

export function clearSugar() {
  grid.fill(0);
  totalSugar = 0;
  flash = 0;
  dirty = true;
}

export function getSugarTotal() {
  return totalSugar;
}
