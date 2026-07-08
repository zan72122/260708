// ============================================================
// hint.js — 初回チュートリアルヒント
// ゲーム開始から数秒たっても遮蔽物を動かしていないとき、
// 「クッキーをパンケーキへ」の指アニメと点線を表示する
// ============================================================

import { state, TAU, clamp, on, emit } from './state.js';

const hint = {
  startedAt: -1,
  visible: 0,     // フェード 0..1
};

const SHOW_AFTER = 5;   // 開始から何秒後に出すか
const LOOP = 2.6;       // 指アニメの周期

export function initHint() {
  on('gameStarted', () => { hint.startedAt = state.time; });
}

export function updateHint(dt) {
  const want =
    !state.hintDone &&
    hint.startedAt >= 0 &&
    state.time - hint.startedAt > SHOW_AFTER &&
    state.pointers.size === 0;
  hint.visible += ((want ? 1 : 0) - hint.visible) * clamp(dt * 4, 0, 1);
  // 初表示のタイミングでうさぎがひとこと
  if (want && !hint.spoke) {
    hint.spoke = true;
    emit('hintShow', {});
  }
}

export function drawHint(ctx) {
  if (hint.visible <= 0.02 || state.hintDone) return;
  const cookie = state.occluders.find((o) => o.kind === 'cookie');
  if (!cookie || cookie.grabbed) return;
  const { cx, cy, R } = state.layout;
  const from = { x: cookie.x, y: cookie.y };
  const to = { x: cx, y: cy - R * 0.05 };
  const t = (state.time % LOOP) / LOOP;
  // イージング: ゆっくり出発してスッと到着、最後は少し停止
  const move = clamp(t / 0.72, 0, 1);
  const e = move * move * (3 - 2 * move);
  // ふわっと山なりに動く
  const px = from.x + (to.x - from.x) * e;
  const py = from.y + (to.y - from.y) * e - Math.sin(e * Math.PI) * R * 0.35;
  const alpha = hint.visible * (t > 0.9 ? (1 - t) * 10 : 1);

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  // 点線の道
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 10]);
  ctx.lineDashOffset = -state.time * 30;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(
    (from.x + to.x) / 2, Math.min(from.y, to.y) - R * 0.5,
    to.x, to.y
  );
  ctx.stroke();
  ctx.setLineDash([]);
  // 行き先の的 (どこへ置くか)
  const ringPulse = 1 + 0.12 * Math.sin(state.time * 5);
  ctx.strokeStyle = 'rgba(255,240,170,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(to.x, to.y, R * 0.2 * ringPulse, 0, TAU);
  ctx.stroke();
  // うごく指
  const s = Math.min(state.W, state.H) * 0.075;
  ctx.font = `${s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const press = t > 0.05 && t < 0.72 ? 0.92 : 1; // つかんでいる間は少し縮む
  ctx.save();
  ctx.translate(px + s * 0.3, py + s * 0.55);
  ctx.scale(press, press);
  ctx.fillText('👆', 0, 0);
  ctx.restore();
  ctx.restore();
}
