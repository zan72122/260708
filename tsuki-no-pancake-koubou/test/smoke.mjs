// スモークテスト: 起動 → 各道具を一通り使う → 日食 → おそうじ
// コンソールエラーが1件でもあれば失敗
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import http from "http";
import fs from "fs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

// ESモジュールは file:// では読めないため簡易HTTPサーバを立てる
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const file = path.join(root, req.url === "/" ? "index.html" : decodeURIComponent(req.url));
  try {
    const body = fs.readFileSync(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

async function run(viewport, tag) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(url);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(dir, `${tag}-01-title.png`) });

  // はじめる (パルスアニメーション中でも押せるように force)
  await page.locator("#btn-start").click({ force: true });
  await page.waitForTimeout(500);

  const geom = await page.evaluate(() => {
    const m = window.__game.state.layout;
    return { cx: m.cx, cy: m.cy, R: m.R };
  });
  console.log(`[${tag}] layout:`, JSON.stringify(geom));

  // テストを決定的にするため自動回転を止める
  await page.locator("#btn-spin").dispatchEvent("pointerdown");
  await page.waitForTimeout(600);

  const tap = async (x, y) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
  };
  const drag = async (x1, y1, x2, y2, holdMs = 200) => {
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 10 });
    await page.waitForTimeout(holdMs);
    await page.mouse.up();
  };

  // バターを置く
  await page.locator("#tool-butter").dispatchEvent("pointerdown");
  await tap(geom.cx - geom.R * 0.3, geom.cy - geom.R * 0.2);
  // はちみつ
  await page.locator("#tool-honey").dispatchEvent("pointerdown");
  await tap(geom.cx + geom.R * 0.3, geom.cy);
  // チョコを描く
  await page.locator("#tool-choc").dispatchEvent("pointerdown");
  await drag(geom.cx - geom.R * 0.5, geom.cy + geom.R * 0.3, geom.cx + geom.R * 0.5, geom.cy + geom.R * 0.3);
  // こなざとう
  await page.locator("#tool-sugar").dispatchEvent("pointerdown");
  await drag(geom.cx - geom.R * 0.4, geom.cy - geom.R * 0.4, geom.cx + geom.R * 0.4, geom.cy - geom.R * 0.4, 500);
  // いちご
  await page.locator("#tool-strawberry").dispatchEvent("pointerdown");
  await tap(geom.cx, geom.cy - geom.R * 0.5);
  await tap(geom.cx - geom.R * 0.45, geom.cy + geom.R * 0.35);
  await tap(geom.cx + geom.R * 0.45, geom.cy + geom.R * 0.35);
  await page.waitForTimeout(800);

  const counts = await page.evaluate(() => {
    const s = window.__game.state;
    return {
      butters: s.butters.length,
      honeys: s.honeys.length,
      chocStrokes: s.chocStrokes.length,
      fruits: s.fruits.length,
      sugar: window.__game.getSugarTotal(),
    };
  });
  console.log(`[${tag}] counts:`, JSON.stringify(counts));
  if (counts.butters < 1) errors.push("butter not placed");
  if (counts.honeys < 1) errors.push("honey not placed");
  if (counts.chocStrokes < 1) errors.push("choc not drawn");
  if (counts.fruits < 3) errors.push("fruits not placed");
  if (counts.sugar <= 0) errors.push("sugar not sprinkled");

  await page.screenshot({ path: path.join(dir, `${tag}-02-toppings.png`) });

  // クッキーをパンケーキの真ん中へ → 日食
  const cookie = await page.evaluate(() => {
    const oc = window.__game.state.occluders.find((o) => o.kind === "cookie");
    return { x: oc.x, y: oc.y };
  });
  await drag(cookie.x, cookie.y, geom.cx - geom.R * 0.06, geom.cy - geom.R * 0.14, 2500);
  await page.waitForTimeout(1500);
  const eclipse = await page.evaluate(() => ({
    eclipse: window.__game.state.eclipse,
    eclipses: window.__game.state.counters.eclipses,
  }));
  console.log(`[${tag}] eclipse:`, JSON.stringify(eclipse));
  if (eclipse.eclipses < 1) errors.push("eclipse not triggered");
  await page.screenshot({ path: path.join(dir, `${tag}-03-eclipse.png`) });

  // おつきさまボードをパンケーキ全体にかざしてチョコを影に入れる
  const moon = await page.evaluate(() => {
    const oc = window.__game.state.occluders.find((o) => o.kind === "moonboard");
    return { x: oc.x, y: oc.y };
  });
  await drag(moon.x, moon.y, geom.cx, geom.cy + geom.R * 0.2, 300);

  // バターが溶け・チョコが固まっているか (少し待って物理を進める)
  await page.waitForTimeout(3500);
  const sim = await page.evaluate(() => {
    const s = window.__game.state;
    return {
      butterMelt: Math.max(0, ...s.butters.map((b) => b.melt)),
      chocHard: Math.max(0, ...s.chocStrokes.flatMap((st) => st.points.map((p) => p.hard))),
      stars: s.starsEarned,
    };
  });
  console.log(`[${tag}] sim:`, JSON.stringify(sim));
  if (sim.butterMelt <= 0) errors.push("butter never melted");
  if (sim.chocHard <= 0) errors.push("choc never hardened");

  // おつきさまボードをどかして、カチカチのチョコをタップで割る
  const moonNow = await page.evaluate(() => {
    const oc = window.__game.state.occluders.find((o) => o.kind === "moonboard");
    return { x: oc.x, y: oc.y };
  });
  await drag(moonNow.x, moonNow.y, moon.x, moon.y, 150);
  await page.waitForTimeout(400);
  const before = await page.evaluate(() =>
    window.__game.state.chocStrokes.reduce((n, s) => n + s.points.length, 0));
  const hardPt = await page.evaluate(() => {
    const s = window.__game.state;
    const { cx, cy, R } = s.layout;
    const rot = s.rot;
    for (const stroke of s.chocStrokes) {
      for (const p of stroke.points) {
        if (p.hard >= 0.55) {
          const c = Math.cos(rot), sn = Math.sin(rot);
          return {
            x: cx + R * (p.lx * c - p.ly * sn),
            y: cy + R * (p.lx * sn + p.ly * c),
          };
        }
      }
    }
    return null;
  });
  if (!hardPt) errors.push("no hardened choc point for break test");
  else await tap(hardPt.x, hardPt.y);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    points: window.__game.state.chocStrokes.reduce((n, s) => n + s.points.length, 0),
    broken: window.__game.state.counters.chocBroken,
  }));
  console.log(`[${tag}] choc break:`, before, "->", JSON.stringify(after));
  if (after.broken < 1 || after.points >= before) errors.push("choc did not break on tap");

  // おそうじ
  await page.locator("#btn-clean").dispatchEvent("pointerdown");
  await page.waitForTimeout(400);
  const cleaned = await page.evaluate(() => {
    const s = window.__game.state;
    return s.butters.length + s.honeys.length + s.chocStrokes.length + s.fruits.length;
  });
  console.log(`[${tag}] after clean:`, cleaned);
  if (cleaned !== 0) errors.push("clean did not clear toppings");
  await page.screenshot({ path: path.join(dir, `${tag}-04-clean.png`) });

  console.log(`[${tag}] CONSOLE ERRORS:`, errors.length ? errors : "none");
  await browser.close();
  return errors;
}

const portraitErrors = await run({ width: 390, height: 844 }, "portrait");
const landscapeErrors = await run({ width: 1024, height: 768 }, "landscape");
const all = [...portraitErrors, ...landscapeErrors];
server.close();
if (all.length) {
  console.error("FAILED:", all);
  process.exit(1);
}
console.log("SMOKE TEST OK");
