// Today's projections across the basket universe with price statistics fetched directly (the site
// loads them through Next's data cache instead): a summary for docs/PROJECTIONS.md. Read-only.
//   npx tsx scripts/projections-today.ts
import { installFinancialsFromDatabase } from "../src/lib/financials/test-db";
import { listCompanyPages } from "../src/lib/sector-content/companies";
import { getChartWithFallback, getSymbolChart } from "../src/lib/live/yahoo";
import { homeIndustryOf, projectionInputFor } from "../src/lib/baskets/projection-data";
import { fundamentalScore, median, projectStock, scoreScale } from "../src/lib/baskets/projection";
import { riskOf } from "../src/lib/baskets/projection-risk";

async function main() {
  await installFinancialsFromDatabase();
  const index = (await getSymbolChart("^NSEI", "2Y"))?.points ?? [];
  const tickers = listCompanyPages().map((p) => p.ticker);
  const risk = new Map<string, ReturnType<typeof riskOf>>();
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < tickers.length) {
      const t = tickers[i++];
      const pts = (await getChartWithFallback(t, "2Y").catch(() => null))?.points;
      if (pts?.length) risk.set(t, riskOf(pts, index));
    }
  }));
  const inputs = tickers.map((t) => { const x = projectionInputFor(t, homeIndustryOf(t)); return x ? { t, x: { ...x, risk: risk.get(t) ?? null } } : null; }).filter((v) => v != null);
  const scale = scoreScale(inputs.map((v) => fundamentalScore(v.x)).filter((s): s is number => s != null));
  const ps = inputs.map((v) => ({ t: v.t, p: projectStock(v.x, scale) }));
  const okp = ps.flatMap((v) => (v.p.ok ? [{ t: v.t, p: v.p }] : []));
  const q = (f: (p: (typeof okp)[number]["p"]) => number) => median(okp.map((v) => f(v.p)))!;
  const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
  console.log(`companies ${tickers.length}; projected ${okp.length}; left out ${ps.length - okp.length + (tickers.length - inputs.length)}; price stats for ${risk.size}`);
  console.log(`score scale: median ${pct(scale.median)} sd ${pct(scale.sd)} n ${scale.n}`);
  console.log(`median beta ${q((p) => p.beta).toFixed(2)}  vol ${pct(q((p) => p.vol))}  div ${pct(q((p) => p.divYield))}  market ${pct(q((p) => p.market))}  tilt ${pct(q((p) => p.tilt))}`);
  console.log(`1Y median Bear ${pct(q((p) => p.ret["1"][0]))} Base ${pct(q((p) => p.ret["1"][1]))} Bull ${pct(q((p) => p.ret["1"][2]))}`);
  console.log(`2Y median Bear ${pct(q((p) => p.ret["2"][0]))} Base ${pct(q((p) => p.ret["2"][1]))} Bull ${pct(q((p) => p.ret["2"][2]))}`);
  const by = (k: string) => okp.filter((v) => (k === "market" ? v.p.method === "market" : k.startsWith("vol:") ? v.p.volSource === k.slice(4) : v.p.betaSource === k.slice(5))).length;
  console.log(`method market ${by("market")}; vol from prices ${by("vol:prices")}, range ${by("vol:range")}, floor ${by("vol:floor")}; beta default ${by("beta:default")}`);
  const base = okp.map((v) => v.p.ret["1"][1]).sort((a, b) => a - b);
  console.log(`1Y Base range ${pct(base[0])} .. ${pct(base[base.length - 1])}; top: ${[...okp].sort((a, b) => b.p.ret["1"][1] - a.p.ret["1"][1]).slice(0, 5).map((v) => `${v.t} ${pct(v.p.ret["1"][1])} (b${v.p.beta.toFixed(2)})`).join(", ")}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
