import puppeteer from "puppeteer-core";
import fs from "node:fs";

const BASE = "https://bharosa-ai-paytm.vercel.app";
const EMAIL = fs.readFileSync("qa-prod-email.txt", "utf8").trim();
const PASS = "QaTest@12345";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1440,900", "--font-render-hinting=none"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', EMAIL);
await page.type('input[type="password"]', PASS);
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));
console.log("after login:", page.url());

const email = await page.evaluate(() => document.body.innerText.includes("Bharosa"));
console.log("logged in shell:", email);

await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 3500));
await page.screenshot({ path: "shot-dashboard-1440.png" });
console.log("dashboard done");

await page.setViewport({ width: 1280, height: 860 });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: "shot-dashboard-1280.png" });

// phone frame: confirm Bharosa home renders inside iframe and tile opens the flow
await page.setViewport({ width: 1440, height: 900 });
await new Promise((r) => setTimeout(r, 800));
const frames = page.frames().map((f) => f.url());
console.log("frames:", frames.filter((f) => f.includes("/app")));
const appFrame = page.frames().find((f) => f.url().includes("/app"));
if (appFrame) {
  const tile = await appFrame.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button, div, a"));
    const t = all.find((e) => (e.textContent || "").includes("Bharosa AI"));
    return t ? t.textContent?.trim().slice(0, 80) : null;
  });
  console.log("paytm home tile:", JSON.stringify(tile));
  const clicked = await appFrame.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button"));
    const t = all.find((e) => (e.textContent || "").includes("Bharosa AI"));
    if (t) { t.click(); return true; }
    return false;
  });
  console.log("tile clicked:", clicked);
  await new Promise((r) => setTimeout(r, 2500));
  const after = await appFrame.evaluate(() => document.body.innerText.slice(0, 160).replace(/\n+/g, " | "));
  console.log("after tile:", after);
  await page.screenshot({ path: "shot-dashboard-bharosa.png" });
}

const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await mobile.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await mobile.screenshot({ path: "shot-mobile-login.png" });
console.log("mobile login shot");

await browser.close();
