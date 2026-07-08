/* art.js — しずくちゃん（水滴のあんないやく）などのSVGパーツ
   パステル手描き風。表情をきりかえて使う。 */
(function (global) {
  "use strict";

  // 表情ちがいのしずくちゃんを返す（SVG文字列）
  // mood: "happy" | "wink" | "wow" | "sleep" | "love"
  function shizuku(mood) {
    mood = mood || "happy";

    var eyes = {
      happy: '<circle cx="34" cy="60" r="5" fill="#5b4a63"/>' +
             '<circle cx="66" cy="60" r="5" fill="#5b4a63"/>' +
             '<circle cx="36" cy="58" r="1.6" fill="#fff"/>' +
             '<circle cx="68" cy="58" r="1.6" fill="#fff"/>',
      wink: '<path d="M29 60 q5 -6 10 0" stroke="#5b4a63" stroke-width="3.5" ' +
            'fill="none" stroke-linecap="round"/>' +
            '<circle cx="66" cy="60" r="5" fill="#5b4a63"/>' +
            '<circle cx="68" cy="58" r="1.6" fill="#fff"/>',
      wow: '<circle cx="34" cy="59" r="6.5" fill="#5b4a63"/>' +
           '<circle cx="66" cy="59" r="6.5" fill="#5b4a63"/>' +
           '<circle cx="36" cy="56.5" r="2" fill="#fff"/>' +
           '<circle cx="68" cy="56.5" r="2" fill="#fff"/>',
      sleep: '<path d="M28 60 q6 5 12 0" stroke="#5b4a63" stroke-width="3.5" ' +
             'fill="none" stroke-linecap="round"/>' +
             '<path d="M60 60 q6 5 12 0" stroke="#5b4a63" stroke-width="3.5" ' +
             'fill="none" stroke-linecap="round"/>',
      love: '<path d="M30 62 l4 -5 4 5 -4 5z" fill="#ff7fb0"/>' +
            '<path d="M62 62 l4 -5 4 5 -4 5z" fill="#ff7fb0"/>'
    };

    var mouth = {
      happy: '<path d="M42 72 q8 9 16 0" stroke="#5b4a63" stroke-width="3.5" ' +
             'fill="none" stroke-linecap="round"/>',
      wink: '<path d="M42 72 q8 9 16 0" stroke="#5b4a63" stroke-width="3.5" ' +
            'fill="none" stroke-linecap="round"/>',
      wow: '<ellipse cx="50" cy="75" rx="6" ry="7" fill="#5b4a63"/>',
      sleep: '<path d="M45 74 q5 4 10 0" stroke="#5b4a63" stroke-width="3" ' +
             'fill="none" stroke-linecap="round"/>',
      love: '<path d="M40 71 q10 12 20 0" stroke="#5b4a63" stroke-width="3.5" ' +
            'fill="none" stroke-linecap="round"/>'
    };

    return '' +
      '<svg viewBox="0 0 100 118" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<radialGradient id="drop-g" cx="38%" cy="30%" r="75%">' +
            '<stop offset="0%" stop-color="#e8f7ff"/>' +
            '<stop offset="60%" stop-color="#a9d4ff"/>' +
            '<stop offset="100%" stop-color="#7cb8f5"/>' +
          '</radialGradient>' +
        '</defs>' +
        // しずくの体
        '<path d="M50 6 C50 6 90 55 90 80 A40 40 0 0 1 10 80 ' +
          'C10 55 50 6 50 6 Z" fill="url(#drop-g)" ' +
          'stroke="#ffffff" stroke-width="4"/>' +
        // ハイライト
        '<ellipse cx="36" cy="42" rx="9" ry="13" fill="#ffffff" ' +
          'opacity="0.6" transform="rotate(-18 36 42)"/>' +
        // ほっぺ
        '<circle cx="26" cy="72" r="6" fill="#ffb7d5" opacity="0.7"/>' +
        '<circle cx="74" cy="72" r="6" fill="#ffb7d5" opacity="0.7"/>' +
        eyes[mood] + mouth[mood] +
      '</svg>';
  }

  // タイトル用のしずくちゃん＋けんびきょう
  function titleArt() {
    return '' +
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
        '<ellipse cx="100" cy="180" rx="70" ry="12" fill="#d9c7e6" opacity="0.5"/>' +
        // けんびきょう（かんたん）
        '<rect x="120" y="70" width="16" height="90" rx="8" fill="#c9b6ff"/>' +
        '<rect x="98" y="150" width="70" height="16" rx="8" fill="#b39cf5"/>' +
        '<rect x="122" y="60" width="40" height="20" rx="10" fill="#a9d4ff" ' +
          'transform="rotate(-18 142 70)"/>' +
        '<circle cx="150" cy="52" r="12" fill="#fff" stroke="#a9d4ff" stroke-width="4"/>' +
        // しずくちゃん
        '<g transform="translate(20 46) scale(1.1)">' + shizuku("happy") + '</g>' +
      '</svg>';
  }

  var Art = {
    shizuku: shizuku,
    titleArt: titleArt,
    // DOM要素にSVGをはめる
    set: function (el, svg) {
      if (el) el.innerHTML = svg;
    }
  };

  global.Art = Art;
})(window);
