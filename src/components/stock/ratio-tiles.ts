// The Key stats ratio tiles (financials/key-ratios.ts) as label, value and second line, shared by the
// stock pop-up and the company page so both read the same. Every tile is always returned (a missing
// figure reads "—"), so the grids keep whole rows. A lender's or an insurer's net margin reads as a
// short note ("Not meaningful for lenders"), not a number or a bare dash.
import { keyRatios, PROFIT_NOTE_LABEL } from "@/lib/financials/key-ratios";
import { HOLDING_MARGIN_NOTE, companyKind, isHoldingCompany, notMeaningfulNote } from "@/lib/financials/kinds";
import type { SupplierFinancials } from "@/lib/sector-content";
import { NA, pct, signedPct } from "@/lib/format";

export type RatioTile = {
  label: string;
  value: string;
  /** Colour the value by this sign (pctTone); undefined keeps the plain ink colour. */
  tone?: number | null;
  sub?: string;
  /** Hover text: why a figure is left out. */
  title?: string;
  /** The value is a short note (not meaningful for this kind of company): shown small and soft. */
  muted?: boolean;
};

export function ratioTiles(f: SupplierFinancials | undefined, reit: boolean): RatioTile[] {
  const k = keyRatios(f);
  const fy = k.fy ?? undefined;
  // REITs: reported profit is depressed by depreciation on the buildings (REIT_NOTE), so profit
  // growth and margin are as little use as P/E.
  const nm = (t: RatioTile): RatioTile => (reit ? { label: t.label, value: "n/m", title: "Not meaningful for a REIT" } : t);
  const caution = k.caution ? { value: NA, sub: "See note", title: k.caution } : null;
  // A holding company's margin is its subsidiaries' business, whatever its kind; a lender's or insurer's is not meaningful either.
  const kindNote =
    f && isHoldingCompany(f.ticker) ? HOLDING_MARGIN_NOTE : k.notMeaningful.includes("netMargin") ? notMeaningfulNote(f ? (f.kind ?? companyKind(f.ticker)) : null) : null;
  // The year line: the year the figures are for, and when that isn't the table's latest, that the latest is not out yet.
  // No year at all (a new listing whose first year isn't out) or no revenue: that reason, never a bare dash.
  const fyLine = k.noFigures && k.noFigures !== "No revenue reported" ? k.noFigures : fy && k.notOut ? `${fy} · ${k.notOut} ${k.notOutWhy}` : fy;
  const notOutTitle = k.notOut
    ? k.notOutWhy === "not on Screener yet"
      ? `${k.notOut} figures are not on Screener yet; these are for ${fy}, its latest year there.`
      : `${k.notOut} is left blank (the company's note says why); these are for ${fy}.`
    : undefined;
  const noRevenue = k.noFigures === "No revenue reported" ? { value: NA, sub: fy ? `${fy} · No revenue reported` : "No revenue reported" } : null;
  // No year before to grow from: a dash with its reason, never a bare one.
  const noGrowth = k.noPrior ? { value: NA, sub: `No ${k.noPrior} figure`, title: `A growth rate needs ${k.noPrior} as well, and the company table has no ${k.noPrior} figure for it.` } : null;
  return [
    // No P/B: say why (no book value in the company table, or a negative one), never a bare dash.
    k.pb != null
      ? { label: "P/B", value: `${k.pb.toFixed(1)}x` }
      : k.pbNote
        ? { label: "P/B", value: "n/m", sub: k.pbNote, title: "The book value is so close to nothing that price over book says nothing." }
        : { label: "P/B", value: NA, sub: typeof f?.kpi?.[1] === "number" && f.kpi[1] <= 0 ? "Negative book value" : "No book value figure" },
    { label: "Revenue growth", ...(caution ?? noRevenue ?? ((k.revGrowth == null && noGrowth) || { value: k.revGrowth != null ? signedPct(k.revGrowth, 1) : NA, tone: k.revGrowth, sub: fyLine, title: notOutTitle })) },
    nm({
      label: "Profit growth",
      ...(caution ??
        (k.profitNote
          ? { value: PROFIT_NOTE_LABEL[k.profitNote], sub: fyLine, title: notOutTitle }
          : (k.profitGrowth == null && noGrowth) || { value: k.profitGrowth != null ? signedPct(k.profitGrowth, 1) : NA, tone: k.profitGrowth, sub: fyLine, title: notOutTitle })),
    }),
    kindNote
      ? { label: "Net margin", value: kindNote, muted: true }
      : nm({
          label: "Net margin",
          ...(caution ??
            noRevenue ??
            (k.marginNote ? { value: "n/m", sub: fy ? `${fy} · ${k.marginNote}` : k.marginNote, title: "A profit or loss bigger than the revenue makes a margin that means nothing." } : null) ?? {
              value: k.netMargin != null ? pct(k.netMargin) : NA,
              sub: fyLine,
              title: notOutTitle,
            }),
        }),
    {
      label: "1Y vs Nifty",
      // Whole points: the stock's 1Y return is Screener's whole-number figure.
      value: k.vsNifty != null ? signedPct(Math.round(k.vsNifty), 0).replace(/%$/, " pts") : NA,
      tone: k.vsNifty != null ? Math.round(k.vsNifty) : null,
      // Run to an earlier stored close (today's not stored yet): the day is named. No figure: why.
      sub: k.vsNifty != null && k.nifty1y != null ? `Nifty ${signedPct(k.nifty1y, 1)}${k.vsNiftyDay ? ` · to ${k.vsNiftyDay}` : ""}` : (k.vsNiftyNote ?? undefined),
      title: k.vsNiftyDay ? `Both 1-year returns run to ${k.vsNiftyDay}, the latest Nifty 50 close stored; the snapshot day's close is stored in the evening.` : undefined,
    },
  ];
}
