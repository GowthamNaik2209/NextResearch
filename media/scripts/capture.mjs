// Captures raw platform screenshots into out/raw/ - the source material every social post and
// newsletter graphic is composed from (see compose.mjs). Drives the locally installed Google
// Chrome via playwright-core, so no browser download is needed.
//
//   BASE_URL=https://<your-domain> npm run capture        # production (preferred: no dev badge)
//   npm run capture -- datacenter                          # only shots whose id contains "datacenter"
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "out", "raw");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const filter = process.argv[2];

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

// Hide dev-only chrome (Next's dev badge) and the cookie-less "return to stock" pill so shots look like production.
const CLEAN_CSS = `nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }`;

const SECTORS = ["datacenter", "ev4w", "semiconductors", "railways", "naval", "aerospace", "telecom5g", "solarmodules", "energy"];

// Zone + company pairs that make a good "who supplies X" frame per sector.
const FOCUS = {
  datacenter: ["power_backup", "cummins"],
  ev4w: ["battery", null],
  semiconductors: ["atmp", null],
  railways: ["signaling", null],
  naval: ["shipyard", "mazdock"],
  aerospace: ["forgings", null],
  telecom5g: ["towers", null],
  solarmodules: ["cells", "waaree"],
  energy: ["storage_equip", null],
};

const COMPANIES = ["bel", "waareeener", "netweb", "hal", "polycab", "dixon", "mazdock", "kaynes", "cumminsind", "aparinds"];

/** @type {{id:string, url:string, device:"desktop"|"phone", theme?:"light"|"dark", wait?:number, action?:(page:any)=>Promise<void>, fullPage?:boolean}[]} */
const SHOTS = [
  { id: "home-hero", url: "/", device: "desktop" },
  { id: "home-hero-phone", url: "/", device: "phone" },
  { id: "home-ideas", url: "/", device: "desktop", action: (p) => scrollToText(p, "High return on capital") },
  { id: "home-sectors", url: "/#sectors", device: "desktop", wait: 1200 },
  { id: "companies-index", url: "/companies", device: "desktop" },
  ...SECTORS.flatMap((s) => [
    { id: `sector-${s}`, url: `/sector/${s}`, device: "desktop" },
    { id: `sector-${s}-phone`, url: `/sector/${s}`, device: "phone" },
    { id: `explore-${s}-dark`, url: `/sector/${s}/explore`, device: "desktop", theme: "dark", wait: 5000 },
    { id: `explore-${s}-light`, url: `/sector/${s}/explore`, device: "desktop", theme: "light", wait: 5000 },
    { id: `explore-${s}-phone-dark`, url: `/sector/${s}/explore`, device: "phone", theme: "dark", wait: 5000 },
    {
      id: `explore-${s}-focus-dark`,
      url: `/sector/${s}/explore?zone=${FOCUS[s][0]}${FOCUS[s][1] ? `&company=${FOCUS[s][1]}` : ""}`,
      device: "desktop",
      theme: "dark",
      wait: 6000,
    },
    { id: `deck-${s}`, url: `/docs?report=${s}`, device: "desktop", wait: 1500, action: (p) => deckSlides(p, s) },
  ]),
  ...COMPANIES.flatMap((c) => [
    { id: `company-${c}`, url: `/company/${c}`, device: "desktop" },
    { id: `stockcard-${c}-phone`, url: `/company/${c}`, device: "phone", wait: 800, action: (p) => openStockCard(p) },
    { id: `stockcard-${c}`, url: `/company/${c}`, device: "desktop", wait: 800, action: (p) => openStockCard(p) },
  ]),
];

async function scrollToText(page, text) {
  await page.getByText(text, { exact: false }).first().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(600);
}

async function openStockCard(page) {
  await page.getByText("Live price, chart and full financials").click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(3500); // live quote + chart fetch
}

// Screenshots every slide of a sector's research deck (carousel source material), then
// lets the caller's own screenshot capture the last one.
async function deckSlides(page, slug) {
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 10000 });
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(700);
    // Crop to the slide itself (not the dimmed page behind it) - carousel frames need no letterbox.
    await dialog.screenshot({ path: path.join(OUT, `deck-${slug}-slide${String(i).padStart(2, "0")}.png`) });
    const next = page.getByRole("button", { name: "Next slide" });
    if (!(await next.count())) break;
    await next.click();
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    // WebGL for the three.js explorer in headless mode.
    args: ["--ignore-gpu-blocklist", "--use-gl=angle"], // GPU (Metal) WebGL for the three.js explorer
  });
  const shots = SHOTS.filter((s) => !filter || s.id.includes(filter));
  let ok = 0;
  for (const shot of shots) {
    const ctx = await browser.newContext(shot.device === "phone" ? PHONE : DESKTOP);
    const theme = shot.theme ?? "light";
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("nr-theme", t);
      } catch {}
    }, theme);
    const page = await ctx.newPage();
    try {
      // The explorer can keep polling live data, so "networkidle" may never settle: fall back to "load".
      await page.goto(BASE + shot.url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => page.waitForLoadState("load"));
      await page.addStyleTag({ content: CLEAN_CSS });
      await page.waitForTimeout(shot.wait ?? 800);
      if (shot.action) await shot.action(page);
      await page.screenshot({ path: path.join(OUT, `${shot.id}.png`), fullPage: !!shot.fullPage });
      ok++;
      console.log(`ok   ${shot.id}`);
    } catch (e) {
      console.log(`FAIL ${shot.id}: ${String(e).split("\n")[0]}`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok}/${shots.length} captured -> ${OUT}`);
}

main();
