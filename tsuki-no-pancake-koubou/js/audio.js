// ============================================================
// audio.js — WebAudioで全部その場で合成する効果音とオルゴールBGM
// 音源ファイル不要。iOSのため最初のタップで initAudio() を呼ぶ
// ============================================================

import { state, rand, clamp } from './state.js';

let ac = null;
let master = null;
let bgmGain = null;
let sizzleNode = null;
let sizzleGain = null;
let bgmTimer = null;

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.8;
  master.connect(ac.destination);
  bgmGain = ac.createGain();
  bgmGain.gain.value = 0.16;
  bgmGain.connect(master);
  startSizzleLoop();
  startBgm();
}

export function setSoundOn(on) {
  state.soundOn = on;
  if (master) master.gain.value = on ? 0.8 : 0;
}

const ok = () => ac && state.soundOn;

// ---- 汎用トーン ----
function tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, slide = 0 } = {}) {
  if (!ok()) return;
  const t0 = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// オルゴール風の澄んだ音
function bell(freq, dur = 1.2, vol = 0.1, at = 0) {
  if (!ok()) return;
  const t0 = ac.currentTime + at;
  for (const [mult, v] of [[1, 1], [2.76, 0.28], [5.4, 0.1]]) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(vol * v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(bgmGain);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
}

// ノイズバースト
function noise(dur, { vol = 0.15, freq = 2000, q = 1, at = 0 } = {}) {
  if (!ok()) return;
  const t0 = ac.currentTime + at;
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// ---- 効果音 ----
export function sfxPop() { // 何かを置いた
  tone(rand(500, 640), 0.12, { type: 'sine', vol: 0.22, slide: 260 });
}

export function sfxDrip() { // はちみつ
  tone(rand(700, 850), 0.22, { type: 'sine', vol: 0.16, slide: -420 });
}

export function sfxShaka() { // 粉砂糖
  noise(0.09, { vol: 0.11, freq: rand(5000, 7500), q: 0.8 });
}

export function sfxCrack() { // チョコが固まる
  noise(0.05, { vol: 0.14, freq: 2600, q: 3 });
  tone(rand(1050, 1250), 0.1, { type: 'triangle', vol: 0.12 });
}

export function sfxChime() { // 日食
  const base = 523.25;
  [1, 1.25, 1.5, 2].forEach((m, i) => bell(base * m, 1.6, 0.14, i * 0.16));
}

export function sfxFanfare() { // ミッション達成
  const seq = [523.25, 659.25, 783.99, 1046.5];
  seq.forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.16, at: i * 0.12 }));
  seq.forEach((f, i) => bell(f, 1, 0.1, i * 0.12 + 0.05));
}

export function sfxWipe() { // おそうじ
  noise(0.35, { vol: 0.1, freq: 1200, q: 0.6 });
  tone(300, 0.3, { type: 'sine', vol: 0.08, slide: 500 });
}

export function sfxSpin() { // 回転トグル
  tone(392, 0.15, { type: 'triangle', vol: 0.14, slide: 200 });
}

export function sfxYay() { // ほめ
  [659.25, 783.99, 987.77].forEach((f, i) =>
    tone(f, 0.2, { type: 'sine', vol: 0.12, at: i * 0.08 }));
}

// ---- バターのじゅわじゅわ (連続音・強さは state.sizzleLevel) ----
function startSizzleLoop() {
  const len = ac.sampleRate * 1.5;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.06 ? 1 : 0.25);
  }
  sizzleNode = ac.createBufferSource();
  sizzleNode.buffer = buf;
  sizzleNode.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 3200;
  sizzleGain = ac.createGain();
  sizzleGain.gain.value = 0;
  sizzleNode.connect(f).connect(sizzleGain).connect(master);
  sizzleNode.start();
}

export function updateAudio(dt) {
  if (!ac || !sizzleGain) return;
  const target = state.soundOn ? clamp(state.sizzleLevel, 0, 1) * 0.12 : 0;
  const cur = sizzleGain.gain.value;
  sizzleGain.gain.value = cur + (target - cur) * clamp(dt * 6, 0, 1);
}

// ---- BGM: ゆったりペンタトニックのオルゴール ----
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
let bgmStep = 0;

function startBgm() {
  if (bgmTimer) return;
  const stepDur = 0.42;
  bgmTimer = setInterval(() => {
    if (!ok()) return;
    bgmStep++;
    // ゆらぎのあるメロディ
    if (bgmStep % 2 === 0) {
      const n = SCALE[(bgmStep / 2 + ((bgmStep * 7) % 3)) % SCALE.length | 0];
      bell(n * (Math.random() < 0.15 ? 0.5 : 1), 1.8, 0.09);
    }
    // ベース
    if (bgmStep % 8 === 0) bell(130.81, 3, 0.07);
    if (bgmStep % 8 === 4) bell(98, 3, 0.06);
  }, stepDur * 1000);
}
