/* audio.js — やさしいBGM＋タップ効果音（Web Audio APIで生成、外部ファイル不要）
   4歳児がおどろかないよう、音量はひかえめ・やわらかい音色にしている。 */
(function (global) {
  "use strict";

  var ctx = null;
  var master = null;
  var bgmGain = null;
  var bgmTimer = null;
  var enabled = true;
  var started = false;

  // ドレミ…のやさしい音階（Cメジャー・ペンタトニック）
  var SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  // ゆったりした子もり唄ふうのメロディ（音階のインデックス）
  var MELODY = [0, 2, 4, 2, 3, 1, 0, 1, 2, 4, 3, 2, 1, 0, 2, 0];
  var melodyPos = 0;

  function ensureCtx() {
    if (ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.0;
    bgmGain.connect(master);
  }

  // やわらかい単音（三角波＋ゆるいエンベロープ）
  function playTone(freq, dur, dest, vol, type) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function stepBgm() {
    if (!ctx || !enabled) return;
    var idx = MELODY[melodyPos % MELODY.length];
    melodyPos++;
    var freq = SCALE[idx];
    playTone(freq, 1.1, bgmGain, 0.16, "sine");
    // ときどきハーモニーをそえる
    if (melodyPos % 4 === 0) {
      playTone(freq / 2, 1.4, bgmGain, 0.1, "triangle");
    }
  }

  function startBgm() {
    if (!ctx || bgmTimer) return;
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.setTargetAtTime(enabled ? 1.0 : 0.0, ctx.currentTime, 0.6);
    stepBgm();
    bgmTimer = setInterval(stepBgm, 620);
  }

  var Sound = {
    // 最初のユーザー操作で呼ぶ（ブラウザの自動再生制限対策）
    unlock: function () {
      ensureCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      if (!started) {
        started = true;
        startBgm();
      }
    },
    tap: function () {
      if (!enabled || !ctx) return;
      playTone(880, 0.14, master, 0.28, "sine");
      playTone(1320, 0.1, master, 0.14, "sine");
    },
    plop: function () {
      // 液体につけた「ぽちゃん」
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.3);
    },
    sparkle: function () {
      // できあがり・保存のキラキラ
      if (!enabled || !ctx) return;
      var notes = [659.25, 783.99, 1046.5, 1318.5];
      notes.forEach(function (f, i) {
        setTimeout(function () { playTone(f, 0.28, master, 0.22, "sine"); }, i * 90);
      });
    },
    step: function () {
      // 工程がすすんだ合図
      if (!enabled || !ctx) return;
      playTone(659.25, 0.16, master, 0.24, "triangle");
      setTimeout(function () { playTone(987.77, 0.2, master, 0.2, "triangle"); }, 110);
    },
    toggle: function () {
      enabled = !enabled;
      ensureCtx();
      if (ctx && bgmGain) {
        bgmGain.gain.setTargetAtTime(enabled ? 1.0 : 0.0, ctx.currentTime, 0.3);
      }
      if (enabled && !started) this.unlock();
      return enabled;
    },
    isEnabled: function () { return enabled; }
  };

  global.Sound = Sound;
})(window);
