// ============================================================
// ui.js — DOMのUI: どうぐバー・ボタン・ミッションカード・ほし
// ============================================================

import { state, on, emit } from './state.js';
import { clearChoc } from './choc.js';
import { clearSugar } from './sugar.js';
import { clearParticles, spawnSparkle } from './particles.js';
import { currentMission, getStars } from './missions.js';
import { placeAtHome } from './occluders.js';
import { setSoundOn, initAudio, sfxSpin, sfxWipe, sfxPop } from './audio.js';

const TOOLS = [
  { id: 'hand', icon: '✋', label: 'くるくる' },
  { id: 'butter', icon: '🧈', label: 'バター' },
  { id: 'honey', icon: '🍯', label: 'はちみつ' },
  { id: 'choc', icon: '🍫', label: 'チョコ' },
  { id: 'sugar', icon: '🧂', label: 'おさとう' },
  { id: 'strawberry', icon: '🍓', label: 'いちご' },
  { id: 'blueberry', icon: '🫐', label: 'ベリー' },
  { id: 'banana', icon: '🍌', label: 'バナナ' },
];

export function initUI() {
  buildToolbar();
  wireButtons();
  wireMissionCard();
  updateMissionCard();
}

function buildToolbar() {
  const bar = document.getElementById('toolbar');
  for (const t of TOOLS) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn' + (t.id === state.tool ? ' active' : '');
    btn.id = 'tool-' + t.id;
    btn.setAttribute('aria-label', t.label);
    btn.innerHTML = `<span class="tool-icon">${t.icon}</span><span class="tool-label">${t.label}</span>`;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      selectTool(t.id);
    });
    bar.appendChild(btn);
  }
}

function selectTool(id) {
  state.tool = id;
  sfxPop();
  document.querySelectorAll('.tool-btn').forEach((b) => {
    b.classList.toggle('active', b.id === 'tool-' + id);
  });
}

function wireButtons() {
  const startBtn = document.getElementById('btn-start');
  startBtn.addEventListener('pointerup', () => {
    initAudio();
    state.started = true;
    document.getElementById('screen-title').classList.remove('is-active');
    document.getElementById('hud').classList.add('on');
    emit('gameStarted', {});
  });

  document.getElementById('btn-spin').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    state.spinning = !state.spinning;
    if (!state.spinning) state.spinVel *= 0.4;
    sfxSpin();
    updateSpinButton();
  });

  document.getElementById('btn-clean').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    wipeAll();
  });

  for (const id of ['btn-sound', 'btn-sound-title']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      initAudio();
      setSoundOn(!state.soundOn);
      updateSoundButtons();
    });
  }
}

function wipeAll() {
  state.butters.length = 0;
  state.honeys.length = 0;
  state.fruits.length = 0;
  clearChoc();
  clearSugar();
  clearParticles();
  placeAtHome(true);
  state.counters.wipes++;
  const { cx, cy, R } = state.layout;
  spawnSparkle(cx, cy, 24, '#ffffff');
  spawnSparkle(cx - R * 0.5, cy, 10, '#ffe9f0');
  spawnSparkle(cx + R * 0.5, cy, 10, '#e9f4ff');
  sfxWipe();
  emit('wipe', {});
}

function updateSpinButton() {
  const b = document.getElementById('btn-spin');
  b.classList.toggle('active', state.spinning);
}

function updateSoundButtons() {
  for (const id of ['btn-sound', 'btn-sound-title']) {
    const el = document.getElementById(id);
    if (el) el.textContent = state.soundOn ? '🔊' : '🔇';
  }
}

// ---- ミッションカード ----
function wireMissionCard() {
  on('missionProgress', updateMissionCard);
  on('missionChanged', updateMissionCard);
  on('missionDone', () => {
    const card = document.getElementById('mission-card');
    card.classList.add('done');
    updateMissionCard();
    setTimeout(() => card.classList.remove('done'), 2600);
  });
}

function updateMissionCard() {
  const m = currentMission();
  document.getElementById('mission-icon').textContent = m.icon;
  document.getElementById('mission-text').textContent = m.done ? 'できた!! すごい!' : m.text;
  const dots = document.getElementById('mission-dots');
  dots.innerHTML = '';
  if (m.goal > 1) {
    for (let i = 0; i < m.goal; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < m.progress || m.done ? ' filled' : '');
      dots.appendChild(d);
    }
  }
  document.getElementById('star-count').textContent = String(getStars());
}

// 毎フレームのDOM更新は差分があるときだけ (軽量)
let lastStars = -1;
let lastSpinning = null;
export function updateUI() {
  const s = getStars();
  if (s !== lastStars) {
    lastStars = s;
    document.getElementById('star-count').textContent = String(s);
  }
  // はじいて回したときなど、回転状態の変化をボタンに反映
  if (state.spinning !== lastSpinning) {
    lastSpinning = state.spinning;
    document.getElementById('btn-spin').classList.toggle('active', state.spinning);
  }
}
