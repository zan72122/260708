/* staining.js — 7つの要素から「微妙な仕上がり」を計算する
   成功／失敗ではなく、いろあいや雰囲気のちがいを表現する。

   受けとる params（すべて 0.0〜1.0 に正規化ずみ）:
     hematoxylin : ヘマトキシリン時間（核のむらさきの こさ）
     differentiate: 分別時間（色をもどす → 核をうすく）
     bluing      : ブルーイング（あお寄りにする）
     eosin       : エオジン時間（さいぼうしつのピンク）
     dehydTime   : 脱水時間
     dehydSuff   : 脱水の十分さ（くっきり具合）
     water       : 水質（きれいな水ほど発色がすなお）
*/
(function (global) {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function hsl(h, s, l) {
    return "hsl(" + Math.round(h) + "," + Math.round(s) + "%," + Math.round(l) + "%)";
  }

  // 中心をやわらかく丸めるカーブ（極端値をおさえて“微妙”に寄せる）
  function soft(v) { return clamp(0.12 + v * 0.76, 0, 1); }

  function compute(p) {
    var hema = soft(p.hematoxylin);
    var diff = soft(p.differentiate);
    var blu = soft(p.bluing);
    var eos = soft(p.eosin);
    var dehydT = soft(p.dehydTime);
    var dehydS = soft(p.dehydSuff);
    var water = soft(p.water);

    // ---- 核（ヘマトキシリン）----
    // 分別で色がもどるぶん、こさを少しさげる
    var nucInt = clamp(hema * (1 - 0.5 * diff), 0.05, 1);
    // あお寄り度：ブルーイングと水質でうごく
    var blueness = clamp(blu * 0.72 + water * 0.28, 0, 1);
    var nucHue = lerp(292, 220, blueness); // むらさき⇔あお
    var nucSat = lerp(48, 74, nucInt);
    var nucLight = lerp(80, 32, nucInt);
    // 水質がわるいと少しにごる（彩度おとす）
    nucSat *= lerp(0.82, 1.0, water);

    // ---- さいぼうしつ（エオジン）----
    var cytoHue = lerp(352, 342, eos); // ピンク〜赤より
    var cytoSat = lerp(30, 76, eos);
    var cytoLight = lerp(93, 63, eos);

    // ---- せかい全体（背景・くっきり具合）----
    // 脱水が足りないと白っぽいモヤ（haze）が出る
    var haze = clamp((1 - dehydS) * 0.6 + (1 - dehydT) * 0.25, 0, 0.7);
    // コントラスト（くっきり）
    var contrast = clamp(0.45 + dehydS * 0.5 + dehydT * 0.1, 0.3, 1);
    // 背景はエオジンのうすいにじみ
    var bgHue = 350;
    var bgSat = lerp(12, 34, eos);
    var bgLight = lerp(96, 90, eos) - haze * 6;

    return {
      params: p,
      nucleus: hsl(nucHue, nucSat, nucLight),
      nucleusDark: hsl(nucHue, nucSat, clamp(nucLight - 12, 12, 90)),
      cytoplasm: hsl(cytoHue, cytoSat, cytoLight),
      background: hsl(bgHue, bgSat, bgLight),
      nucInt: nucInt,
      blueness: blueness,
      eosInt: eos,
      haze: haze,
      contrast: contrast
    };
  }

  // 仕上がりに、やさしい名前と雰囲気タグをつける（すべて肯定的）
  function describe(res) {
    var tags = [];

    // 色みのかたむき
    if (res.blueness > 0.62) tags.push("💙 あおめ");
    else if (res.blueness < 0.4) tags.push("💜 むらさきめ");
    else tags.push("🩵 バランス");

    // ピンクのつよさ
    if (res.eosInt > 0.6) tags.push("🌸 ピンクつよめ");
    else if (res.eosInt < 0.38) tags.push("🤍 やさしいいろ");
    else tags.push("🌷 ちょうどピンク");

    // くっきり／ふんわり
    if (res.contrast > 0.78) tags.push("✨ くっきり");
    else if (res.haze > 0.4) tags.push("☁ ふんわり");
    else tags.push("🍃 しっとり");

    // なまえ（いろあいの組み合わせで）
    var base;
    if (res.blueness > 0.6 && res.eosInt > 0.55) base = "あおぞらチェリー";
    else if (res.blueness > 0.6) base = "そらいろひょうほん";
    else if (res.blueness < 0.4 && res.eosInt > 0.55) base = "すみれモモいろ";
    else if (res.eosInt > 0.6) base = "いちごミルク";
    else if (res.eosInt < 0.38) base = "わたあめいろ";
    else if (res.haze > 0.45) base = "ゆめみるくもり";
    else base = "はるのおはな";

    return { name: base, tags: tags };
  }

  global.Staining = {
    compute: compute,
    describe: describe,
    clamp: clamp,
    lerp: lerp
  };
})(window);
