// Renders every post in content/inventory.mjs into branded, upload-ready assets under out/posts/<id>/:
//   <id>-NN.png   one 1080x1350 (4:5) image per slide - Instagram feed & LinkedIn both take 4:5
//   <id>.pdf      LinkedIn document carousels (posts whose `slides` points at another post's id)
//   <id>.mp4      Reels: the recorded explorer clip, plus <id>-cover.png as the Reel cover
//   caption.txt   copy-paste caption + hashtags (+ first comment for LinkedIn)
// Slides are plain HTML/CSS in the platform's own brand (globals.css light theme, Space Grotesk /
// IBM Plex), screenshotted by the local Chrome.
//
//   npm run compose               # everything
//   npm run compose -- ig03       # one post
import { chromium } from "playwright-core";
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { POSTS, DISCLAIMER } from "../content/inventory.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RAW = path.join(ROOT, "out", "raw");
const VIDEO = path.join(ROOT, "out", "video");
const OUT = path.join(ROOT, "out", "posts");
const TMP = path.join(ROOT, "out", ".tmp");
const SITE = process.env.SITE_URL ?? "{{SITE}}";
const HANDLE = process.env.IG_HANDLE ?? "@nextresearch.in";
const W = 1080, H = 1350;
const filter = process.argv[2];

const C = {
  bg: "#f8f4ea", panel: "#efe9d9", panel2: "#e5dec9", ink: "#14201a", soft: "#5b6a60", line: "#d4cab0",
  accent: "#0f5c4a", amber: "#a8650a", danger: "#b73a2c", pos: "#1c7a4b", dark: "#0c1110", gold: "#f0b53f",
};

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtNum = (v) => (v >= 1000 ? v.toLocaleString("en-IN") : String(v));

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=block');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:'IBM Plex Sans',sans-serif;background:${C.bg};color:${C.ink};-webkit-font-smoothing:antialiased}
.slide{width:${W}px;height:${H}px;display:flex;flex-direction:column;padding:72px 76px 56px;position:relative}
.slide.green{background:${C.accent};color:${C.bg}}
.slide.dark{background:${C.dark};color:#eef2ea}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:14px;font-family:'Space Grotesk';font-weight:700;font-size:30px}
.logo{width:48px;height:48px;border-radius:10px;background:${C.accent};color:${C.bg};display:flex;align-items:center;justify-content:center;font-size:21px;font-family:'Space Grotesk';font-weight:700}
.green .logo{background:${C.bg};color:${C.accent}}
.dark .logo{background:${C.gold};color:${C.dark}}
.kicker{font-size:21px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.amber}}
.green .kicker{color:${C.gold}} .dark .kicker{color:${C.gold}}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:28px;min-height:0}
.foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:19px;color:${C.soft}}
.green .foot,.dark .foot{color:rgba(248,244,234,.72)}
.src{max-width:760px;line-height:1.35}
.page{font-family:'IBM Plex Mono';font-weight:600}
h1{font-family:'Space Grotesk';font-weight:700;letter-spacing:-.02em;line-height:1.04}
h2{font-family:'Space Grotesk';font-weight:700;font-size:54px;line-height:1.08;letter-spacing:-.015em}
.sub{font-size:32px;line-height:1.35;color:${C.soft}}
.green .sub,.dark .sub{color:rgba(248,244,234,.82)}
.swipe{position:absolute;right:76px;bottom:120px;font-family:'Space Grotesk';font-weight:700;font-size:26px;color:${C.gold};display:flex;align-items:center;gap:10px}
.mono{font-family:'IBM Plex Mono'}
.card{background:${C.panel};border:2px solid ${C.line};border-radius:28px;padding:40px}
`;

function frame({ kicker, page, total, source, variant = "", inner }) {
  return `<div class="slide ${variant}">
  <div class="top"><div class="brand"><div class="logo">NR</div>NextResearch</div>${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ""}</div>
  <div class="body">${inner}</div>
  <div class="foot"><div class="src">${source ? `Source: ${esc(source)}` : esc(DISCLAIMER)}</div>${total > 1 ? `<div class="page">${page}/${total}</div>` : `<div>${esc(HANDLE)}</div>`}</div>
</div>`;
}

const moatDots = (m) => {
  const n = { high: 3, medium: 2, low: 1 }[m] ?? 0;
  return `<span style="display:inline-flex;gap:6px">${[0, 1, 2].map((i) => `<span style="width:14px;height:14px;border-radius:50%;background:${i < n ? C.accent : C.line}"></span>`).join("")}</span>`;
};

async function imgSrc(file) {
  const p = path.join(RAW, file);
  try {
    await access(p);
    return pathToFileURL(p).href;
  } catch {
    return null;
  }
}

// One renderer per slide kind. Each returns the full slide HTML.
const KINDS = {
  async cover(s, ctx) {
    return frame({
      ...ctx, variant: "green", source: null,
      inner: `<h1 style="font-size:${s.title.length > 40 ? 84 : 100}px">${esc(s.title)}</h1>${s.sub ? `<p class="sub" style="font-size:36px">${esc(s.sub)}</p>` : ""}
      ${ctx.total > 1 ? `<div class="swipe">Swipe <span style="font-size:34px">&rarr;</span></div>` : ""}`,
    });
  },
  async text(s, ctx) {
    return frame({ ...ctx, inner: `<h2 style="color:${C.accent}">${esc(s.title)}</h2><p style="font-size:42px;line-height:1.4">${esc(s.body)}</p>` });
  },
  async stat(s, ctx) {
    return frame({
      ...ctx, kicker: s.kicker ?? ctx.kicker, source: s.source,
      inner: `<div class="mono" style="font-size:${s.value.length > 7 ? 150 : 190}px;font-weight:600;color:${C.accent};line-height:1;letter-spacing:-.04em">${esc(s.value)}</div>
      <h2 style="font-size:56px">${esc(s.label)}</h2>${s.context ? `<p class="sub">${esc(s.context)}</p>` : ""}`,
    });
  },
  async stat3(s, ctx) {
    return frame({
      ...ctx,
      inner: `<h2>${esc(s.title)}</h2><div style="display:flex;flex-direction:column;gap:24px">${s.items
        .map((i) => `<div class="card" style="display:flex;align-items:baseline;gap:32px"><span class="mono" style="font-size:120px;font-weight:600;color:${C.accent};line-height:1">${esc(i.value)}</span><span style="font-size:40px;font-weight:600">${esc(i.label)}</span></div>`)
        .join("")}</div>`,
    });
  },
  async bars(s, ctx) {
    const max = Math.max(...s.points.map((p) => p[1]));
    const n = s.points.length;
    const bars = s.points
      .map(([label, v, proj]) => {
        const h = Math.max(6, (v / max) * 640);
        const fill = proj ? `background:repeating-linear-gradient(135deg,${C.accent}22 0 10px,transparent 10px 20px);border:3px dashed ${C.accent}` : `background:${C.accent}`;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:12px">
          <div class="mono" style="font-size:${n > 6 ? 24 : 30}px;font-weight:600">${fmtNum(v)}</div>
          <div style="width:100%;height:${h}px;border-radius:12px 12px 0 0;${fill}"></div>
          <div class="mono" style="font-size:${n > 6 ? 22 : 26}px;color:${proj ? C.soft : C.ink}">${esc(label)}</div></div>`;
      })
      .join("");
    return frame({
      ...ctx, kicker: s.kicker ?? ctx.kicker, source: s.source,
      inner: `<h2 style="font-size:48px">${esc(s.title)}</h2><div style="display:flex;gap:${n > 6 ? 16 : 26}px;align-items:flex-end;height:760px">${bars}</div>
      ${s.points.some((p) => p[2]) ? `<div style="font-size:22px;color:${C.soft};display:flex;gap:28px"><span>■ Actual</span><span>▨ Projected / target</span></div>` : ""}`,
    });
  },
  async chain(s, ctx) {
    const rows = s.stages
      .map(
        ([stage, margin, moat], i) => `${i ? `<div style="text-align:center;color:${C.accent};font-size:26px;line-height:1">&darr;</div>` : ""}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;background:${C.panel};border:2px solid ${C.line};border-radius:20px;padding:${s.stages.length > 5 ? 20 : 26}px 30px">
          <div style="font-size:${s.stages.length > 5 ? 30 : 33}px;font-weight:600;line-height:1.2">${esc(stage)}</div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:none">
            <span class="mono" style="font-size:24px;font-weight:600;background:${C.accent};color:${C.bg};border-radius:999px;padding:6px 16px;white-space:nowrap">${esc(margin)}</span>
            <span style="font-size:18px;color:${C.soft};display:flex;align-items:center;gap:10px">moat ${moatDots(moat)}</span></div></div>`
      )
      .join("");
    return frame({ ...ctx, kicker: s.kicker ?? ctx.kicker, source: s.source, inner: `<h2 style="font-size:46px">${esc(s.title)}</h2><div style="display:flex;flex-direction:column;gap:8px">${rows}</div>` });
  },
  async list(s, ctx) {
    const rows = s.items
      .map(
        ([a, b], i) => `<div style="display:flex;align-items:center;gap:26px;padding:24px 0;border-bottom:2px solid ${C.line}">
        <span class="mono" style="font-size:30px;color:${C.soft};width:40px">${i + 1}</span>
        <span style="flex:1;font-size:38px;font-weight:600">${esc(a)}</span>
        <span class="mono" style="font-size:${b.length > 10 ? 26 : 38}px;font-weight:600;color:${C.accent}">${esc(b)}</span></div>`
      )
      .join("");
    return frame({
      ...ctx, source: s.source,
      inner: `<h2>${esc(s.title)}</h2>${s.rule ? `<p style="font-size:26px;color:${C.soft};border-left:6px solid ${C.amber};padding-left:18px">Rule: ${esc(s.rule)}</p>` : ""}<div>${rows}</div>`,
    });
  },
  async mix(s, ctx) {
    const rows = s.slices
      .map(
        ([label, v]) => `<div style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;font-size:34px;font-weight:600"><span>${esc(label)}</span><span class="mono">${v}%</span></div>
        <div style="height:34px;background:${C.panel2};border-radius:999px;overflow:hidden"><div style="width:${v}%;height:100%;background:${C.accent};border-radius:999px"></div></div></div>`
      )
      .join("");
    return frame({ ...ctx, kicker: s.kicker ?? ctx.kicker, source: s.source, inner: `<h2 style="font-size:48px">${esc(s.title)}</h2><div style="display:flex;flex-direction:column;gap:30px">${rows}</div>` });
  },
  async quiz(s, ctx) {
    return frame({
      ...ctx, variant: "green", kicker: s.kicker, source: null,
      inner: `<h1 style="font-size:74px">${esc(s.title)}</h1><div style="display:flex;flex-direction:column;gap:20px">${s.options
        .map((o) => `<div style="font-size:40px;font-weight:600;border:3px solid rgba(248,244,234,.5);border-radius:20px;padding:24px 32px">${esc(o)}</div>`)
        .join("")}</div><p style="font-size:30px;color:${C.gold};font-weight:700">${esc(s.footer)}</p>`,
    });
  },
  async shot(s, ctx) {
    const src = await imgSrc(s.img);
    const missing = `<div style="flex:1;display:flex;align-items:center;justify-content:center;border:3px dashed ${C.danger};border-radius:24px;color:${C.danger};font-size:28px">missing capture: ${esc(s.img)}</div>`;
    let media;
    if (!src) media = missing;
    else if (s.frame === "phone")
      media = `<div style="display:flex;justify-content:center"><div style="height:780px;aspect-ratio:390/844;border-radius:56px;border:14px solid ${C.ink};overflow:hidden;box-shadow:0 30px 60px rgba(20,32,26,.25)"><img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:top"></div></div>`;
    else {
      const chrome = s.frame === "desktop" ? `<div style="height:40px;background:${C.panel2};display:flex;align-items:center;gap:10px;padding:0 18px">${["#e8705e", "#f0b53f", "#5fcf8e"].map((c) => `<span style="width:14px;height:14px;border-radius:50%;background:${c}"></span>`).join("")}</div>` : "";
      media = `<div style="border-radius:22px;overflow:hidden;border:2px solid ${C.line};box-shadow:0 30px 60px rgba(20,32,26,.18);background:${C.panel}">${chrome}<img src="${src}" style="display:block;width:100%"></div>`;
    }
    return frame({
      ...ctx,
      inner: `<div style="display:flex;flex-direction:column;gap:14px"><h2 style="font-size:52px">${esc(s.title)}</h2>${s.sub ? `<p class="sub" style="font-size:30px">${esc(s.sub)}</p>` : ""}</div>${media}`,
    });
  },
  async cta(s, ctx) {
    return frame({
      ...ctx, variant: "green", source: null,
      inner: `<h1 style="font-size:92px">${esc(s.title)}</h1><p class="sub" style="font-size:38px">${esc(s.sub)}</p>
      <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:28px;font-weight:600">${["Save", "Share", "Follow " + HANDLE].map((t) => `<span style="border:2px solid rgba(248,244,234,.5);border-radius:999px;padding:12px 26px">${esc(t)}</span>`).join("")}</div>`,
    });
  },
};

async function renderSlides(page, slides, kicker, outDir, prefix) {
  const files = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const render = KINDS[s.kind];
    if (!render) throw new Error(`unknown slide kind ${s.kind}`);
    const html = await render(s, { kicker, page: i + 1, total: slides.length });
    const tmp = path.join(TMP, `${prefix}-${i}.html`);
    await writeFile(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(outDir, `${prefix}-${String(i + 1).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  }
  return files;
}

async function toPdf(page, pngs, file) {
  const html = `<!doctype html><html><head><style>@page{size:${W}px ${H}px;margin:0}body{margin:0}img{display:block;width:${W}px;height:${H}px;page-break-after:always}</style></head><body>${pngs
    .map((p) => `<img src="${pathToFileURL(p).href}">`)
    .join("")}</body></html>`;
  const tmp = path.join(TMP, "pdf.html");
  await writeFile(tmp, html);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await page.pdf({ path: file, width: `${W}px`, height: `${H}px`, printBackground: true });
}

function captionText(p) {
  const sub = (t) => t.replaceAll("{{SITE}}", SITE);
  const parts = [sub(p.caption ?? "")];
  if (p.hashtags?.length) parts.push(p.hashtags.join(" "));
  if (p.platform === "instagram" && p.link) parts.push(`[Link in bio → ${sub(p.link)}]`);
  if (p.firstComment) parts.push(`--- FIRST COMMENT ---\n${sub(p.firstComment)}`);
  if (p.onScreen) parts.push(`--- ON-SCREEN TEXT (one line per beat) ---\n${p.onScreen.join("\n")}`);
  if (p.audio) parts.push(`--- AUDIO ---\n${p.audio}`);
  return parts.join("\n\n");
}

async function main() {
  await mkdir(TMP, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const byId = Object.fromEntries(POSTS.map((p) => [p.id, p]));
  const report = [];
  for (const p of POSTS) {
    if (filter && p.id !== filter) continue;
    const dir = path.join(OUT, p.id);
    await mkdir(dir, { recursive: true });
    const kicker = p.slides?.[0]?.kicker;
    let files = [];
    if (typeof p.slides === "string") {
      // LinkedIn document post reusing an Instagram carousel's slides, exported as a PDF.
      const src = byId[p.slides];
      files = await renderSlides(page, src.slides, src.slides[0]?.kicker, dir, p.id);
      await toPdf(page, files, path.join(dir, `${p.id}.pdf`));
      files.push(path.join(dir, `${p.id}.pdf`));
    } else if (Array.isArray(p.slides)) {
      files = await renderSlides(page, p.slides, kicker, dir, p.id);
    }
    if (p.header) files = await renderSlides(page, [p.header], p.header.kicker, dir, p.id);
    if (p.video) {
      const cover = await renderSlides(page, [{ kind: "cover", kicker: p.sector === "all" ? "NextResearch" : "Supply chain decoded", title: p.hook }], null, dir, `${p.id}-cover`);
      files.push(...cover);
      try {
        await copyFile(path.join(VIDEO, p.video), path.join(dir, `${p.id}.mp4`));
        files.push(path.join(dir, `${p.id}.mp4`));
      } catch {
        report.push(`${p.id}: video ${p.video} not recorded yet (npm run record)`);
      }
    }
    if (p.body) {
      // The copy sits in out/posts/<id>/, so re-point the source's image paths relative to it.
      const md = (await readFile(path.join(ROOT, p.body), "utf8"))
        .replaceAll("{{SITE}}", SITE)
        .replaceAll("../../out/posts/", "../")
        .replaceAll("../../out/raw/", "../../raw/");
      await writeFile(path.join(dir, path.basename(p.body)), md);
    }
    if (p.caption) await writeFile(path.join(dir, "caption.txt"), captionText(p));
    console.log(`ok   ${p.id} (${files.length} files)`);
  }
  await browser.close();
  if (report.length) console.log("\n" + report.join("\n"));
}

main();
