// Shape and sanity checks for an authored IPO deck - run by `scripts/check-ipo.ts` and the
// content test. Returns human-readable problems; an empty list means the deck is well formed.
import { companyFinancials } from "../sector-content";
import type { IpoReport } from "./types";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const near100 = (xs: number[]) => Math.abs(sum(xs) - 100) <= 2;

export function validateIpo(r: IpoReport): string[] {
  const p: string[] = [];
  const need = (ok: unknown, msg: string) => !ok && p.push(msg);

  need(/^[a-z0-9-]+$/.test(r.slug), `slug "${r.slug}" must be kebab-case`);
  need(r.icon.length >= 2 && r.icon.length <= 4, "icon must be 2-4 characters");
  need(r.timeline.length >= 3 && r.timeline.length <= 8, "timeline needs 3-8 milestones");
  need(r.keyStats.length === 4, "keyStats needs exactly 4");
  need(r.thesis.length === 3, "thesis needs exactly 3");
  need(r.business.narrative.length >= 1 && r.business.narrative.length <= 3, "business.narrative needs 1-3 paragraphs");
  need(r.business.segments.length >= 3 && r.business.segments.length <= 5, "business.segments needs 3-5");
  need(r.business.mix.slices.length >= 2 && r.business.mix.slices.length <= 6, "business.mix needs 2-6 slices");
  need(near100(r.business.mix.slices.map((s) => s.value)), `business.mix sums to ${sum(r.business.mix.slices.map((s) => s.value))}, not ~100`);
  need(r.industry.chart.points.length >= 3 && r.industry.chart.points.length <= 8, "industry.chart needs 3-8 points");
  need(r.industry.snapshot.length >= 4 && r.industry.snapshot.length <= 6, "industry.snapshot needs 4-6 rows");
  need(r.financials.years.length >= 3 && r.financials.years.length <= 4, "financials needs 3-4 periods");
  need(r.kpi.points.length >= 3 && r.kpi.points.length <= 8, "kpi needs 3-8 points");
  need(r.ratios.length >= 5 && r.ratios.length <= 8, "ratios needs 5-8 rows");
  need(r.shareholding.length >= 2, "shareholding needs at least 2 holder groups");
  need(near100(r.shareholding.map((s) => s.pct)), `shareholding sums to ${sum(r.shareholding.map((s) => s.pct)).toFixed(1)}%, not ~100`);
  need(r.peers.length >= 3 && r.peers.length <= 6, "peers needs 3-6");
  // One set of numbers per company: an NSE peer's figures come from the shared company table.
  for (const peer of r.peers) {
    if (!peer.ticker) continue;
    need(companyFinancials(peer.ticker), `peer ${peer.ticker} is not in the company table - run scripts/refresh-financials.ts --add=${peer.ticker}`);
    need(peer.mcapCr === undefined && peer.revenueCr === undefined && peer.pe === undefined, `peer ${peer.ticker}: leave out mcapCr/revenueCr/pe - they come from the company table`);
    need(!/\b(Screener|TTM|trailing)\b/i.test(peer.note), `peer ${peer.ticker}: note should say why it compares, not restate figures or their source`);
  }
  need(r.strengths.length === 4, "strengths needs exactly 4");
  need(r.risks.length >= 4 && r.risks.length <= 5, "risks needs 4-5");
  need(r.sources.length >= 3 && r.sources.length <= 8, "sources needs 3-8");
  need(r.useOfProceeds.length > 0 || (r.issue.freshCr ?? 0) === 0, "a fresh issue needs useOfProceeds");
  need(r.sellers.length === 0 || !!r.issue.ofsCr || !!r.issue.ofsShares, "sellers listed but the issue has no offer for sale");

  // Charts are read as time series (growth headlines): one point per period, in order.
  for (const [name, pts] of [["industry.chart", r.industry.chart.points], ["kpi", r.kpi.points]] as const) {
    const labels = pts.map((p) => p.label);
    need(new Set(labels).size === labels.length, `${name}: duplicate period labels (${labels.join(", ")})`);
    const years = labels.map((l) => l.match(/\d{4}|\d{2}/)?.[0]).map((y) => (y ? (y.length === 2 ? 2000 + +y : +y) : NaN));
    need(years.every((y, i) => Number.isFinite(y) && (i === 0 || y >= years[i - 1])), `${name}: labels must be periods in time order (${labels.join(", ")})`);
  }

  const { totalCr, freshCr, ofsCr } = r.issue;
  if (totalCr != null && freshCr != null && ofsCr != null) {
    need(Math.abs(totalCr - freshCr - ofsCr) <= Math.max(5, totalCr * 0.01), `issue: fresh ${freshCr} + OFS ${ofsCr} != total ${totalCr}`);
  }
  if (freshCr && r.useOfProceeds.length) {
    const used = sum(r.useOfProceeds.map((u) => u.valueCr));
    need(used <= freshCr * 1.01, `useOfProceeds adds to ${used}, more than the fresh issue ${freshCr}`);
  }
  for (const y of r.financials.years) need(y.revenue > 0, `financials ${y.label}: revenue must be positive`);
  for (const s of r.sources) need(/^https:\/\//.test(s.url), `source "${s.title}" needs an https URL`);
  // The deck lists sources by URL (also the React key), so one page is cited once.
  const urls = r.sources.map((s) => s.url);
  need(new Set(urls).size === urls.length, `sources: a URL is listed twice (${urls.filter((u, i) => urls.indexOf(u) !== i).join(", ")})`);
  const all = JSON.stringify(r);
  // Issue-price and listing-day facts are history and stay; a quoted current price or market cap
  // ("trades at ~₹84,500 Cr") goes stale in days. Listed peers' figures come from the table.
  const live = all.match(/\b(closed at|trades at|trading at|traded (near|at))\s+~?(?:Rs\s?|₹)[\d,.]+[^"]{0,40}\b20\d\d|\b(mid-|on \d{1,2} )?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* 20\d\d\b[^".]{0,30}\b(trades|traded|closed) (at|near) ~?(?:Rs|₹)|\b(trades|traded|closed) (at|near) ~?(?:Rs|₹)[^".]{0,40}\bin (mid-|early |late )?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* 20\d\d/);
  need(!live, `quotes a current price or market cap ("${live?.[0]}") - those go stale; point to the peer table instead`);
  need(!/P\/E[^"]{0,20}\((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* 20\d\d\)/.test(all), "quotes peers' P/E as of a month - the peer table carries their current figures");
  need(!/TODO|TBD|lorem|XXX/i.test(all), "placeholder text left in the deck");
  return p;
}
