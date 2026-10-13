// Parser for the "top ratios" block on a Screener.in company page (price, market cap,
// P/E, ROCE, ...). Pure function over HTML so it is unit-testable with a saved page;
// the fetching lives in screener-company.ts. Screener has no public API, so this
// depends on its markup - see the structure below and expect maintenance if it changes.
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

function parseNumber(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseTopRatios(html: string): ScreenerKpi | null {
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
}
