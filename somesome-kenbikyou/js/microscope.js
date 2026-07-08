/* microscope.js — 顕微鏡ビュー。染めた標本を canvas に描く。
   同じシード＋色なら同じ絵。あそぶたびシードが変わるので毎回すこしちがう模様になる。 */
(function (global) {
  "use strict";

  // 種つき乱数（mulberry32）— 保存した種から同じ絵を再現できる
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // まるっこい細胞のかたまりをひとつ描く
  function drawCell(ctx, x, y, r, res, rand) {
    // さいぼうしつ（外がわ・やわらかい輪郭）
    ctx.save();
    ctx.beginPath();
    var pts = 9;
    for (var i = 0; i <= pts; i++) {
      var a = (i / pts) * Math.PI * 2;
      var rr = r * (0.82 + rand() * 0.36);
      var px = x + Math.cos(a) * rr;
      var py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = res.cytoplasm;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();

    // 核（ヘマトキシリン）— 中心よりすこしずらす
    var nx = x + (rand() - 0.5) * r * 0.5;
    var ny = y + (rand() - 0.5) * r * 0.5;
    var nr = r * (0.34 + rand() * 0.16);
    var grad = ctx.createRadialGradient(nx, ny, nr * 0.2, nx, ny, nr);
    grad.addColorStop(0, res.nucleusDark);
    grad.addColorStop(1, res.nucleus);
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.94;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // res: staining.compute の結果, seed: 整数
  function render(canvas, res, seed) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var rand = rng(seed);

    // 背景（うすいエオジンのにじみ）
    ctx.clearRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.62);
    bg.addColorStop(0, res.background);
    bg.addColorStop(1, res.cytoplasm);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // 細胞をならべる（円形視野の中だけ）
    var cx = W / 2, cy = H / 2, R = W * 0.46;
    var base = W * 0.085;
    var count = 46;
    for (var i = 0; i < count; i++) {
      var ang = rand() * Math.PI * 2;
      var dist = Math.sqrt(rand()) * R * 0.94;
      var x = cx + Math.cos(ang) * dist;
      var y = cy + Math.sin(ang) * dist;
      var r = base * (0.6 + rand() * 0.9);
      // コントラストが低いと重なりがぼやける表現：少し小さめ＆うすめ
      ctx.globalAlpha = 0.75 + res.contrast * 0.25;
      drawCell(ctx, x, y, r, res, rand);
    }
    ctx.globalAlpha = 1;

    // 脱水不足のモヤ（haze）— 白っぽいベール
    if (res.haze > 0.02) {
      ctx.save();
      ctx.globalAlpha = res.haze * 0.7;
      var hz = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
      hz.addColorStop(0, "rgba(255,255,255,0.2)");
      hz.addColorStop(1, "rgba(255,255,255,0.85)");
      ctx.fillStyle = hz;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 円形視野のフチをまるくきりぬく
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();
  }

  global.Microscope = { render: render };
})(window);
