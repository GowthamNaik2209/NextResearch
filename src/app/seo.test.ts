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
    return /^page\.(tsx|ts|jsx|js|mdx)$/.test(name) ? [p] : [];
  });
}

/** The file's path under src/app with "/" separators, on any OS. */
const relPath = (file: string) => relative(APP, file).split(sep).join("/");

/** "src/app/baskets/industry/[slug]/page.tsx" -> "/baskets/industry/" (a dynamic route's fixed prefix). Route groups "(x)" aren't in the URL. */
function routeOf(file: string): string {
  const parts = relPath(file)
    .split("/")
    .slice(0, -1)
    .filter((x) => !/^\(.*\)$/.test(x));
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

// Comments out, so a comment that mentions "canonical" or a URL doesn't count as the thing itself.
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const sitemap = code(readFileSync(join(APP, "sitemap.ts"), "utf8"));
const llms = code(readFileSync(join(APP, "llms.txt", "route.ts"), "utf8"));

/**
 * The route's URL in a list file: a fixed page as the exact URL (followed by the closing backtick of
 * its string, or the ")" of a markdown link), so "/updates?view=flows" doesn't stand in for "/updates";
 * a dynamic route as its prefix followed by the interpolated slug.
 */
const listed = (list: string, route: string) => {
  const url = `\${SITE_URL}${route}`;
  return route.endsWith("/") ? list.includes(`${url}\${`) : ["`", ")"].some((end) => list.includes(url + end));
};

test("every page is noindex, a redirect, or wired for search and answer engines", () => {
  const problems: string[] = [];
  for (const file of pages(APP)) {
    const src = code(readFileSync(file, "utf8"));
    const rel = relPath(file);
    if (VIEW_OF_ANOTHER.some((v) => rel.startsWith(v.slice(1)))) continue;
    const canonical = /alternates:\s*\{[^}]*canonical/.test(src);
    if (/index:\s*false/.test(src) && !canonical) continue; // kept out of search
    // Only forwards elsewhere: a default export that is nothing but a redirect, and no metadata.
    if (/export default function \w*\(\)\s*\{\s*redirect\([^)]*\);?\s*\}/.test(src) && !/metadata/i.test(src)) continue;
    const route = routeOf(file);
    const skip = ELSEWHERE[route]?.skip ?? [];
    const need: [string, boolean][] = [
      ["a canonical (alternates.canonical)", canonical],
      ["link-preview tags (shareMeta)", skip.includes("shareMeta") || /shareMeta\(/.test(src)],
      ["structured data (<JsonLd> or ld+json)", skip.includes("jsonLd") || /<JsonLd|ld\+json/.test(src)],
      [`a sitemap entry for ${route}`, skip.includes("sitemap") || route === "/" || listed(sitemap, route)],
      [`an llms.txt line for ${route}`, skip.includes("llms") || listed(llms, route)],
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
