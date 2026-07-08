// スモークテスト: 起動 → 各道具を一通り使う → 日食 → おそうじ
// コンソールエラーが1件でもあれば失敗
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(dir, "..", "index.html");

async function run(viewport, tag) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(url);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(dir, `${tag}-01-title.png`) });

  // はじめる
  await page.locator("#btn-start").click();
  await page.waitForTimeout(500);

  const geom = await page.evaluate(() => {
    const m = window.__game.state.layout;
    return { cx: m.cx, cy: m.cy, R: m.R };
  });
  console.log(`[${tag}] layout:`, JSON.stringify(geom));

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
if (all.length) {
  console.error("FAILED:", all);
  process.exit(1);
}
console.log("SMOKE TEST OK");
