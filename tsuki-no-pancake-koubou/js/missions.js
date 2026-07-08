// ============================================================
// missions.js — うさぎからの「おねがい」ミッション
// 失敗なし。できたら星と紙ふぶきでおいわい。ぐるぐる循環する
// ============================================================

import { state, emit } from './state.js';
import { spawnConfetti } from './particles.js';
import { sfxFanfare } from './audio.js';

// check(c, b) は 現在の counters と 開始時スナップショット b から
// ミッション開始後の達成数(0..goal)を返す
const delta = (c, b, key) => Math.max(0, c[key] - b[key]);

const MISSIONS = [
  {
    id: 'butter',
    icon: '🧈',
    text: 'ひかりで バターを とかそう',
    goal: 1,
    check: (c, b) => delta(c, b, 'butterMelted'),
  },
  {
    id: 'strawberry',
    icon: '🍓',
    text: 'いちごを 3こ のせよう',
    goal: 3,
    check: (c, b) => delta(c, b, 'fruitsPlaced'),
  },
  {
    id: 'choc',
    icon: '🍫',
    text: 'かげで チョコを カチカチに しよう',
    goal: 10,
    check: (c, b) => delta(c, b, 'chocHardened'),
  },
  {
    id: 'honey',
    icon: '🍯',
    text: 'はちみつを あたたかいほうへ ながそう',
    goal: 1,
    check: (c, b) => delta(c, b, 'honeyFlow'),
  },
  {
    id: 'sugar',
    icon: '❄️',
    text: 'こなざとうで かげの かたちを のこそう',
    goal: 3,
    check: (c, b) =>
      Math.min(delta(c, b, 'sugarSprinkled'), delta(c, b, 'sugarMelted') > 1.2 ? 3 : 0),
  },
  {
    id: 'eclipse',
    icon: '🌑',
    text: 'クッキーで にっしょくを つくろう',
    goal: 1,
    check: (c, b) => delta(c, b, 'eclipses'),
  },
];

const mission = {
  index: 0,
  baseline: null,   // 開始時のカウンタのスナップショット
  progress: 0,
  done: false,
  doneTimer: 0,
  roundsCleared: 0,
};

function snapshot() {
  return { ...state.counters };
}

export function initMissions() {
  mission.baseline = snapshot();
}

export function currentMission() {
  const def = MISSIONS[mission.index % MISSIONS.length];
  return { ...def, progress: mission.progress, done: mission.done };
}

export function updateMissions(dt) {
  const def = MISSIONS[mission.index % MISSIONS.length];
  if (mission.done) {
    mission.doneTimer -= dt;
    if (mission.doneTimer <= 0) {
      mission.index++;
      mission.baseline = snapshot();
      mission.progress = 0;
      mission.done = false;
      if (mission.index % MISSIONS.length === 0) mission.roundsCleared++;
      emit('missionChanged', currentMission());
    }
    return;
  }
  const p = Math.min(def.goal, def.check(state.counters, mission.baseline));
  if (p !== mission.progress) {
    mission.progress = p;
    emit('missionProgress', currentMission());
  }
  if (p >= def.goal) {
    mission.done = true;
    mission.doneTimer = 3.0;
    state.starsEarned++;
    sfxFanfare();
    const { cx, cy } = state.layout;
    spawnConfetti(cx, cy - state.layout.R * 0.5, 40);
    emit('missionDone', currentMission());
  }
}

export function getStars() {
  return state.starsEarned;
}
