// ============================================================
// input.js — タッチ/マウス入力
// 優先順位: うさぎ > 遮蔽物 > フルーツ > 道具のアクション
// 「て」の道具でお皿をくるくる回せる (はじいて回すのも可)
// ============================================================

import {
  state, TAU, clamp, dist, worldToLocal, onPancake,
} from './state.js';
import { addButter } from './butter.js';
import { addHoney } from './honey.js';
import { beginChocStroke, addChocPoint, breakChocAt } from './choc.js';
import { sprinkleSugar, sugarPuff } from './sugar.js';
import { addFruit } from './fruits.js';
import { rabbitHit, pokeRabbit } from './rabbit.js';
import { spawnHeart, spawnSparkle } from './particles.js';
import { sfxPop, sfxDrip, sfxShaka, initAudio } from './audio.js';

// pointerId → セッション情報
const sessions = new Map();

export function initInput(canvas) {
  canvas.addEventListener('pointerdown', onDown, { passive: false });
  canvas.addEventListener('pointermove', onMove, { passive: false });
  canvas.addEventListener('pointerup', onUp, { passive: false });
  canvas.addEventListener('pointercancel', onUp, { passive: false });
}

function pos(e) {
  const rect = state.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (state.W / rect.width),
    y: (e.clientY - rect.top) * (state.H / rect.height),
  };
}

function onDown(e) {
  e.preventDefault();
  initAudio();
  if (!state.started) return;
  const p = pos(e);
  const s = { x: p.x, y: p.y, mode: null, t: state.time };
  sessions.set(e.pointerId, s);
  state.pointers.set(e.pointerId, p);
  try { state.canvas.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }

  // 1. うさぎをくすぐる
  if (rabbitHit(p.x, p.y)) {
    pokeRabbit();
    spawnHeart(p.x, p.y);
    s.mode = 'rabbit';
    return;
  }
  // 2. 遮蔽物 (クッキー / おつきさまボード)
  for (let i = state.occluders.length - 1; i >= 0; i--) {
    const oc = state.occluders[i];
    if (dist(p.x, p.y, oc.x, oc.y) < oc.r * 1.15) {
      s.mode = 'occluder';
      s.oc = oc;
      s.dx = oc.x - p.x;
      s.dy = oc.y - p.y;
      oc.grabbed = true;
      state.hintDone = true; // チュートリアルヒント完了
      sfxPop();
      return;
    }
  }
  // 3. カチカチのチョコをタップで割る
  if (breakChocAt(p.x, p.y)) {
    s.mode = 'broke';
    return;
  }
  // 4. のっているフルーツをつかむ
  const R = state.layout.R;
  for (let i = state.fruits.length - 1; i >= 0; i--) {
    const f = state.fruits[i];
    if (!f.world) continue;
    if (dist(p.x, p.y, f.world.x, f.world.y) < f.baseR * R * 1.6) {
      s.mode = 'fruit';
      s.fruit = f;
      f.grabbed = true;
      sfxPop();
      return;
    }
  }
  // 5. 道具のアクション
  startToolAction(s, p);
}

function startToolAction(s, p) {
  const tool = state.tool;
  const local = worldToLocal(p.x, p.y);
  const inside = onPancake(p.x, p.y, state.layout.R * 0.05);

  if (tool === 'hand') {
    // お皿ごとくるくる回す
    if (dist(p.x, p.y, state.layout.cx, state.layout.cy) < state.layout.plateR * 1.2) {
      s.mode = 'spin';
      s.prevAngle = pointerAngle(p);
      s.angVel = 0;
      state._spinGrab = true;
    }
    return;
  }
  if (!inside) return;

  if (tool === 'butter') {
    s.mode = 'butter';
    addButter(clampLocal(local).x, clampLocal(local).y);
    sfxPop();
  } else if (tool === 'honey') {
    s.mode = 'honey';
    s.dripT = 0;
    addHoney(clampLocal(local).x, clampLocal(local).y);
    sfxDrip();
  } else if (tool === 'choc') {
    s.mode = 'choc';
    s.stroke = beginChocStroke(local.x, local.y);
  } else if (tool === 'sugar') {
    s.mode = 'sugar';
    s.shakeT = 0;
    doSprinkle(p, local);
  } else if (tool === 'strawberry' || tool === 'blueberry' || tool === 'banana') {
    s.mode = 'fruit';
    const cl = clampLocal(local, 0.86);
    s.fruit = addFruit(tool, cl.x, cl.y);
    s.fruit.grabbed = true;
    sfxPop();
  }
}

function onMove(e) {
  const s = sessions.get(e.pointerId);
  if (!s) return;
  e.preventDefault();
  const p = pos(e);
  state.pointers.set(e.pointerId, p);
  const local = worldToLocal(p.x, p.y);

  if (s.mode === 'occluder') {
    s.oc.x = p.x + s.dx;
    s.oc.y = p.y + s.dy;
  } else if (s.mode === 'fruit') {
    const cl = clampLocal(local, 1.35);
    s.fruit.lx = cl.x;
    s.fruit.ly = cl.y;
    s.fruit.world = { x: p.x, y: p.y };
  } else if (s.mode === 'spin') {
    const a = pointerAngle(p);
    let da = a - s.prevAngle;
    if (da > Math.PI) da -= TAU;
    if (da < -Math.PI) da += TAU;
    state.rot += da;
    s.angVel = s.angVel * 0.7 + (da / Math.max(state.dt, 1 / 120)) * 0.3;
    s.prevAngle = a;
  } else if (s.mode === 'choc') {
    if (onPancake(p.x, p.y, 0)) addChocPoint(s.stroke, local.x, local.y);
  }
  s.x = p.x;
  s.y = p.y;
}

// 押しっぱなし系 (はちみつ・さとう) は毎フレーム呼ばれる
export function updateInput(dt) {
  for (const s of sessions.values()) {
    const p = { x: s.x, y: s.y };
    if (s.mode === 'honey') {
      s.dripT += dt;
      if (s.dripT > 0.3 && onPancake(p.x, p.y, 0)) {
        s.dripT = 0;
        const local = worldToLocal(p.x, p.y);
        addHoney(clampLocal(local).x, clampLocal(local).y);
        sfxDrip();
      }
    } else if (s.mode === 'sugar') {
      s.shakeT += dt;
      if (s.shakeT > 0.13 && onPancake(p.x, p.y, state.layout.R * 0.1)) {
        s.shakeT = 0;
        doSprinkle(p, worldToLocal(p.x, p.y));
      }
    }
  }
}

function doSprinkle(p, local) {
  sprinkleSugar(clamp(local.x, -0.95, 0.95), clamp(local.y, -0.95, 0.95), 1);
  sugarPuff(p.x, p.y);
  sfxShaka();
}

function onUp(e) {
  const s = sessions.get(e.pointerId);
  sessions.delete(e.pointerId);
  state.pointers.delete(e.pointerId);
  if (!s) return;
  if (s.mode === 'occluder') {
    s.oc.grabbed = false;
  } else if (s.mode === 'fruit' && s.fruit) {
    s.fruit.grabbed = false;
    const w = s.fruit.world;
    if (w) spawnSparkle(w.x, w.y, 3, '#fff0f5');
  } else if (s.mode === 'spin') {
    state._spinGrab = [...sessions.values()].some((o) => o.mode === 'spin');
    // はじいて回す
    state.spinVel = clamp(s.angVel, -6, 6);
    if (Math.abs(state.spinVel) > 0.5) state.spinning = false;
  }
}

function pointerAngle(p) {
  return Math.atan2(p.y - state.layout.cy, p.x - state.layout.cx);
}

// パンケーキの内側に収める
function clampLocal(local, max = 0.9) {
  const d = Math.hypot(local.x, local.y);
  if (d <= max) return { x: local.x, y: local.y };
  return { x: (local.x / d) * max, y: (local.y / d) * max };
}
