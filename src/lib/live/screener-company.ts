// Deep Screener.in parse for the stock pop-up's Fundamentals tab: key ratios,
// compounded growth, shareholding, annual P&L and the *industry median* from
// the peer-comparison table (we show the median only, not the peer list).
//
// Same caveats as screener-ratios.ts: no public API, on-demand single
// company fetches only (cached), degrade to nothing on any failure, expect
// maintenance if screener.in changes its markup.
import { cached } from "./cache";
import { parseTopRatios, type ScreenerKpi } from "./screener-ratios";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// One row of Screener's peer table (columns: CMP, P/E, Mar Cap, Div Yld, NP Qtr,
// Qtr Profit Var, Sales Qtr, Qtr Sales Var, ROCE). Used for the industry median
// footer and for the company's own row (so both sides of the comparison come
// from the same table/definitions).
export type PeerMetrics = { pe: number | null; marketCapCr: number | null; divYield: number | null; qtrProfitVarPct: number | null; qtrSalesVarPct: number | null; roce: number | null };

export type Series = { label: string; values: (number | null)[] };
export type Fundamentals = {
  // Where these figures came from: Screener.in (full set) or the Yahoo Finance fallback (partial).
  source: "screener" | "yahoo";
  // Which Screener statements: consolidated by default, standalone for companies that file only
  // standalone (their consolidated page is empty). null for the Yahoo fallback.
  basis: "consolidated" | "standalone" | null;
  companyId: string | null;
  classification: { broadSector?: string; sector?: string; industry?: string };
  kpi: ScreenerKpi | null;
  // Industry medians from the peers table's footer row.
  industry: { peerCount: number | null; median: PeerMetrics; self: PeerMetrics | null } | null;
  growth: { title: string; rows: { period: string; value: string }[] }[];
  shareholding: { period: string; rows: { label: string; value: number | null }[] } | null;
  annual: { years: string[]; series: Series[] } | null;
  fetchedAt: string;
};

const strip = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/\s*\+\s*$/, "").trim();
const num = (s: string) => {
  const n = parseFloat(s.replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function sectionTable(html: string, id: string): string | null {
  const i = html.indexOf(`id="${id}"`);
  if (i < 0) return null;
  const j = html.indexOf("<table", i);
  const k = html.indexOf("</table>", j);
  return j < 0 || k < 0 ? null : html.slice(j, k);
}

function parseDataTable(table: string) {
  const head = table.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  const cols = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => strip(m[1])).slice(1);
  const rows = [...(table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "").matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
    return { label: cells[0] ?? "", values: cells.slice(1).map(num) };
  });
  return { cols, rows };
}

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
  return res.ok ? res.text() : null;
}

// Screener serves a page at /consolidated/ for every company, but for one that only files
// standalone statements (Abbott India, Netweb, Bosch Home Comfort) that page is an empty
// template: blank ratios, "10 Years: %" growth rows, a P&L with no columns and no warehouse id
// (so no peers table either). Such a page is "unusable" and we read the standalone page instead.
export function isUsablePage(html: string): boolean {
  return parseTopRatios(html)?.price != null && /data-warehouse-id="\d+"/.test(html);
}

// A growth value is shown only when it holds a number ("12%", "-3%"); blank cells read "%".
const hasNumber = (v: string) => /\d/.test(v);

/** Parse one Screener company page (everything except the peers table, which is a second request). */
export function parseCompanyPage(html: string): Omit<Fundamentals, "source" | "basis" | "industry" | "fetchedAt"> & { warehouseId: string | null } {
  const companyId = html.match(/data-company-id="(\d+)"/)?.[1] ?? null;
  const warehouseId = html.match(/data-warehouse-id="(\d+)"/)?.[1] ?? null;

  const cls = (title: string) => {
    const m = html.match(new RegExp(`<a [^>]*title="${title}"[^>]*>([\\s\\S]*?)</a>`));
    return m ? strip(m[1]) || undefined : undefined;
  };
  const classification = { broadSector: cls("Broad Sector"), sector: cls("Sector"), industry: cls("Industry") };

  const kpi = parseTopRatios(html);

  const growth = [...html.matchAll(/<table class="ranges-table">([\s\S]*?)<\/table>/g)]
    .map((m) => ({
      title: strip(m[1].match(/<th[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? ""),
      rows: [...m[1].matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g)]
        .map((r) => ({ period: strip(r[1]).replace(/:$/, ""), value: strip(r[2]) }))
        .filter((r) => hasNumber(r.value)),
    }))
    .filter((g) => g.title && g.rows.length > 0);

  let shareholding: Fundamentals["shareholding"] = null;
  const sh = sectionTable(html, "shareholding");
  if (sh) {
    const t = parseDataTable(sh);
    const last = t.cols.length - 1;
    const rows = t.rows.filter((r) => r.label && !/No\. of/i.test(r.label)).map((r) => ({ label: r.label, value: r.values[last] ?? null }));
    if (last >= 0 && rows.some((r) => r.value != null)) shareholding = { period: t.cols[last], rows };
  }

  let annual: Fundamentals["annual"] = null;
  const pl = sectionTable(html, "profit-loss");
  if (pl) {
    const t = parseDataTable(pl);
    const keep = ["Sales", "Operating Profit", "OPM %", "Net Profit", "EPS in Rs"];
    const n = 6; // most recent six columns (incl. TTM when present)
    const series = t.rows
      .filter((r) => keep.includes(r.label))
      .map((r) => ({ label: r.label, values: r.values.slice(-n) }))
      .filter((r) => r.values.some((v) => v != null));
    if (t.cols.length > 0 && series.length > 0) annual = { years: t.cols.slice(-n), series };
  }

  return { companyId, warehouseId, classification, kpi, growth, shareholding, annual };
}

// numeric columns start at index 2 in body rows ([#, name, CMP, P/E, ...]) and in the footer.
const peerMetrics = (c: string[]): PeerMetrics => ({
  pe: num(c[3] ?? ""),
  marketCapCr: num(c[4] ?? ""),
  divYield: num(c[5] ?? ""),
  qtrProfitVarPct: num(c[7] ?? ""),
  qtrSalesVarPct: num(c[9] ?? ""),
  roce: num(c[10] ?? ""),
});
// A median of exactly 0 for these means "most peers have no value" (e.g. NHPC's power-generation
// group: most peers pay no dividend, or report no P/E), not a meaningful benchmark - comparing a
// 2.2% yield against "0%" reads as a data error, so it is shown as unavailable instead.
const ZERO_IS_MISSING: (keyof PeerMetrics)[] = ["pe", "marketCapCr", "divYield", "roce"];

/** Parse Screener's peers table (HTML fragment): the industry-median footer and the company's own row. */
export function parsePeers(peers: string, companyId: string | null): Fundamentals["industry"] {
  const foot = peers.match(/<tfoot>([\s\S]*?)<\/tfoot>/)?.[1];
  if (!foot) return null;
  const cellsOf = (tr: string) => [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
  const fc = cellsOf(foot);
  const median = peerMetrics(fc);
  for (const k of ZERO_IS_MISSING) if (median[k] === 0) median[k] = null;
  const count = parseInt(fc[1]?.match(/(\d+)/)?.[1] ?? "", 10);
  const selfRow = companyId ? peers.match(new RegExp(`<tr data-row-company-id="${companyId}"[^>]*>([\\s\\S]*?)</tr>`))?.[1] : undefined;
  return { peerCount: Number.isFinite(count) ? count : null, median, self: selfRow ? peerMetrics(cellsOf(selfRow)) : null };
}

export async function getFundamentals(slug: string): Promise<Fundamentals | null> {
  // Key carries a shape version so a deploy never serves objects cached by older code.
  return cached(`fund:v2:${slug}`, 6 * 60 * 60 * 1000, async () => {
    try {
      // Consolidated first (matches the rest of the app); standalone when the consolidated
      // page is missing or an empty template (see isUsablePage).
      const base = `https://www.screener.in/company/${encodeURIComponent(slug)}`;
      let basis: "consolidated" | "standalone" = "consolidated";
      let html = await fetchText(`${base}/consolidated/`);
      if (!html || !isUsablePage(html)) {
        const standalone = await fetchText(`${base}/`);
        if (standalone) {
          html = standalone;
          basis = "standalone";
        }
      }
      if (!html) return null;

      const { warehouseId, ...page } = parseCompanyPage(html);
      // Neither page had ratios: report "unreachable" so the route falls back to Yahoo.
      if (!page.kpi && !page.annual) return null;

      let industry: Fundamentals["industry"] = null;
      if (warehouseId) {
        const peers = await fetchText(`https://www.screener.in/api/company/${warehouseId}/peers/`).catch(() => null);
        if (peers) industry = parsePeers(peers, page.companyId);
      }

      return { source: "screener", basis, ...page, industry, fetchedAt: new Date().toISOString() } satisfies Fundamentals;
    } catch {
      return null;
    }
  });
}
