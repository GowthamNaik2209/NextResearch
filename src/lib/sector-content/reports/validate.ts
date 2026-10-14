// Structural checks for an authored SectorReport against its sector's content:
// every zone id and supplier key it references must exist (and be listed, since
// the deck pulls their financials), and each slide's list stays inside the size
// the slide layout was designed for. Used by `npm run validate:content`.
import type { SectorDef } from "../index";
import type { SectorReport } from "./types";

export function validateReport(report: SectorReport, sector: SectorDef): string[] {
  const out: string[] = [];
  const p = (m: string) => out.push(`[${report.slug}] report: ${m}`);
  const zoneIds = new Set(sector.zones.map((z) => z.id));
  const range = (name: string, n: number, lo: number, hi: number) => {
    if (n < lo || n > hi) p(`${name} has ${n} items (expected ${lo === hi ? lo : `${lo}-${hi}`})`);
  };

  range("keyStats", report.keyStats.length, 4, 4);
  range("thesis", report.thesis.length, 3, 3);
  range("developments", report.developments.length, 4, 6);
  range("overview.narrative", report.overview.narrative.length, 2, 3);
  range("overview.chart.points", report.overview.chart.points.length, 4, 8);
  range("overview.snapshot", report.overview.snapshot.length, 4, 6);
  range("valueChain", report.valueChain.length, 4, 6);
  range("drivers", report.drivers.length, 4, 4);
  range("mix.slices", report.mix.slices.length, 2, 5);
  range("beneficiaries", report.beneficiaries.length, 6, 10);
  range("companyNews", report.companyNews.length, 4, 6);
  range("risks", report.risks.length, 4, 4);
  range("reading", report.reading.length, 3, 6);
  for (const [k, pts] of Object.entries(report.pestle)) range(`pestle.${k}`, pts.length, 2, 2);

  const mixSum = report.mix.slices.reduce((a, s) => a + s.value, 0);
  if (Math.abs(mixSum - 100) > 2) p(`mix slices sum to ${mixSum}, expected ~100`);

  for (const stage of report.valueChain)
    for (const z of stage.zoneIds) if (!zoneIds.has(z)) p(`valueChain "${stage.stage}" references unknown zone "${z}"`);

  const checkKey = (where: string, key: string) => {
    const sup = sector.suppliers[key];
    if (!sup) p(`${where} references unknown supplier "${key}"`);
    else if (!sup.listed || !sup.f?.ticker) p(`${where} references unlisted supplier "${key}"`);
  };
  const seen = new Set<string>();
  for (const b of report.beneficiaries) {
    checkKey("beneficiaries", b.key);
    const t = sector.suppliers[b.key]?.f?.ticker;
    if (t && seen.has(t)) p(`beneficiaries lists ticker ${t} twice`);
    if (t) seen.add(t);
  }
  for (const n of report.companyNews) checkKey("companyNews", n.key);
  for (const r of report.reading) if (!/^https:\/\//.test(r.url)) p(`reading link "${r.title}" is not https`);
  return out;
}
