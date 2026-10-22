// Revenue and profit histories restated in a supplier's text ("Revenue grew from Rs 462 Cr (FY22)
// to Rs 2,512 Cr (FY26)") must match the company table they were read from. They are business
// history, so they may stay in the prose, but the table is the source: this pulls each such claim
// out so a test can compare them (figure-claims.test.ts) and catch a refresh that moves them.
export type FigureClaim = { metric: "rev" | "np"; fy: number; valueCr: number; text: string };

const AMOUNT = String.raw`\(?(?:to )?~?Rs ([\d,]+(?:\.\d+)?) (?:Cr|crore)\b`;
// Only whole-company revenue or profit: a segment, bookings, orders, EBITDA or a quarter is something else.
const OTHER = /\b(bookings?|pre-sales|sales of|orders?|EBITDA|operating|NOI|consumption|collections|exports?|segment|defence|guid\w*|target|capex|division|arm|IPO|issue|EV|quarter|Q[1-4]|9M|H[12])\b/i;
const METRIC = /\b(revenue|sales|net profit|profits?|PAT)\b/gi;

// The metric a figure belongs to: the nearest revenue/profit word before it in the clause.
function metricBefore(clause: string, at: number): "rev" | "np" | null {
  let last: string | null = null;
  for (const m of clause.matchAll(METRIC)) if (m.index! < at) last = m[1].toLowerCase();
  return last == null ? null : /revenue|sales/.test(last) ? "rev" : "np";
}

export function figureClaims(text: string): FigureClaim[] {
  const out: FigureClaim[] = [];
  // Claims are read per clause, so "revenue … ; profit …" is not mixed up.
  for (const raw of text.split(/;|\s-\s|\.\s|,\s/)) {
    const clause = raw.trim();
    if (OTHER.test(clause)) continue;
    const push = (fy: string, v: string, at: number) => {
      const n = +fy;
      const metric = metricBefore(clause, at);
      if (metric && n >= 22 && n <= 26) out.push({ metric, fy: n, valueCr: parseFloat(v.replace(/,/g, "")), text: clause });
    };
    const each = (re: string, f: (m: RegExpMatchArray) => void) => {
      for (const m of clause.matchAll(new RegExp(re, "g"))) f(m);
    };
    // "Rs 462 Cr (FY22)", "Rs 383 crore FY23"
    each(`${AMOUNT} \\(?FY(\\d\\d)\\)?`, (m) => push(m[2], m[1], m.index!));
    // "Rs 3,149 Cr in FY26"
    each(`${AMOUNT} in FY(\\d\\d)\\b`, (m) => push(m[2], m[1], m.index!));
    // "FY26 profit rose ~65% to Rs 1,157 Cr", "FY26 net profit Rs 5,355 crore"
    each(`\\bFY(\\d\\d) (?:net )?(?:revenue|sales|profit|PAT)\\b[^)]{0,30}?${AMOUNT}`, (m) => push(m[1], m[2], m.index! + m[0].length));
    // "(FY26 Rs 220 crore)"
    each(`\\(FY(\\d\\d) ~?Rs ([\\d,]+(?:\\.\\d+)?) (?:Cr|crore)\\b`, (m) => push(m[1], m[2], m.index!));
    // "Profit up ~41% in FY26 to Rs 540 Cr"
    each(`in FY(\\d\\d) to ~?Rs ([\\d,]+(?:\\.\\d+)?) (?:Cr|crore)\\b`, (m) => push(m[1], m[2], m.index!));
    // "from FY22 to FY26 (Rs 877 Cr to Rs 2,971 Cr)"
    each(`from FY(\\d\\d) to FY(\\d\\d) ${AMOUNT} ${AMOUNT}`, (m) => {
      push(m[1], m[3], m.index!);
      push(m[2], m[4], m.index!);
    });
  }
  // One pattern can restate another's match ("Rs 383 crore FY23" also reads as "FY23 … Rs …").
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = `${c.metric}${c.fy}${c.valueCr}`;
    return !seen.has(k) && !!seen.add(k);
  });
}
