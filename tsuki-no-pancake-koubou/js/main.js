// ============================================================
// main.js — 起動・レイアウト・メインループ
// 描画順: 背景 → 皿 → パンケーキ → トッピング → 影 → 湯気
//        → 浮かぶ遮蔽物 → コロナ → ランプ → 粒子 → うさぎ
// ============================================================

import { state, clamp } from './state.js';
import { initScene, updateScene, drawScene, drawLamp } from './scene.js';
import {
  rebuildPancakeTexture, updatePancake,
  drawPlate, drawPancakeBase, drawSteam,
} from './pancake.js';
import { updateLight, drawShadows, drawWarmLight, drawCorona } from './light.js';
import { updateButters, drawButters } from './butter.js';
import { updateHoneys, drawHoneys } from './honey.js';
import { updateChoc, drawChoc } from './choc.js';
import { initSugar, updateSugar, drawSugar, getSugarTotal } from './sugar.js';
import { updateFruits, drawFruits } from './fruits.js';
import { initOccluders, placeAtHome, updateOccluders, drawOccluders } from './occluders.js';
import { updateParticles, drawParticles } from './particles.js';
import { initRabbit, updateRabbit, drawRabbit } from './rabbit.js';
import { initMissions, updateMissions } from './missions.js';
import { initUI, updateUI } from './ui.js';
import { initInput, updateInput } from './input.js';
import { updateAudio, sfxChime } from './audio.js';
import { on } from './state.js';

const MAX_DT = 1 / 20; // タブ復帰時などの暴走防止

function boot() {
  const canvas = document.getElementById('game');
  state.canvas = canvas;
  state.ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));

  initScene();
  initSugar();
  initOccluders();
  initRabbit();
  initMissions();
  initUI();
  initInput(canvas);
  on('eclipse', sfxChime);

  // テスト・デバッグ用フック
  window.__game = { state, getSugarTotal };

  requestAnimationFrame(loop);
}

function resize() {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  state.dpr = dpr;
  state.W = w;
  state.H = h;
  const canvas = state.canvas;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  computeLayout();
  rebuildPancakeTexture();
  placeAtHome(true);
}

function computeLayout() {
  const { W, H } = state;
  const portrait = H >= W;
  const L = state.layout;
  L.portrait = portrait;
  if (portrait) {
    L.R = Math.min(W * 0.36, H * 0.24);
    L.cx = W * 0.5;
    L.cy = H * 0.52;
  } else {
    L.R = Math.min(W * 0.2, H * 0.3);
    L.cx = W * 0.5;
    L.cy = H * 0.55;
  }
  L.plateR = L.R * 1.32;
  L.lampX = L.cx;
  L.lampY = Math.max(H * 0.075, L.cy - L.plateR - L.R * 0.9);
}

let lastT = 0;

function loop(t) {
  const dt = clamp((t - lastT) / 1000, 0, MAX_DT);
  lastT = t;
  state.dt = dt;
  state.time += dt;
  state.frame++;

  if (state.started) update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  updateInput(dt);
  updatePancake(dt);
  updateOccluders(dt);
  updateFruits(dt);   // 影計算の前に world 座標を更新
  updateLight();
  updateButters(dt);
  updateHoneys(dt);
  updateChoc(dt);
  updateSugar(dt);
  updateScene(dt);
  updateParticles(dt);
  updateRabbit(dt);
  updateMissions(dt);
  updateAudio(dt);
  updateUI();
}

function render() {
  const ctx = state.ctx;
  drawScene(ctx);
  drawPlate(ctx);
  drawPancakeBase(ctx);
  // トッピング (影の下に描き、あとから影を落とす)
  drawHoneys(ctx);
  drawButters(ctx);
  drawChoc(ctx);
  drawSugar(ctx);
  drawFruits(ctx);
  // 光と影
  drawShadows(ctx);
  drawWarmLight(ctx);
  drawSteam(ctx);
  // 浮いているもの
  drawOccluders(ctx);
  drawCorona(ctx);
  drawLamp(ctx);
  drawParticles(ctx);
  drawRabbit(ctx);
}

boot();
