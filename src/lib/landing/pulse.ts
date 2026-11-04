// The landing page's "Market pulse" line: the Nifty 50 and the Sensex over the chosen period and the
// FII / DII net cash flows summed over the same period. Pure (tested in pulse.test.ts), so the
// server's figures and the browser's period switch read the same words.
import { croreShort, fmtDay, signedPct, NA } from "@/lib/format";
import { periodStart } from "@/lib/flows/periods";
import { PERIODS, PERIOD_WORDS, type Period } from "@/lib/baskets/periods";

export type PulseIndex = { name: string; ret: Partial<Record<Period, number>> };

/** One stored day's net cash flows, ₹ crore (as the /updates FII / DII view reads them, flows/query.ts loadCashDays). */
export type PulseCashDay = { day: string; fiiNetCr: number; diiNetCr: number; diiSource?: "nse" | "nsdl" | "sebi-mf" };
/** One side's net buying over a period: the sum, the days it adds up and the first and last of them ("YYYY-MM-DD").
 * `since` is set when the stored series starts after the period's first day, so the sum covers only part of it. */
export type FlowSum = { netCr: number; sessions: number; from: string; to: string; since?: string };
/** Per period, FII and DII net (null where nothing of the period is covered). */
export type PulseFlows = { day: string; byPeriod: Partial<Record<Period, { fii: FlowSum | null; dii: FlowSum | null }>> };
export type PulseItem = { key: string; label: string; value: string; tone: "pos" | "neg" | "flat" | "none"; title: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

/** A series first stored on `first` misses part of a period starting on `start`: a weekday lies between them (a weekend doesn't count). */
function startsLate(start: string, first: string): boolean {
  for (let t = Date.parse(start); t < Date.parse(first); t += DAY_MS) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) return true;
  }
  return false;
}

function sumSide(days: PulseCashDay[], first: string, side: "fiiNetCr" | "diiNetCr"): FlowSum | null {
  const inWin = days.filter((d) => d.day >= first);
  if (!inWin.length) return null;
  return { netCr: inWin.reduce((s, d) => s + d[side], 0), sessions: inWin.length, from: inWin[0].day, to: inWin[inWin.length - 1].day };
}

/**
 * FII and DII net buying over each period, from the days stored (oldest first). The window is the
 * /updates view's (flows/periods.ts periodStart): 1D the latest day, 1W the seven days up to it,
 * longer periods whole calendar months back. FII is the official NSDL FPI history (from Oct 2021)
 * with NSE's provisional figures for the latest days. DII is totalled only over full DII figures
 * (NSDL, from Jun 2026, and NSE's): before them only SEBI's mutual-fund figures exist, which leave
 * out insurers and banks, so a longer period's DII sum starts there and says so (`since`).
 */
export function pulseFlowSums(days: PulseCashDay[], periods: readonly Period[] = PERIODS): PulseFlows | null {
  if (!days.length) return null;
  const latest = days[days.length - 1].day;
  const firstFullDii = days.find((d) => d.diiSource !== "sebi-mf")?.day ?? null;
  const byPeriod: PulseFlows["byPeriod"] = {};
  for (const p of periods) {
    const start = iso(periodStart(p, new Date(`${latest}T00:00:00Z`)));
    const fii = sumSide(days, start, "fiiNetCr");
    if (fii && startsLate(start, days[0].day)) fii.since = fii.from;
    let dii: FlowSum | null = null;
    if (firstFullDii) {
      dii = sumSide(days, firstFullDii > start ? firstFullDii : start, "diiNetCr");
      if (dii && startsLate(start, firstFullDii)) dii.since = dii.from;
    }
    byPeriod[p] = { fii, dii };
  }
  return { day: latest, byPeriod };
}

const tone = (shown: string, v: number | null | undefined): PulseItem["tone"] =>
  v == null || !Number.isFinite(v) ? "none" : shown.startsWith("+") ? "pos" : shown.startsWith("−") ? "neg" : "flat";

/** A signed short crore figure: "+₹6,837 Cr", "−₹1.23L Cr", "₹0 Cr" (the sign before the rupee, as the percentages carry theirs). */
export function signedCrShort(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return NA;
  const s = croreShort(v);
  return s.startsWith("−") || s === "₹0 Cr" ? s : `+${s}`;
}

/** "Market pulse · 3 Nov 2026" (the date of the latest close), or just the words without one. */
export function pulseHeading(asOf: string | null): string {
  return asOf ? `Market pulse · ${fmtDay(asOf)}` : "Market pulse";
}

const span = (f: FlowSum) => (f.from === f.to ? `on ${fmtDay(f.from)}` : `${fmtDay(f.from)} – ${fmtDay(f.to)}, ${f.sessions} sessions`);

/** The line's items for a period: each index's return, then FII and DII net summed over the same period. */
export function pulseItems(indices: PulseIndex[], flows: PulseFlows | null, period: Period): PulseItem[] {
  const out: PulseItem[] = indices.map((ix) => {
    const v = ix.ret[period];
    const value = signedPct(v);
    return { key: ix.name, label: `${ix.name} · ${period}`, value, tone: tone(value, v), title: v == null ? `${ix.name}: updating` : `${ix.name} over ${period}: ${value}` };
  });
  if (flows) {
    const f = flows.byPeriod[period];
    for (const [who, sum, long] of [
      ["FII", f?.fii ?? null, "Foreign institutions"],
      ["DII", f?.dii ?? null, "Domestic institutions"],
    ] as const) {
      const value = signedCrShort(sum?.netCr);
      const label = sum?.since ? `${who} net · since ${fmtDay(sum.since)}` : `${who} net · ${period}`;
      const why = !sum?.since
        ? ""
        : who === "DII"
          ? ` Full DII figures (NSDL) start on ${fmtDay(sum.since)}; before that only mutual funds' figures exist, so the total runs from then, not over ${PERIOD_WORDS[period]}.`
          : ` History starts on ${fmtDay(sum.since)}, so the total runs from then, not over ${PERIOD_WORDS[period]}.`;
      out.push({
        key: who,
        label,
        value,
        tone: tone(value, sum?.netCr),
        title: sum ? `${long}' net cash buying ${sum.since ? "" : `over ${PERIOD_WORDS[period]} `}(${span(sum)}), ₹ crore.${why}` : `${long}: updating`,
      });
    }
  }
  return out;
}
