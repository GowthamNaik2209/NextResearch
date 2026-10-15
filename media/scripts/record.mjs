// Records short screen videos of the 3D explorer for Reels / LinkedIn video, into out/video/.
// Uses Chrome's own screencast (CDP Page.startScreencast) rather than Playwright's recorder,
// which needs a separate Playwright-built ffmpeg: frames are timestamped JPEGs, stitched with
// their real durations by ffmpeg-static into H.264 MP4 (what Instagram and LinkedIn accept).
// Headless Chrome renders WebGL on the Mac's GPU via ANGLE/Metal (~30fps; SwiftShader manages ~2).
//
//   BASE_URL=https://<your-domain> npm run record
//   npm run record -- naval          # only that sector
import { chromium } from "playwright-core";
import ffmpeg from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "out", "video");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const filter = process.argv[2];

// One featured layer per sector: the clip flies through the sector's camera views, then
// taps this layer so its supplier sheet slides up.
export const SCENES = {
  datacenter: "UPS & Diesel Backup Power",
  ev4w: "Battery pack & cells",
  semiconductors: "OSAT / ATMP",
  railways: "Signaling, Train Control (Kavach) & Onboard Electronics",
  naval: "Warship & Submarine Construction (Shipyards)",
  aerospace: "Forgings, Castings & Special Alloys",
  telecom5g: "Telecom Towers & Passive Infrastructure",
  solarmodules: "Solar Cell Manufacturing",
  energy: "Battery Storage (BESS) Manufacturing",
};

// Phone-width CSS viewports (under the explorer's 768px breakpoint) so it uses its full-screen
// mobile layout; the device scale factor brings each up to the upload resolution. The
// screencast captures the browser *window*, not Playwright's emulated viewport, so the window
// itself is sized (headless Chrome won't go narrower than 500px, hence these widths).
const FORMATS = {
  reel: { viewport: { width: 500, height: 889 }, deviceScaleFactor: 2.16, out: [1080, 1920] }, // 9:16 Reels/Shorts
  feed: { viewport: { width: 540, height: 675 }, deviceScaleFactor: 2, out: [1080, 1350] }, // 4:5 feed video
};

async function sizeWindow(page, cdp, { width, height }) {
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", { windowId, bounds: { width, height } });
  const inner = await page.evaluate(() => innerHeight);
  // Headless still reserves some window chrome; grow the window by whatever it ate.
  if (inner !== height) await cdp.send("Browser.setWindowBounds", { windowId, bounds: { width, height: height + (height - inner) } });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const [fmt, { viewport, deviceScaleFactor, out }] of Object.entries(FORMATS)) {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--ignore-gpu-blocklist", "--use-gl=angle", `--force-device-scale-factor=${deviceScaleFactor}`],
    });
    for (const [slug, layer] of Object.entries(SCENES)) {
      if (filter && !slug.includes(filter)) continue;
      const ctx = await browser.newContext({ viewport: null });
      await ctx.addInitScript(() => {
        try {
          localStorage.setItem("nr-theme", "dark");
        } catch {}
      });
      const page = await ctx.newPage();
      const frameDir = path.join(OUT, `.frames-${slug}-${fmt}`);
      await rm(frameDir, { recursive: true, force: true });
      await mkdir(frameDir, { recursive: true });
      const frames = [];
      const cdp = await ctx.newCDPSession(page);
      await page.goto("about:blank");
      await sizeWindow(page, cdp, viewport);
      cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
        const file = path.join(frameDir, `${String(frames.length).padStart(5, "0")}.jpg`);
        frames.push({ file, t: metadata.timestamp });
        await writeFile(file, Buffer.from(data, "base64"));
        await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
      });
      try {
        await page.goto(`${BASE}/sector/${slug}/explore`, { waitUntil: "networkidle", timeout: 90000 });
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.waitForTimeout(2500);
        await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: out[0], maxHeight: out[1], everyNthFrame: 1 });
        await page.waitForTimeout(1500);
        // Fly through up to 3 camera views (the buttons live in the collapsed controls panel on
        // phones, so click them in-page rather than through the hidden UI).
        const views = await page.evaluate(() => document.querySelectorAll(".view-btn").length);
        for (let i = 1; i < Math.min(views, 4); i++) {
          await page.evaluate((n) => document.querySelectorAll(".view-btn")[n]?.click(), i);
          await page.waitForTimeout(2200);
        }
        await page.evaluate(() => document.querySelectorAll(".view-btn")[0]?.click());
        await page.waitForTimeout(1800);
        await page.getByText(layer, { exact: true }).locator("visible=true").first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(4000);
        await cdp.send("Page.stopScreencast");
      } catch (e) {
        console.log(`FAIL ${slug}/${fmt}: ${String(e).split("\n")[0]}`);
      }
      await ctx.close();
      if (frames.length < 10) {
        console.log(`FAIL ${slug}/${fmt}: only ${frames.length} frames`);
        continue;
      }
      // concat-demuxer list with each frame's real on-screen duration (screencast only emits on change).
      const lines = [];
      frames.forEach((f, i) => {
        const dur = i < frames.length - 1 ? Math.max(frames[i + 1].t - f.t, 0.001) : 1;
        lines.push(`file '${f.file}'`, `duration ${dur.toFixed(4)}`);
      });
      lines.push(`file '${frames[frames.length - 1].file}'`);
      const list = path.join(frameDir, "list.txt");
      await writeFile(list, lines.join("\n"));
      const mp4 = path.join(OUT, `explore-${slug}-${fmt}.mp4`);
      const [w, h] = out;
      execFileSync(ffmpeg, [
        "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
        "-vf", `fps=30,scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x0c1110`,
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4,
      ]);
      await rm(frameDir, { recursive: true, force: true });
      console.log(`ok   ${path.basename(mp4)} (${frames.length} frames)`);
    }
    await browser.close();
  }
}

main();
