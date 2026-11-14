import puppeteer from "puppeteer-core";
import fs from "node:fs";

const BASE = "https://bharosa-ai-paytm.vercel.app";
const EMAIL = fs.readFileSync("qa-prod-email.txt", "utf8").trim();
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860 });
await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', EMAIL);
await page.type('input[type="password"]', "QaTest@12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 3500));

const f = page.frames().find((x) => x.url().includes("/app"));
console.log(
  await f.evaluate(() => {
    const nav = document.querySelector("nav");
    const navRect = nav?.getBoundingClientRect();
    const over = Array.from(document.querySelectorAll("body *"))
      .map((e) => ({ tag: e.tagName, cls: (e.className || "").toString().slice(0, 60), r: e.getBoundingClientRect() }))
      .filter((x) => x.r.bottom > window.innerHeight + 0.5 && x.r.height < 400)
      .slice(0, 6)
      .map((x) => `${x.tag} ${x.cls} bottom=${x.r.bottom.toFixed(1)} h=${x.r.height.toFixed(1)}`);
    const bodyStyle = getComputedStyle(document.body);
    return {
      over,
      bodyMargin: bodyStyle.margin,
      firstChild: (() => { const c = document.body.firstElementChild; const r = c?.getBoundingClientRect(); return { tag: c?.tagName, h: r?.height, cls: (c?.className||"").toString().slice(0,60) }; })(),
      innerHeight: window.innerHeight,
      scrollHeight: document.scrollingElement?.scrollHeight,
      bodyHeight: document.body.getBoundingClientRect().height,
      navTop: navRect?.top,
      navBottom: navRect?.bottom,
      navHeight: navRect?.height,
      rootHeight: document.querySelector("#__next, body > div")?.getBoundingClientRect().height,
    };
  }),
);
const frameEl = await page.$("iframe");
await frameEl.screenshot({ path: "crop-phone-1280.png" });
await browser.close();
