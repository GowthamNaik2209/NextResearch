// Live-refresh KPIs from Screener.in's company page. There's no public API for
// this — screener.in's own ToS prohibits automated/bulk access, which this
// function does engage in (one request per stale company-detail view). This
// was a deliberate, informed choice: keep requests to on-demand single-company
// fetches only (never bulk/background), degrade silently to cached DB data on
// any failure, and expect this to need maintenance whenever screener.in changes
// its markup.
//
// Structure this parses (confirmed against a live page, Oct 2026):
//   <ul id="top-ratios">
//     <li class="flex flex-space-between" data-source="default">
//       <span class="name">Stock P/E</span>
//       <span class="nowrap value"><span class="number">29.2</span></span>
//     </li>
//     ...
//   </ul>
// "High / Low" is the one row with two <span class="number"> values instead of one.

export type ScreenerKpi = {
  price: number | null;
  marketCap: string | null;
  pe: number | null;
  bookValue: number | null;
  divYield: number | null;
  roce: number | null;
  roe: number | null;
  faceValue: number | null;
  low52w: number | null;
  high52w: number | null;
};

type NumericField = "pe" | "bookValue" | "divYield" | "roce" | "roe" | "faceValue";

const LABEL_TO_FIELD: Record<string, NumericField> = {
  "Stock P/E": "pe",
  "Book Value": "bookValue",
  "Dividend Yield": "divYield",
  ROCE: "roce",
  ROE: "roe",
  "Face Value": "faceValue",
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function parseNumber(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function scrapeScreenerKpi(ticker: string): Promise<ScreenerKpi | null> {
  try {
    const res = await fetch(`https://www.screener.in/company/${encodeURIComponent(ticker)}/consolidated/`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ratiosBlock = html.match(/<ul id="top-ratios">([\s\S]*?)<\/ul>/)?.[1];
    if (!ratiosBlock) return null;

    const result: ScreenerKpi = {
      price: null,
      marketCap: null,
      pe: null,
      bookValue: null,
      divYield: null,
      roce: null,
      roe: null,
      faceValue: null,
      low52w: null,
      high52w: null,
    };

    const liRegex = /<li class="flex flex-space-between"[^>]*>([\s\S]*?)<\/li>/g;
    let match: RegExpExecArray | null;
    let foundAny = false;
    while ((match = liRegex.exec(ratiosBlock))) {
      const li = match[1];
      const name = li.match(/<span class="name">\s*([\s\S]*?)\s*<\/span>/)?.[1]?.trim();
      if (!name) continue;
      const numbers = [...li.matchAll(/<span class="number">([\d,.\-]+)<\/span>/g)]
        .map((m) => parseNumber(m[1]))
        .filter((n): n is number => n != null);

      if (name === "Market Cap" && numbers[0] != null) {
        result.marketCap = `Rs ${numbers[0].toLocaleString("en-IN")} Cr`;
        foundAny = true;
      } else if (name === "Current Price" && numbers[0] != null) {
        result.price = numbers[0];
        foundAny = true;
      } else if (name === "High / Low" && numbers.length === 2) {
        result.high52w = numbers[0];
        result.low52w = numbers[1];
        foundAny = true;
      } else if (LABEL_TO_FIELD[name] && numbers[0] != null) {
        result[LABEL_TO_FIELD[name]] = numbers[0];
        foundAny = true;
      }
    }

    return foundAny ? result : null;
  } catch {
    // Network failure, timeout, or screener.in markup changed underneath us —
    // callers fall back to the last cached KpiSnapshot rather than erroring
    // the whole company-detail request over a best-effort live refresh.
    return null;
  }
}
