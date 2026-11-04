// "Return to where you came from" for the site's back-style buttons (the 3D explorer's ← Home /
// ← Overview, an industry page's ← All deep dives, a report page's ← All reports) and the
// full-screen heatmap / pools view's close. Browser-only: every function reads window.
//
// The trail is the page this tab was on before the current one (in memory, so soft navigations
// count; on a fresh document load, a same-origin referrer in a tab with history behind it). Each
// back-style button belongs to a scope (a group of pages, e.g. every explorer map): entering the
// scope from another page records that page in sessionStorage, moving inside it (the map
// switcher) keeps it, and arriving directly (a shared link, a new tab) clears it, so the button
// falls back to its usual link.

type Trail = { prev: string | null; cur: string; soft: boolean };
let trail: Trail | null = null;

const here = () => window.location.pathname + window.location.search + window.location.hash;
const pathOf = (url: string) => url.split(/[?#]/)[0] || "/";

function referrerPage(): string | null {
  // A new tab opened from a link has a referrer but nothing to go back to: count it as direct.
  if (window.history.length < 2 || !document.referrer) return null;
  try {
    const r = new URL(document.referrer);
    if (r.origin !== window.location.origin || r.pathname === window.location.pathname) return null;
    return r.pathname + r.search + r.hash;
  } catch {
    return null;
  }
}

/** Notes the current page. Called by NavTrail on every route change, and by readers before reading. */
export function noteVisit() {
  const url = here();
  if (!trail) trail = { prev: referrerPage(), cur: url, soft: false };
  // Same page with a new query or hash (picks, open views): keep what came before it.
  else if (pathOf(url) === pathOf(trail.cur)) trail.cur = url;
  else trail = { prev: trail.cur, cur: url, soft: true };
}

/** The site page this tab was on before this one (path, query and hash), or null on a direct arrival. */
export function cameFrom(): string | null {
  noteVisit();
  return trail!.prev;
}

export type ReturnScope = "explore" | "sector" | "docs";
const SCOPES: Record<ReturnScope, { inScope: (p: string) => boolean; accept: (p: string) => boolean }> = {
  // Every 3D map: switching maps keeps the page the visitor entered from.
  explore: { inScope: (p) => /^\/sector\/[^/]+\/explore$/.test(p), accept: (p) => p === "/" || /^\/sector\/[^/]+$/.test(p) },
  // An industry or policy page, with its explorer: back to the landing page or the Analysis page.
  sector: { inScope: (p) => p.startsWith("/sector/"), accept: (p) => p === "/" || p === "/docs" },
  docs: { inScope: (p) => /^\/docs\/[^/]+$/.test(p), accept: (p) => p === "/" || p === "/docs" },
};

/** Where a back-style button goes; `back` when that page is the history entry right behind this one. */
export type ReturnTarget = { href: string; back: boolean };

const KEY = "nr-return:";
function read(scope: ReturnScope): ReturnTarget | null {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(KEY + scope) ?? "null");
    return v && typeof v.href === "string" ? { href: v.href, back: !!v.back } : null;
  } catch {
    return null;
  }
}
function write(scope: ReturnScope, v: ReturnTarget | null) {
  try {
    if (v) window.sessionStorage.setItem(KEY + scope, JSON.stringify(v));
    else window.sessionStorage.removeItem(KEY + scope);
  } catch {
    /* storage blocked: the button keeps its usual link */
  }
}

function isFirstLoadReload() {
  if (trail?.soft) return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

/** Works out (and remembers) the return target for this page in `scope`. Call once per page, after mount. */
export function returnTarget(scope: ReturnScope): ReturnTarget | null {
  const from = cameFrom();
  const { inScope, accept } = SCOPES[scope];
  let rec = read(scope);
  if (from && !inScope(pathOf(from))) rec = accept(pathOf(from)) ? { href: from, back: true } : null;
  // Moved inside the scope: same target, but it is no longer the entry right behind this one.
  else if (from) rec = rec && { ...rec, back: false };
  else if (!isFirstLoadReload()) {
    // A direct arrival: nothing to return to, here or in any wider scope.
    (Object.keys(SCOPES) as ReturnScope[]).forEach((s) => write(s, null));
    return null;
  }
  write(scope, rec);
  return rec;
}

/** The button's words for a target: Home for the landing page, otherwise the button's own label. */
export function returnLabel(target: ReturnTarget | null, fallback: string) {
  return target && pathOf(target.href) === "/" ? "Home" : fallback;
}
