// Builds the data behind the content-calendar review page (calendar/index.html):
//   calendar/posts.json       every post from content/inventory.mjs, captions resolved
//   calendar/thumbs/<id>.jpg  a small preview of each post's first composed image
//   content/exports/*.md      copy-paste exports per platform (for scheduling tools / docs)
// Run after `npm run compose`.
import ffmpeg from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { META, POSTS, DISCLAIMER } from "../content/inventory.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const POSTS_DIR = path.join(ROOT, "out", "posts");
const CAL = path.join(ROOT, "calendar");
const SITE = process.env.SITE_URL ?? "{{SITE}}";
const sub = (t) => (t ?? "").replaceAll("{{SITE}}", SITE);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(path.join(CAL, "thumbs"), { recursive: true });
  await mkdir(path.join(ROOT, "content", "exports"), { recursive: true });
  const out = [];
  for (const p of POSTS) {
    const dir = path.join(POSTS_DIR, p.id);
    const files = (await exists(dir)) ? (await readdir(dir)).sort() : [];
    const pngs = files.filter((f) => f.endsWith(".png") && !f.includes("-cover"));
    const cover = files.find((f) => f.includes("-cover") && f.endsWith(".png"));
    const first = cover ?? pngs[0];
    let thumb = null;
    if (first) {
      thumb = `thumbs/${p.id}.jpg`;
      execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", path.join(dir, first), "-vf", "scale=432:-1", "-q:v", "4", path.join(CAL, thumb)]);
    }
    // Light JPEG previews of every slide for the review page's side sheet (full PNGs stay local).
    const previews = [];
    if (pngs.length || cover) await mkdir(path.join(CAL, "assets", p.id), { recursive: true });
    for (const f of [...(cover ? [cover] : []), ...pngs]) {
      const rel = `assets/${p.id}/${f.replace(/\.png$/, ".jpg")}`;
      execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", path.join(dir, f), "-vf", "scale=540:-1", "-q:v", "5", path.join(CAL, rel)]);
      previews.push(rel);
    }
    out.push({
      previews,
      id: p.id,
      platform: p.platform,
      date: p.date,
      time: p.time,
      format: p.format,
      pillar: p.pillar,
      sector: p.sector,
      title: p.title,
      hook: p.hook ?? p.subtitle ?? "",
      caption: sub(p.caption),
      hashtags: p.hashtags ?? [],
      firstComment: sub(p.firstComment),
      link: sub(p.link),
      onScreen: p.onScreen ?? null,
      audio: p.audio ?? null,
      sources: p.sources ?? [],
      compliance: p.compliance ?? null,
      storyFollowUp: p.storyFollowUp ?? null,
      note: p.note ?? null,
      assets: files.filter((f) => !f.endsWith(".html")),
      slideCount: typeof p.slides === "string" ? `reuses ${p.slides}` : Array.isArray(p.slides) ? p.slides.length : p.video ? "video" : 1,
      thumb,
    });
  }
  await writeFile(path.join(CAL, "posts.json"), JSON.stringify({ meta: META, disclaimer: DISCLAIMER, generated: new Date().toISOString(), posts: out }, null, 1));

  for (const platform of ["instagram", "linkedin", "substack"]) {
    const rows = out.filter((p) => p.platform === platform);
    const md = [`# ${platform[0].toUpperCase() + platform.slice(1)} - ${META.start} to ${META.end}`, ""];
    for (const p of rows) {
      md.push(`## ${p.date} ${p.time} IST · ${p.id} · ${p.title}`, "", `Format: ${p.format} · Pillar: ${p.pillar} · Assets: media/out/posts/${p.id}/`, "");
      if (p.caption) md.push("```", p.caption, "", p.hashtags.join(" "), "```", "");
      if (p.firstComment) md.push(`First comment: ${p.firstComment}`, "");
      if (p.onScreen) md.push(`On-screen text: ${p.onScreen.join(" / ")}`, "");
      md.push(`Sources: ${p.sources.join("; ")}`, "");
    }
    await writeFile(path.join(ROOT, "content", "exports", `${platform}.md`), md.join("\n"));
  }
  console.log(`${out.length} posts -> calendar/posts.json, ${out.filter((p) => p.thumb).length} thumbnails, 3 exports`);
}

main();
