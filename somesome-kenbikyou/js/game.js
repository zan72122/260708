/* game.js — ゲーム進行のまとめ役
   画面きりかえ・工程の操作（ドラッグ＋長おし／えらぶ／ふきふき）・けっか・ずかん。 */
(function (global) {
  "use strict";

  var doc = global.document;
  var $ = function (id) { return doc.getElementById(id); };

  var MAX_SOAK = 2600;   // つけっぱなしでリング満タンまでの ms
  var WIPE_MS = 3000;    // ふきふきの時間

  var state = { step: 0, params: {}, seed: 0 };
  var el = {};

  // ---- 画面きりかえ ----
  function show(name) {
    ["title", "play", "result", "gallery"].forEach(function (n) {
      $("screen-" + n).classList.toggle("is-active", n === name);
    });
  }

  // ---- しずくちゃん & ふきだし ----
  function mascot(target, mood, text) {
    global.Art.set(target, global.Art.shizuku(mood));
    target.classList.add("talk");
  }
  function speak(text) {
    el.speech.textContent = text || "";
    el.speech.classList.toggle("on", !!text);
  }

  // ---- キラキラ ----
  function sparkleAt(x, y, n) {
    var emojis = ["✨", "⭐", "💖", "🫧", "🌟"];
    for (var i = 0; i < (n || 6); i++) {
      var s = doc.createElement("div");
      s.className = "sparkle";
      s.textContent = emojis[(Math.random() * emojis.length) | 0];
      s.style.left = (x + (Math.random() - 0.5) * 80) + "px";
      s.style.top = (y + (Math.random() - 0.5) * 40) + "px";
      el.fx.appendChild(s);
      setTimeout(function (node) { return function () { node.remove(); }; }(s), 1100);
    }
  }

  // ---- 工程ドット（すすみ具合）----
  function buildTrack() {
    el.track.innerHTML = "";
    global.STEPS.forEach(function (st, i) {
      var d = doc.createElement("div");
      d.className = "step-dot";
      d.textContent = st.icon;
      el.track.appendChild(d);
    });
  }
  function updateTrack() {
    var dots = el.track.children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("done", i < state.step);
      dots[i].classList.toggle("current", i === state.step);
    }
  }

  // ---- 表示モードのきりかえ ----
  function setMode(mode) {
    el.slide.style.display = (mode === "soak") ? "" : "none";
    el.jarWrap.style.display = (mode === "soak" || mode === "choice") ? "" : "none";
    el.choiceRow.classList.toggle("on", mode === "choice");
    el.tapZone.classList.toggle("on", mode === "tap");
  }

  // ================= あそぶ開始 =================
  function startPlay() {
    state.step = 0;
    state.params = {
      water: 0.5, hematoxylin: 0.5, differentiate: 0.5,
      bluing: 0.5, eosin: 0.5, dehydTime: 0.5, dehydSuff: 0.5
    };
    el.tissue.style.background = "#f4e6ef";
    show("play");
    buildTrack();
    runStep();
  }

  function runStep() {
    var st = global.STEPS[state.step];
    if (!st) return finish();
    updateTrack();
    el.jarLiquid.style.background = st.liquid;
    el.jarLabel.textContent = st.label;
    mascot(el.playMascot, st.mood, st.say);
    speak(st.say);

    // スライドを上のホーム位置へ
    resetSlide();

    if (st.type === "choice") { setMode("choice"); setupChoice(st); }
    else if (st.type === "tap") { setMode("tap"); setupWipe(st); }
    else { setMode("soak"); setupSoak(st); } // soak / dip
  }

  function nextStep(tissueColor) {
    if (tissueColor) el.tissue.style.background = tissueColor;
    global.Sound.step();
    state.step++;
    setTimeout(runStep, 620);
  }

  // ---- スライドのホーム位置 ----
  function resetSlide() {
    var s = el.slide;
    s.classList.remove("grabbed");
    s.style.position = "";
    s.style.left = "";
    s.style.top = "";
    s.style.width = "";
    s.style.transform = "";
    s.style.transition = "";
    el.soakRing.classList.remove("on");
    setFill(0);
  }

  function setFill(t) {
    // 327 = 2*PI*52（css の dasharray とそろえる）
    el.soakFill.style.strokeDashoffset = String(327 * (1 - Math.max(0, Math.min(1, t))));
  }

  // ================= SOAK / DIP =================
  function setupSoak(st) {
    var slide = el.slide;
    var grabbed = false, inJar = false, soakT = 0, lastTs = 0, raf = 0, done = false;
    var offX = 0, offY = 0;

    function jarRect() { return el.jar.getBoundingClientRect(); }

    function follow(e) {
      var r = slide.getBoundingClientRect();
      slide.style.position = "fixed";
      slide.style.width = r.width + "px";
      slide.style.left = (e.clientX - offX) + "px";
      slide.style.top = (e.clientY - offY) + "px";
      slide.style.transform = "none";
    }

    function overlaps() {
      var s = slide.getBoundingClientRect();
      var j = jarRect();
      var cx = s.left + s.width / 2;
      var cy = s.top + s.height * 0.7;
      return cx > j.left && cx < j.right && cy > j.top && cy < j.bottom;
    }

    function loop(ts) {
      if (!grabbed) return;
      if (!lastTs) lastTs = ts;
      var dt = ts - lastTs; lastTs = ts;
      if (inJar) {
        soakT = Math.min(soakT + dt, MAX_SOAK);
        setFill(soakT / MAX_SOAK);
      }
      raf = global.requestAnimationFrame(loop);
    }

    function onDown(e) {
      if (done) return;
      e.preventDefault();
      global.Sound.unlock();
      var r = slide.getBoundingClientRect();
      offX = e.clientX - r.left - r.width / 2;
      offY = e.clientY - r.top - r.height * 0.3;
      grabbed = true;
      slide.classList.add("grabbed");
      lastTs = 0;
      follow(e);
      raf = global.requestAnimationFrame(loop);
      doc.addEventListener("pointermove", onMove);
      doc.addEventListener("pointerup", onUp);
    }

    function onMove(e) {
      if (!grabbed) return;
      follow(e);
      var now = overlaps();
      if (now && !inJar) {
        global.Sound.plop();
        el.soakRing.classList.add("on");
        el.jar.classList.add("hot");
        setTimeout(function () { el.jar.classList.remove("hot"); }, 500);
      }
      inJar = now;
    }

    function onUp(e) {
      if (!grabbed) return;
      grabbed = false;
      global.cancelAnimationFrame(raf);
      doc.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerup", onUp);
      slide.classList.remove("grabbed");

      if (inJar) {
        done = true;
        slide.removeEventListener("pointerdown", onDown);
        var val = st.type === "dip" ? 0.6 : Math.max(0.12, soakT / MAX_SOAK);
        if (st.param) state.params[st.param] = val;
        var rc = slide.getBoundingClientRect();
        sparkleAt(rc.left + rc.width / 2, rc.top, 7);
        // スライドがすっと上にもどる演出
        slide.style.transition = "left 0.4s ease, top 0.4s ease, opacity 0.3s";
        var j = jarRect();
        slide.style.left = (j.left + j.width / 2 - rc.width / 2) + "px";
        slide.style.top = (j.top - rc.height * 0.7) + "px";
        speak("できたね✨");
        nextStep(st.tissue);
      } else {
        // 液につかなかった → もどるだけ（しっぱいにしない）
        resetSlide();
        soakT = 0; inJar = false;
      }
    }

    slide.addEventListener("pointerdown", onDown);
  }

  // ================= CHOICE（みずしつ等）=================
  function setupChoice(st) {
    var row = el.choiceRow;
    row.innerHTML = "";
    st.choices.forEach(function (c) {
      var b = doc.createElement("button");
      b.className = "choice-btn";
      b.innerHTML = '<span class="c-emoji">' + c.emoji + "</span><span>" + c.label + "</span>";
      b.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        global.Sound.unlock();
        global.Sound.tap();
        if (st.param) state.params[st.param] = c.value;
        var r = b.getBoundingClientRect();
        sparkleAt(r.left + r.width / 2, r.top + r.height / 2, 8);
        row.classList.remove("on");
        speak("いいね✨");
        nextStep(st.tissue);
      });
      row.appendChild(b);
    });
  }

  // ================= TAP（ふきふき＆フタ）=================
  function setupWipe(st) {
    var zone = el.tapZone;
    zone.innerHTML =
      '<div class="wipe-slide" id="wipe-slide">' +
        '<div class="wipe-glass"><div class="wipe-tissue"></div></div>' +
        '<div class="wipe-cloth">🧽</div>' +
        '<div class="wipe-ring"><svg viewBox="0 0 120 120">' +
          '<circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff88" stroke-width="10"/>' +
          '<circle id="wipe-fill" cx="60" cy="60" r="52" fill="none" stroke="#fff" ' +
          'stroke-width="10" stroke-linecap="round" stroke-dasharray="327" ' +
          'stroke-dashoffset="327" transform="rotate(-90 60 60)"/>' +
        '</svg></div>' +
      "</div>";
    injectWipeStyle();

    var taps = 0, start = 0, done = false;
    var fill = $("wipe-fill");
    var TARGET = 10;

    function onTap(e) {
      if (done) return;
      e.preventDefault();
      global.Sound.unlock();
      global.Sound.tap();
      if (!start) { start = Date.now(); tick(); }
      taps++;
      var r = e.currentTarget.getBoundingClientRect();
      sparkleAt(e.clientX || (r.left + r.width / 2), e.clientY || r.top, 3);
    }

    function tick() {
      if (done) return;
      var t = (Date.now() - start) / WIPE_MS;
      fill.style.strokeDashoffset = String(327 * (1 - Math.min(1, t)));
      if (t >= 1) { end(); return; }
      global.requestAnimationFrame(tick);
    }

    function end() {
      done = true;
      state.params[st.param] = Math.max(0.15, Math.min(1, taps / TARGET));
      var ws = $("wipe-slide");
      if (ws) {
        var r = ws.getBoundingClientRect();
        sparkleAt(r.left + r.width / 2, r.top + r.height / 2, 12);
        ws.classList.add("capped");
      }
      global.Sound.sparkle();
      speak("ふたを のせたよ✨");
      state.step++;
      setTimeout(runStep, 900);
    }

    zone.querySelector("#wipe-slide").addEventListener("pointerdown", onTap);
  }

  var wipeStyleDone = false;
  function injectWipeStyle() {
    if (wipeStyleDone) return;
    wipeStyleDone = true;
    var css =
      ".wipe-slide{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);" +
      "cursor:pointer;touch-action:none;}" +
      ".wipe-glass{width:34vmin;max-width:210px;height:24vmin;max-height:150px;" +
      "background:linear-gradient(160deg,#ffffffcc,#eaf6ffcc);border-radius:14px;" +
      "box-shadow:0 6px 0 var(--shadow),inset 0 0 0 3px #fff;display:grid;place-items:center;}" +
      ".wipe-tissue{width:60%;height:60%;border-radius:46% 54% 50% 50%/54% 46% 54% 46%;" +
      "background:#d3a0b6;box-shadow:inset 0 0 8px #b07f96;}" +
      ".wipe-cloth{position:absolute;right:-2vmin;top:-3vmin;font-size:10vmin;" +
      "animation:wipe-wig 0.6s ease-in-out infinite;}" +
      "@keyframes wipe-wig{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}" +
      ".wipe-ring{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;}" +
      ".wipe-ring svg{width:44vmin;max-width:260px;}" +
      ".wipe-slide.capped .wipe-glass{box-shadow:0 6px 0 var(--shadow),inset 0 0 0 5px var(--sun);}";
    var s = doc.createElement("style");
    s.textContent = css;
    doc.head.appendChild(s);
  }

  // ================= けっか =================
  function finish() {
    state.seed = (Math.random() * 1e9) | 0;
    var res = global.Staining.compute(state.params);
    var info = global.Staining.describe(res);
    state.name = info.name;
    global.Microscope.render(el.scopeCanvas, res, state.seed);
    el.resultName.textContent = info.name;
    el.resultTags.innerHTML = "";
    info.tags.forEach(function (t) {
      var tag = doc.createElement("span");
      tag.className = "tag";
      tag.textContent = t;
      el.resultTags.appendChild(tag);
    });
    mascot(el.resultMascot, "love", "");
    show("result");
    global.Sound.sparkle();
    var r = el.scopeCanvas.getBoundingClientRect();
    sparkleAt(r.left + r.width / 2, r.top + r.height / 2, 14);
  }

  function saveResult() {
    global.Gallery.add({
      params: state.params, seed: state.seed,
      name: state.name || "ひょうほん", at: Date.now()
    });
    global.Sound.sparkle();
    openGallery();
  }

  // ================= ずかん =================
  function openGallery() {
    global.Gallery.renderGrid(el.galleryGrid, el.galleryEmpty);
    show("gallery");
  }

  // ================= 初期化 =================
  function initTitle() {
    global.Art.set($("title-mascot"), global.Art.titleArt());
  }

  function bind() {
    el = {
      track: $("step-track"),
      slide: $("slide"), tissue: $("slide-tissue"),
      jar: $("jar"), jarWrap: doc.querySelector(".jar-wrap"),
      jarLiquid: $("jar-liquid"), jarLabel: $("jar-label"),
      soakRing: $("soak-ring"), soakFill: $("soak-fill"),
      choiceRow: $("choice-row"), tapZone: $("tap-zone"),
      playMascot: $("play-mascot"), speech: $("speech"),
      scopeCanvas: $("scope-canvas"),
      resultName: $("result-name"), resultTags: $("result-tags"),
      resultMascot: $("result-mascot"),
      galleryGrid: $("gallery-grid"), galleryEmpty: $("gallery-empty"),
      fx: $("fx-layer")
    };

    $("btn-start").addEventListener("pointerdown", function (e) {
      e.preventDefault(); global.Sound.unlock(); global.Sound.tap(); startPlay();
    });
    $("btn-again").addEventListener("pointerdown", function (e) {
      e.preventDefault(); global.Sound.tap(); startPlay();
    });
    $("btn-save").addEventListener("pointerdown", function (e) {
      e.preventDefault(); global.Sound.tap(); saveResult();
    });
    $("btn-gallery-open").addEventListener("pointerdown", function (e) {
      e.preventDefault(); global.Sound.unlock(); global.Sound.tap(); openGallery();
    });
    $("btn-gallery-back").addEventListener("pointerdown", function (e) {
      e.preventDefault(); global.Sound.tap(); show("title");
    });
    var sndBtn = $("btn-sound");
    sndBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      var on = global.Sound.toggle();
      sndBtn.classList.toggle("is-off", !on);
      sndBtn.querySelector(".btn-emoji").textContent = on ? "🔊" : "🔇";
    });
  }

  doc.addEventListener("DOMContentLoaded", function () {
    bind();
    initTitle();
    show("title");
  });
})(window);
