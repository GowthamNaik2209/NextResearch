// Deep Screener.in parse for the stock pop-up's Fundamentals tab: key ratios,
// compounded growth, shareholding, annual P&L and the *industry median* from
// the peer-comparison table (we show the median only, not the peer list).
//
// Same caveats as lib/scrapers/screener.ts: no public API, on-demand single
// company fetches only (cached), degrade to nothing on any failure, expect
// maintenance if screener.in changes its markup.
import { cached } from "./cache";
import { parseTopRatios, type ScreenerKpi } from "../scrapers/screener";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// One row of Screener's peer table (columns: CMP, P/E, Mar Cap, Div Yld, NP Qtr,
// Qtr Profit Var, Sales Qtr, Qtr Sales Var, ROCE). Used for the industry median
// footer and for the company's own row (so both sides of the comparison come
// from the same table/definitions).
export type PeerMetrics = { pe: number | null; marketCapCr: number | null; divYield: number | null; qtrProfitVarPct: number | null; qtrSalesVarPct: number | null; roce: number | null };

export type Series = { label: string; values: (number | null)[] };
export type Fundamentals = {
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

export async function getFundamentals(slug: string): Promise<Fundamentals | null> {
  return cached(`fund:${slug}`, 6 * 60 * 60 * 1000, async () => {
    try {
      // Consolidated first (matches the rest of the app), standalone as fallback.
      const base = `https://www.screener.in/company/${encodeURIComponent(slug)}`;
      const html = (await fetchText(`${base}/consolidated/`)) ?? (await fetchText(`${base}/`));
      if (!html) return null;

      const companyId = html.match(/data-company-id="(\d+)"/)?.[1] ?? null;
      const warehouseId = html.match(/data-warehouse-id="(\d+)"/)?.[1] ?? null;

      const cls = (title: string) => {
        const m = html.match(new RegExp(`<a [^>]*title="${title}"[^>]*>([\\s\\S]*?)</a>`));
        return m ? strip(m[1]) : undefined;
      };
      const classification = { broadSector: cls("Broad Sector"), sector: cls("Sector"), industry: cls("Industry") };

      const kpi = parseTopRatios(html);

      const growth = [...html.matchAll(/<table class="ranges-table">([\s\S]*?)<\/table>/g)].map((m) => ({
        title: strip(m[1].match(/<th[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? ""),
        rows: [...m[1].matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g)].map((r) => ({
          period: strip(r[1]).replace(/:$/, ""),
          value: strip(r[2]),
        })),
      }));

      let shareholding: Fundamentals["shareholding"] = null;
      const sh = sectionTable(html, "shareholding");
      if (sh) {
        const t = parseDataTable(sh);
        const last = t.cols.length - 1;
        if (last >= 0)
          shareholding = {
            period: t.cols[last],
            rows: t.rows.filter((r) => r.label && !/No\. of/i.test(r.label)).map((r) => ({ label: r.label, value: r.values[last] ?? null })),
          };
      }

      let annual: Fundamentals["annual"] = null;
      const pl = sectionTable(html, "profit-loss");
      if (pl) {
        const t = parseDataTable(pl);
        const keep = ["Sales", "Operating Profit", "OPM %", "Net Profit", "EPS in Rs"];
        const n = 6; // most recent six columns (incl. TTM when present)
        annual = {
          years: t.cols.slice(-n),
          series: t.rows.filter((r) => keep.includes(r.label)).map((r) => ({ label: r.label, values: r.values.slice(-n) })),
        };
      }

      let industry: Fundamentals["industry"] = null;
      if (warehouseId) {
        const peers = await fetchText(`https://www.screener.in/api/company/${warehouseId}/peers/`).catch(() => null);
        const foot = peers?.match(/<tfoot>([\s\S]*?)<\/tfoot>/)?.[1];
        if (foot) {
          const cellsOf = (tr: string) => [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
          // numeric columns start at index 2 in body rows ([#, name, CMP, P/E, ...]) and in the footer.
          const metrics = (c: string[]): PeerMetrics => ({
            pe: num(c[3] ?? ""),
            marketCapCr: num(c[4] ?? ""),
            divYield: num(c[5] ?? ""),
            qtrProfitVarPct: num(c[7] ?? ""),
            qtrSalesVarPct: num(c[9] ?? ""),
            roce: num(c[10] ?? ""),
          });
          const fc = cellsOf(foot);
          const count = parseInt(fc[1]?.match(/(\d+)/)?.[1] ?? "", 10);
          const selfRow = companyId ? peers?.match(new RegExp(`<tr data-row-company-id="${companyId}"[^>]*>([\\s\\S]*?)</tr>`))?.[1] : undefined;
          industry = {
            peerCount: Number.isFinite(count) ? count : null,
            median: metrics(fc),
            self: selfRow ? metrics(cellsOf(selfRow)) : null,
          };
        }
      }

      return { companyId, classification, kpi, industry, growth, shareholding, annual, fetchedAt: new Date().toISOString() } satisfies Fundamentals;
    } catch {
      return null;
    }
  });
}
