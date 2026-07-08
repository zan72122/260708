import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(dir, "..", "index.html");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(url);
await page.waitForTimeout(300);

async function shot(name) {
  await page.screenshot({ path: path.join(dir, name) });
}

await shot("01-title.png");

// はじめる
await page.locator("#btn-start").click();
await page.waitForTimeout(400);
const trackCount = await page.locator("#step-track .step-dot").count();
console.log("step dots:", trackCount);
await shot("02-play.png");

// 8工程を自動でこなす
for (let i = 0; i < 8; i++) {
  const mode = await page.evaluate(() => {
    const cr = document.getElementById("choice-row");
    const tz = document.getElementById("tap-zone");
    const sl = document.getElementById("slide");
    if (cr.classList.contains("on")) return "choice";
    if (tz.classList.contains("on")) return "tap";
    if (getComputedStyle(sl).display !== "none") return "soak";
    return "none";
  });
  console.log("step", i, "mode", mode);

  if (mode === "choice") {
    await page.locator("#choice-row .choice-btn").first().click();
  } else if (mode === "tap") {
    for (let t = 0; t < 12; t++) {
      await page.locator("#wipe-slide").click({ position: { x: 40, y: 30 } });
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(3200);
  } else if (mode === "soak") {
    // ドラッグ＋長おし（びんの上でホールド）
    const slide = page.locator("#slide");
    const jar = page.locator("#jar");
    const sb = await slide.boundingBox();
    const jb = await jar.boundingBox();
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2, { steps: 8 });
    await page.waitForTimeout(800 + i * 120);
    await page.mouse.up();
  }
  await page.waitForTimeout(900);
}

await page.waitForTimeout(600);
await shot("03-result.png");
const resultName = await page.locator("#result-name").textContent();
const tags = await page.locator("#result-tags .tag").allTextContents();
console.log("result:", resultName, "| tags:", tags.join(" "));

// ずかんに保存
await page.locator("#btn-save").click();
await page.waitForTimeout(700);
await shot("04-gallery.png");
const cells = await page.locator(".gallery-cell").count();
console.log("gallery cells:", cells);

console.log("CONSOLE ERRORS:", errors.length ? errors : "none");
await browser.close();
if (errors.length) process.exit(1);
