// Local dev only: every variant of the morning brief side by side, each at phone width, from one
// live build of the market part, so the edge cases can be checked before a send. Reads only.
//   /api/brief/gallery?email=<a signed-up user's address, for a real watchlist>
import { prisma } from "@/lib/prisma";
import { buildMarketBrief } from "@/lib/brief/market";
import { briefEmail, watchBriefs } from "@/lib/brief/run";
import type { MarketBrief, WatchBrief } from "@/lib/brief/types";

export const maxDuration = 60;
const LIVE_SITE = "https://nextresearchapp.in";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  const market = await buildMarketBrief();
  if (!market) return new Response("No market close to build from.", { status: 503 });

  const profile = await prisma.profile.findUnique({ where: { email }, select: { watchlist: { select: { priceAtAdd: true, company: { select: { ticker: true, name: true } } } } } });
  const [real] = await watchBriefs(market, [(profile?.watchlist ?? []).map((w) => ({ ticker: w.company.ticker, name: w.company.name, priceAtAdd: w.priceAtAdd.toNumber() }))]);
  const empty: WatchBrief = { items: [], deals: [], events: [] };
  // The rare parts all at once: more stocks than the list shows, a milestone each way, a price at
  // saving not known yet, a bulk deal and a results date.
  const busy: WatchBrief = {
    items: [
      ...real.items,
      { ticker: "X1", slug: "x1", name: "A stock that crossed a level", close: 1234.5, dayPct: 6.1, sincePct: 26.2, milestone: 25 },
      { ticker: "X2", slug: "x2", name: "A stock down past a level", close: 88.4, dayPct: -4.2, sincePct: -11.3, milestone: -10 },
      { ticker: "X3", slug: "x3", name: "Saved before its price was known", close: 410, dayPct: 0.3, sincePct: null },
    ].sort((a, b) => Math.abs(b.dayPct ?? 0) - Math.abs(a.dayPct ?? 0)),
    deals: [{ ticker: "X1", name: "A stock that crossed a level", text: "SBI Mutual Fund bought 1.2 cr shares at ₹1,230.00 (₹148 cr)" }],
    events: real.events.length ? real.events : [{ day: market.keyDates[0]?.day ?? market.day, what: "A stock results" }],
  };
  const sourcesDown: MarketBrief = { ...market, flows: null, breadth: null, themes: [], headlines: [], ipos: [], summary: market.indices.length ? market.summary.split(";")[0] + "." : "" };

  const cases: [string, MarketBrief, WatchBrief, boolean][] = [
    ["1 · First email, with a watchlist", market, real, true],
    ["2 · First email, empty watchlist", market, empty, true],
    ["3 · Later days, with a watchlist", market, real, false],
    ["4 · Rare parts: 10+ stocks, milestones, unknown price, a deal", market, busy, false],
    ["5 · Sources down: no flows, breadth, themes, headlines or IPOs", sourcesDown, empty, false],
  ];
  const frames = cases
    .map(([title, m, w, first]) => {
      const e = briefEmail(m, w, "preview", LIVE_SITE, first);
      return `<figure><figcaption><b>${esc(title)}</b><br><span>${esc(e.subject)}</span><br><i>${esc(e.preview)}</i></figcaption><iframe srcdoc="${esc(e.html)}" width="390" height="1500"></iframe></figure>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Morning brief variants</title><style>
body{margin:16px;font:13px -apple-system,sans-serif;background:#ddd5bd;color:#14201a}
main{display:flex;gap:20px;overflow-x:auto;align-items:flex-start}figure{margin:0;flex:none;width:390px}
figcaption{min-height:76px;margin-bottom:8px;line-height:1.4}figcaption span{color:#0f5c4a}figcaption i{color:#536157}
iframe{border:1px solid #b9ad8c;border-radius:12px;background:#fff}</style></head>
<body><p>Close of ${esc(market.day)} · ${profile ? `real watchlist of ${esc(email)} (${real.items.length} stocks)` : "no account given: watchlist cases use an empty list"}</p><main>${frames}</main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
