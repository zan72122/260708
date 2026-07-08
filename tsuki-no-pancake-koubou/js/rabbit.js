// ============================================================
// rabbit.js — 月うさぎの「もちた」: 工房の店長。
// できごとに反応してぴょんと跳ね、ひらがなでおしゃべりする
// ============================================================

import { state, TAU, clamp, rand, randPick, on } from './state.js';
import { sfxYay } from './audio.js';

const rabbit = {
  jump: 0,       // 跳ねアニメ 0..1
  blink: 0,
  blinkTimer: 2,
  earWiggle: 0,
  speech: '',
  speechT: 0,
  mood: 'normal', // normal | happy | wow
  moodT: 0,
  queue: [],
};

const REACTIONS = {
  butterPlaced: ['バターだ!', 'ぺたん!'],
  butterMelted: ['じゅわ〜っ!', 'とけたね!', 'きんいろだ!'],
  honeyPlaced: ['はちみつ とろ〜り', 'あまいよ〜'],
  honeyFlowed: ['ながれてる!', 'あったかいほうへ いくんだね'],
  chocHardened: ['カチカチだ!', 'かげで かたまったよ!'],
  chocBroken: ['パキッ! おいしそう!', 'われた〜!', 'ぱくって たべたい!'],
  hintShow: ['クッキーを おさらに かざしてみて!'],
  sugarSprinkled: ['ふわふわ〜', 'ゆきみたい!'],
  fruitLanded: ['おいしそう!', 'かわいいね!'],
  eclipse: ['にっしょくだー!!', 'おひさまが かくれた!'],
  missionDone: ['やったね!!', 'すごい すごい!', 'てんさいだ!'],
  wipe: ['ぴかぴか〜', 'つぎは なにつくる?'],
};

export function initRabbit() {
  for (const [ev, lines] of Object.entries(REACTIONS)) {
    on(ev, () => react(ev, lines));
  }
}

let lastReact = 0;
function react(ev, lines) {
  const now = state.time;
  const important = ev === 'eclipse' || ev === 'missionDone';
  if (!important && now - lastReact < 3.5) return;
  lastReact = now;
  rabbit.speech = randPick(lines);
  rabbit.speechT = important ? 3.2 : 2.4;
  rabbit.jump = 1;
  rabbit.mood = important ? 'wow' : 'happy';
  rabbit.moodT = 2;
  if (important) sfxYay();
}

export function pokeRabbit() {
  rabbit.jump = 1;
  rabbit.speech = randPick(['きゃはは!', 'くすぐったい!', 'こんばんは!']);
  rabbit.speechT = 1.8;
  rabbit.mood = 'happy';
  rabbit.moodT = 1.5;
  sfxYay();
}

export function updateRabbit(dt) {
  if (rabbit.jump > 0) rabbit.jump = Math.max(0, rabbit.jump - dt * 2.2);
  if (rabbit.speechT > 0) rabbit.speechT -= dt;
  if (rabbit.moodT > 0) { rabbit.moodT -= dt; if (rabbit.moodT <= 0) rabbit.mood = 'normal'; }
  rabbit.blinkTimer -= dt;
  if (rabbit.blinkTimer <= 0) {
    rabbit.blink = 0.14;
    rabbit.blinkTimer = rand(1.8, 4.5);
  }
  if (rabbit.blink > 0) rabbit.blink -= dt;
  rabbit.earWiggle = Math.sin(state.time * 2.2) * 0.06 + (rabbit.jump > 0 ? Math.sin(state.time * 22) * 0.12 * rabbit.jump : 0);
}

// うさぎの当たり判定 (タップでくすぐる)
export function rabbitHit(x, y) {
  const p = rabbitPos();
  return Math.hypot(x - p.x, y - (p.y - p.s)) < p.s * 1.6;
}

function rabbitPos() {
  const { W, H, layout } = state;
  const s = Math.min(W, H) * 0.055;
  if (layout.portrait) {
    return { x: W * 0.13, y: layout.cy - layout.plateR * 1.06, s };
  }
  // 横画面: 左上 (左中央は月ボードのおきばと重なる)
  return { x: W * 0.08, y: H * 0.3, s };
}

export function drawRabbit(ctx) {
  const p = rabbitPos();
  const { x, s } = p;
  const hop = Math.sin(Math.min(1, rabbit.jump) * Math.PI) * s * 1.1;
  const y = p.y - hop;
  const sq = 1 + (rabbit.jump > 0.5 ? (rabbit.jump - 0.5) * 0.3 : 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 / sq, sq);
  // からだ
  ctx.fillStyle = '#f6f2ee';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 1.05, s * 0.9, 0, 0, TAU);
  ctx.fill();
  // あたま
  ctx.beginPath();
  ctx.ellipse(0, -s * 1.05, s * 0.82, s * 0.75, 0, 0, TAU);
  ctx.fill();
  // みみ
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * s * 0.38, -s * 1.6);
    ctx.rotate(side * (0.18 + rabbit.earWiggle));
    ctx.fillStyle = '#f6f2ee';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.55, s * 0.26, s * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffc9d6';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.5, s * 0.13, s * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // かお
  const blink = rabbit.blink > 0;
  ctx.fillStyle = '#3a2e33';
  for (const side of [-1, 1]) {
    if (blink) {
      ctx.fillRect(side * s * 0.3 - s * 0.1, -s * 1.1, s * 0.2, s * 0.05);
    } else if (rabbit.mood === 'wow') {
      ctx.beginPath();
      ctx.arc(side * s * 0.3, -s * 1.1, s * 0.13, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(side * s * 0.33, -s * 1.14, s * 0.05, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3a2e33';
    } else {
      ctx.beginPath();
      ctx.arc(side * s * 0.3, -s * 1.1, s * 0.09, 0, TAU);
      ctx.fill();
    }
  }
  // ほっぺ
  ctx.fillStyle = 'rgba(255,160,180,0.55)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * s * 0.5, -s * 0.9, s * 0.16, s * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  // くち
  ctx.strokeStyle = '#3a2e33';
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (rabbit.mood === 'normal') {
    ctx.arc(0, -s * 0.92, s * 0.1, 0.2, Math.PI - 0.2);
  } else {
    ctx.arc(0, -s * 0.95, s * 0.16, 0.15, Math.PI - 0.15);
  }
  ctx.stroke();
  // コックさんの帽子
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(0, -s * 1.75, s * 0.5, s * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -s * 2.0, s * 0.42, s * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ふきだし
  if (rabbit.speechT > 0 && rabbit.speech) {
    drawSpeech(ctx, x, y - s * 2.6, rabbit.speech, clamp(rabbit.speechT * 3, 0, 1), s);
  }
}

function drawSpeech(ctx, x, y, text, alpha, s) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const fs = Math.max(13, s * 0.62);
  ctx.font = `bold ${fs}px 'Hiragino Maru Gothic ProN', 'BIZ UDGothic', sans-serif`;
  const w = ctx.measureText(text).width + fs * 1.4;
  const h = fs * 2;
  let bx = clamp(x - w * 0.3, 6, state.W - w - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = '#e8b4c8';
  ctx.lineWidth = 2;
  roundRectPath(ctx, bx, y - h, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  // しっぽ
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 8);
  ctx.lineTo(x + 10, y - 2);
  ctx.lineTo(x - 14, y - 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.fillStyle = '#8a4a63';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, y - h / 2 + 1);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
