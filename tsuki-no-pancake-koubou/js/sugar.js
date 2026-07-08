// ============================================================
// sugar.js — 粉砂糖: ふりかけると積もり、ひなたでは溶けて消え、
// 影の形だけ白く残る (影のスタンプあそび)
// パンケーキローカル座標のグリッドで管理する
// ============================================================

import { state, CONST, clamp, rand, TAU, emit } from './state.js';
import { lightAt } from './light.js';
import { spawnSugarDust } from './particles.js';

const N = CONST.SUGAR_N;
let grid = new Float32Array(N * N);   // 砂糖の量 0..1
let img = null;                        // ImageData
let cvs = null;                        // オフスクリーン
let gctx = null;
let dirty = true;
let updateRow = 0;                     // 段階更新カーソル
let totalSugar = 0;

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

// ふりかける: ローカル座標 (単位系) を中心にまき散らす
export function sprinkleSugar(lx, ly, amount = 1) {
  const spread = 0.16;
  const n = 22 * amount;
  for (let k = 0; k < n; k++) {
    const a = rand(TAU), d = Math.sqrt(Math.random()) * spread;
    const x = lx + Math.cos(a) * d;
    const y = ly + Math.sin(a) * d;
    if (x * x + y * y > 0.92) continue;
    const i = clamp(Math.floor((x + 1) / 2 * N), 0, N - 1);
    const j = clamp(Math.floor((y + 1) / 2 * N), 0, N - 1);
    // 少し塊で積もらせる
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        const add = (di === 0 && dj === 0 ? 0.5 : 0.18) * rand(0.6, 1);
        const idx = jj * N + ii;
        const before = grid[idx];
        grid[idx] = clamp(before + add, 0, 1);
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
  if (totalSugar <= 0.01) return;
  const rows = 10; // 1フレームに処理する行数
  const stepDt = dt * (N / rows); // 全行1周分の実効時間
  let melted = 0;
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
        // 明るいほど早くとける
        const rate = (light - CONST.SHADOW_DARK_THRESHOLD) * 0.5;
        const before = grid[idx];
        grid[idx] = Math.max(0, before - rate * stepDt);
        melted += before - grid[idx];
        dirty = true;
      }
    }
  }
  if (melted > 0) {
    totalSugar = Math.max(0, totalSugar - melted);
    state.counters.sugarMelted += melted;
  }
}

// グリッド → オフスクリーン画像
function renderGrid() {
  const data = img.data;
  for (let idx = 0; idx < N * N; idx++) {
    const v = grid[idx];
    const o = idx * 4;
    data[o] = 255;
    data[o + 1] = 253;
    data[o + 2] = 248;
    // 粒感のためにわずかなゆらぎ
    data[o + 3] = v <= 0.003 ? 0 : Math.min(255, v * 235 + ((idx * 2654435761) % 37));
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
  ctx.globalAlpha = 0.96;
  ctx.drawImage(cvs, -R, -R, R * 2, R * 2);
  ctx.restore();
}

// ふりかけ中の舞う粉の演出
export function sugarPuff(wx, wy) {
  spawnSugarDust(wx, wy, state.layout.R * 0.14);
}

export function clearSugar() {
  grid.fill(0);
  totalSugar = 0;
  dirty = true;
}

export function getSugarTotal() {
  return totalSugar;
}
