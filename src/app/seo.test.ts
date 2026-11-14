// The SEO / AEO gate (docs/SOP-NEW-MODULE.md, "SEO and AEO"): every page under src/app is either kept
// out of search (noindex, or a redirect) or wired for search and answer engines - its own canonical,
// link-preview tags, structured data, and a place in the sitemap and llms.txt. A new page that is none
// of these fails here, so a feature can't ship invisible to Google and AI assistants by accident.
// It reads the source files, so it runs without a database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP = join(process.cwd(), "src", "app");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "api" ? [] : pages(p);
    return name === "page.tsx" ? [p] : [];
  });
}

/** "src/app/baskets/industry/[slug]/page.tsx" -> "/baskets/industry/" (a dynamic route's fixed prefix). */
function routeOf(file: string): string {
  const parts = relative(APP, file).split(sep).slice(0, -1);
  const fixed = parts.findIndex((x) => x.startsWith("["));
  const path = `/${(fixed < 0 ? parts : parts.slice(0, fixed)).join("/")}`;
  return fixed < 0 ? path : `${path.replace(/\/$/, "")}/`;
}

// Indexable pages that meet a requirement somewhere other than their own page.tsx, each with why.
const ELSEWHERE: Record<string, { reason: string; skip: ("shareMeta" | "jsonLd" | "sitemap" | "llms")[] }> = {
  "/": { reason: "share tags in layout.tsx; structured data in layout.tsx and the landing FaqSection", skip: ["shareMeta", "jsonLd", "llms"] },
};
// A page whose canonical points at another page is a view of that page, not a page of its own.
const VIEW_OF_ANOTHER = ["/sector/[slug]/explore"];

const sitemap = readFileSync(join(APP, "sitemap.ts"), "utf8");
const llms = readFileSync(join(APP, "llms.txt", "route.ts"), "utf8");

test("every page is noindex, a redirect, or wired for search and answer engines", () => {
  const problems: string[] = [];
  for (const file of pages(APP)) {
    const src = readFileSync(file, "utf8");
    const rel = relative(APP, file);
    if (VIEW_OF_ANOTHER.some((v) => rel.startsWith(v.slice(1)))) continue;
    if (/index:\s*false/.test(src) && !/canonical/.test(src)) continue; // kept out of search
    if (/^\s*redirect\(/m.test(src) && !/metadata/.test(src)) continue; // only forwards elsewhere
    const route = routeOf(file);
    const skip = ELSEWHERE[route]?.skip ?? [];
    const need: [string, boolean][] = [
      ["a canonical (alternates.canonical)", /canonical/.test(src)],
      ["link-preview tags (shareMeta)", skip.includes("shareMeta") || /shareMeta\(/.test(src)],
      ["structured data (<JsonLd> or ld+json)", skip.includes("jsonLd") || /<JsonLd|ld\+json/.test(src)],
      [`a sitemap entry for ${route}`, skip.includes("sitemap") || route === "/" || sitemap.includes(`\${SITE_URL}${route}`)],
      [`an llms.txt line for ${route}`, skip.includes("llms") || llms.includes(`\${SITE_URL}${route}`)],
    ];
    for (const [what, ok] of need) if (!ok) problems.push(`${rel}: missing ${what}`);
  }
  assert.deepEqual(problems, [], `Pages not wired for SEO/AEO (see docs/SOP-NEW-MODULE.md):\n${problems.join("\n")}`);
});

test("robots.txt keeps account and API pages out, and nothing indexable", () => {
  const robots = readFileSync(join(APP, "robots.ts"), "utf8");
  for (const p of ["/api/", "/auth/", "/watchlist", "/login", "/signup"]) assert.ok(robots.includes(`"${p}"`), p);
  for (const p of ["/baskets", "/signals/indicators", "/updates", "/company"]) assert.ok(!robots.includes(`"${p}"`), `${p} must stay crawlable`);
});
