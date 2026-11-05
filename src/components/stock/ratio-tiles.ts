// The Key stats ratio tiles (financials/key-ratios.ts) as label, value and second line, shared by the
// stock pop-up and the company page so both read the same. Every tile is always returned (a missing
// figure reads "—"), so the grids keep whole rows.
import { keyRatios, PROFIT_NOTE_LABEL } from "@/lib/financials/key-ratios";
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
};

export function ratioTiles(f: SupplierFinancials | undefined, reit: boolean): RatioTile[] {
  const k = keyRatios(f);
  const fy = k.fy ?? undefined;
  // REITs: reported profit is depressed by depreciation on the buildings (REIT_NOTE), so profit
  // growth and margin are as little use as P/E.
  const nm = (t: RatioTile): RatioTile => (reit ? { label: t.label, value: "n/m", title: "Not meaningful for a REIT" } : t);
  const caution = k.caution ? { value: NA, sub: "See note", title: k.caution } : null;
  return [
    { label: "P/B", value: k.pb != null ? `${k.pb.toFixed(1)}x` : NA },
    { label: "Revenue growth", ...(caution ?? { value: k.revGrowth != null ? signedPct(k.revGrowth, 1) : NA, tone: k.revGrowth, sub: fy }) },
    nm({
      label: "Profit growth",
      ...(caution ??
        (k.profitNote
          ? { value: PROFIT_NOTE_LABEL[k.profitNote], sub: fy }
          : { value: k.profitGrowth != null ? signedPct(k.profitGrowth, 1) : NA, tone: k.profitGrowth, sub: fy })),
    }),
    nm({ label: "Net margin", ...(caution ?? { value: k.netMargin != null ? pct(k.netMargin) : NA, sub: fy }) }),
    {
      label: "1Y vs Nifty",
      // Whole points: the stock's 1Y return is Screener's whole-number figure.
      value: k.vsNifty != null ? signedPct(Math.round(k.vsNifty), 0).replace(/%$/, " pts") : NA,
      tone: k.vsNifty != null ? Math.round(k.vsNifty) : null,
      sub: k.vsNifty != null && k.nifty1y != null ? `Nifty ${signedPct(k.nifty1y, 1)}` : undefined,
    },
  ];
}
