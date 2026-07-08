// ============================================================
// state.js — 共有状態・定数・数学ヘルパー・イベントバス
// すべてのモジュールがここを起点に状態を共有する
// ============================================================

export const TAU = Math.PI * 2;

// ---- 数学ヘルパー ----
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randPick = (arr) => arr[(Math.random() * arr.length) | 0];
export const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
};
export const dist = (x1, y1, x2, y2) => Math.sqrt(dist2(x1, y1, x2, y2));

// ---- ゲーム定数 ----
export const CONST = {
  SPIN_BASE: 0.3,            // 自動回転速度 (rad/s)
  SPIN_FRICTION: 0.94,       // 指で回した後の減衰
  AMBIENT: 0.12,             // 影の中の最低光量
  SHADOW_LIT_THRESHOLD: 0.55,  // これ以上で「ひなた」
  SHADOW_DARK_THRESHOLD: 0.42, // これ以下で「ひかげ」
  BUTTER_MAX: 9,             // バターの最大数
  HONEY_MAX: 46,             // はちみつブロブの最大数
  CHOC_MAX_POINTS: 900,      // チョコ線の最大点数
  FRUIT_MAX: 14,             // フルーツの最大数
  SUGAR_N: 112,              // 粉砂糖グリッドの解像度
  ECLIPSE_DIST: 0.22,        // 日食判定: 影中心と皿中心の距離 (R比)
};

// ---- 共有状態 ----
export const state = {
  time: 0,
  dt: 0,
  frame: 0,
  canvas: null,
  ctx: null,
  dpr: 1,
  W: 0,
  H: 0,
  // レイアウト (resize時に再計算)
  layout: {
    cx: 0, cy: 0,       // パンケーキ中心
    R: 0,               // パンケーキ半径
    plateR: 0,          // お皿半径
    lampX: 0, lampY: 0, // ランプ位置
    portrait: true,
  },
  // 回転皿
  rot: 0,
  spinVel: 0,
  spinning: true,
  totalSpin: 0,
  // 入力
  tool: 'butter',
  pointers: new Map(),
  started: false,
  soundOn: true,
  // 日食
  eclipse: 0,
  eclipseActive: false,
  // 素材
  butters: [],
  honeys: [],
  chocStrokes: [],
  fruits: [],
  occluders: [],
  // 実績カウンタ (ミッション判定用)
  counters: {
    butterMelted: 0,
    chocHardened: 0,
    sugarSprinkled: 0,
    sugarMelted: 0,
    honeyFlow: 0,
    fruitsPlaced: 0,
    eclipses: 0,
    honeyDrops: 0,
    wipes: 0,
  },
  starsEarned: 0,
  sizzleLevel: 0, // バターが溶けている強さ (音用)
};

// ---- イベントバス ----
const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, []);
  listeners.get(name).push(fn);
}

export function emit(name, data) {
  const fns = listeners.get(name);
  if (fns) for (const fn of fns) fn(data);
}

// ---- 座標変換 (パンケーキローカル座標は半径1の単位系) ----
export function localToWorld(lx, ly) {
  const { cx, cy, R } = state.layout;
  const c = Math.cos(state.rot), s = Math.sin(state.rot);
  return {
    x: cx + R * (lx * c - ly * s),
    y: cy + R * (lx * s + ly * c),
  };
}

export function worldToLocal(wx, wy) {
  const { cx, cy, R } = state.layout;
  const dx = (wx - cx) / R, dy = (wy - cy) / R;
  const c = Math.cos(-state.rot), s = Math.sin(-state.rot);
  return {
    x: dx * c - dy * s,
    y: dx * s + dy * c,
  };
}

// ワールドベクトルをローカル方向へ回す (平行移動なし)
export function worldVecToLocal(vx, vy) {
  const c = Math.cos(-state.rot), s = Math.sin(-state.rot);
  return { x: vx * c - vy * s, y: vx * s + vy * c };
}

export function onPancake(wx, wy, margin = 0) {
  const { cx, cy, R } = state.layout;
  return dist2(wx, wy, cx, cy) <= (R + margin) * (R + margin);
}
