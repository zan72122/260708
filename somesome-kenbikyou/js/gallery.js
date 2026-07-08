/* gallery.js — 標本コレクション。localStorage に保存し、ずかんに表示する。 */
(function (global) {
  "use strict";

  var KEY = "somesome_gallery_v1";
  var MAX = 40; // ためすぎ防止

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function save(list) {
    try { global.localStorage.setItem(KEY, JSON.stringify(list)); }
    catch (e) { /* 保存できなくても遊べる */ }
  }

  // item: { params, seed, name, at }
  function add(item) {
    var list = load();
    list.unshift(item);
    if (list.length > MAX) list = list.slice(0, MAX);
    save(list);
    return list;
  }

  // ずかんグリッドを描画する
  function renderGrid(gridEl, emptyEl) {
    var list = load();
    gridEl.innerHTML = "";
    if (list.length === 0) {
      emptyEl.classList.add("on");
      var m = emptyEl.querySelector(".mascot");
      if (m) global.Art.set(m, global.Art.shizuku("sleep"));
      return;
    }
    emptyEl.classList.remove("on");

    list.forEach(function (item) {
      var cell = global.document.createElement("div");
      cell.className = "gallery-cell";

      var cv = global.document.createElement("canvas");
      cv.width = 260; cv.height = 260;
      cell.appendChild(cv);

      var nm = global.document.createElement("div");
      nm.className = "g-name";
      nm.textContent = item.name || "ひょうほん";
      cell.appendChild(nm);

      gridEl.appendChild(cell);

      var res = global.Staining.compute(item.params);
      global.Microscope.render(cv, res, item.seed);
    });
  }

  function count() { return load().length; }

  global.Gallery = {
    add: add,
    renderGrid: renderGrid,
    count: count
  };
})(window);
