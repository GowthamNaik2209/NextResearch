// Action titles for the IPO deck slides, derived from each deck's numbers where they can be (the
// research decks do the same in components/research/headlines.ts). Pure, so a script can print
// every deck's headlines and check them.
import type { IpoDeck } from "@/lib/ipo-content";
import { countWord, growthLine, lcFirst } from "@/components/research/headlines";

const inr = (n: number) => Math.round(n).toLocaleString("en-IN");
export const fmtCr = (n: number | null | undefined) =>
  n == null ? "—" : Math.abs(n) >= 100000 ? `Rs ${(n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh Cr` : `Rs ${inr(n)} Cr`;

/** Full fiscal years only: a stub period is not comparable for growth. */
export const fullYears = (d: IpoDeck) => d.financials.years.filter((y) => !y.partial);

export function revenueGrowth(d: IpoDeck) {
  const ys = fullYears(d);
  if (ys.length < 2) return null;
  const a = ys[0];
  const b = ys[ys.length - 1];
  const n = ys.length - 1;
  return { a, b, cagr: (Math.pow(b.revenue / a.revenue, 1 / n) - 1) * 100 };
}

export function issueTitle(d: IpoDeck) {
  const { freshCr, ofsCr, totalCr, ofsShares } = d.issue;
  if (freshCr && !ofsCr && !ofsShares) return `An all-fresh issue: every rupee raised goes into ${d.name}, none to selling shareholders`;
  if (!freshCr && (ofsCr || ofsShares)) return `A pure offer for sale: existing shareholders sell, and ${d.name} raises no new money`;
  if (freshCr && ofsCr && totalCr) return `${Math.round((freshCr / totalCr) * 100)}% of the ${fmtCr(totalCr)} issue is fresh capital; the rest lets existing investors sell down`;
  if (freshCr) return `A ${fmtCr(freshCr)} fresh issue for growth, alongside an offer for sale by existing investors`;
  return `How the ${d.name} issue is structured and where it stands`;
}

export function businessTitle(d: IpoDeck) {
  const top = [...d.business.mix.slices].sort((a, b) => b.value - a.value)[0];
  if (!top) return `What ${d.name} does and where its revenue comes from`;
  return `${+top.value.toFixed(1)}% of revenue comes from ${lcFirst(top.label)}`;
}

export function financialsTitle(d: IpoDeck) {
  const g = revenueGrowth(d);
  const ys = fullYears(d);
  const last = ys[ys.length - 1];
  const first = ys[0];
  if (!g || !last) return `${d.name}'s reported financials`;
  const growth = `Revenue grew ${g.cagr.toFixed(0)}% a year from ${g.a.label} to ${g.b.label}`;
  if (last.pat == null) return `${growth}; profit is not disclosed for every year`;
  if (last.pat > 0 && first.pat != null && first.pat <= 0) return `${growth} and the company turned profitable`;
  if (last.pat > 0) return `${growth}, with ${fmtCr(last.pat)} of profit in ${last.label}`;
  if (first.pat != null && first.pat < 0 && Math.abs(last.pat) < Math.abs(first.pat)) return `${growth} while losses narrowed to ${fmtCr(Math.abs(last.pat))}`;
  return `${growth}, but it lost ${fmtCr(Math.abs(last.pat))} in ${last.label}`;
}

export function proceedsTitle(d: IpoDeck) {
  const top = d.useOfProceeds[0];
  if (!top || !d.issue.freshCr) return `No fresh money: the offer only changes who owns ${d.name}`;
  const pct = Math.round((top.valueCr / d.issue.freshCr) * 100);
  // Objects are usually written as verbs ("Repay borrowings of ..."); read them as "to repay ...".
  const what = lcFirst(top.label);
  const verb = /^(re|pre)?pay|^fund|^invest|^acquire|^purchase|^set up|^expand/i.test(top.label);
  if (pct >= 50) return `${pct}% of the fresh issue (${fmtCr(top.valueCr)}) is earmarked ${verb ? "to " : "for "}${what}`;
  return `The largest single use of the fresh issue, ${pct}% of it (${fmtCr(top.valueCr)}), is ${verb ? "to " : "for "}${what}`;
}

export function peersTitle(d: IpoDeck) {
  const v = d.issue.valuationCr;
  if (v == null) return `How ${d.name} lines up against listed peers`;
  const priced = d.peers.filter((p) => p.mcapCr != null);
  const bigger = priced.filter((p) => p.mcapCr! > v).length;
  const verb = d.status.stage === "listed" ? "listed" : "would list";
  if (bigger === 0) return `At ${fmtCr(v)}, ${d.name} ${verb} larger than every peer here`;
  if (bigger === priced.length) return `At ${fmtCr(v)}, ${d.name} ${verb} smaller than ${priced.length === 2 ? "both" : `all ${countWord(priced.length)}`} peers here`;
  return `At ${fmtCr(v)}, ${d.name} ${verb} behind ${countWord(bigger)} of the ${countWord(priced.length)} peers here`;
}

const capFirst = (t: string) => t[0].toUpperCase() + t.slice(1);

export function risksTitle(d: IpoDeck) {
  const high = d.risks.filter((r) => r.severity === "high").length;
  const strengths = capFirst(countWord(d.strengths.length));
  return high
    ? `${strengths} strengths, but ${countWord(high)} high-severity risk${high === 1 ? "" : "s"} to weigh first`
    : `${strengths} strengths; the risks are real but none is rated high`;
}

// The operating KPI's move over the chart: a share or rate in percentage points, a count as a
// multiple or a percentage change.
export function kpiTitle(d: IpoDeck) {
  const pts = d.kpi.points.filter((p) => !p.projected);
  const a = pts[0];
  const b = pts[pts.length - 1];
  const name = capFirst(lcFirst(d.kpi.title));
  if (!a || !b || a === b || a.value <= 0) return `${d.kpi.title}: the operating metric to watch`;
  const fmt = (v: number) => (+v.toFixed(1)).toLocaleString("en-IN");
  if (d.kpi.unit.includes("%")) return `${name} went from ${fmt(a.value)}% in ${a.label} to ${fmt(b.value)}% in ${b.label}`;
  const x = b.value / a.value;
  if (x >= 1.95) return `${name} grew ${x.toFixed(1)}x from ${a.label} to ${b.label}`;
  return `${name} ${x >= 1 ? "rose" : "fell"} ${Math.abs((x - 1) * 100).toFixed(0)}% from ${a.label} to ${b.label}`;
}

// The market chart's growth, the way the research decks' overview slide reads.
export function industryTitle(d: IpoDeck) {
  const c = d.industry.chart;
  const g = growthLine(c.points);
  if (!g) return c.title;
  const fmt = (v: number) => (+v.toFixed(v < 100 ? 1 : 0)).toLocaleString("en-IN");
  const year = (l: string) => l.replace(/(\d)[PE]$/, "$1");
  const head = `${c.title} grew ${g.cagr.toFixed(0)}% a year from ${g.a.label} to ${year(g.b.label)}`;
  // "Rs trillion" / "US$ bn" read as "Rs 62 trillion" / "US$80 bn"; other units follow the number.
  const m = c.unit.match(/^(Rs|US\$)\s*(.*)$/);
  const amount = m ? `${m[1] === "Rs" ? "Rs " : "US$"}${fmt(g.end?.value ?? 0)} ${m[2]}` : `${fmt(g.end?.value ?? 0)} ${c.unit}`;
  return g.end ? `${head}, and is projected at ${amount} by ${year(g.end.label)}` : head;
}
