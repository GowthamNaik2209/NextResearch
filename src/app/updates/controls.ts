// The /updates page's state lives in its URL, so every view can be linked and works without
// JavaScript: ?sector= (an industry or policy; none = all themes), ?view= (filings: corporate
// filings; flows: the FII / DII view; none = headlines), ?tone= (pos / neg / neu: the headline
// filter), ?type= (results / orders / ...: the filings filter) and ?period= (1D ... 5Y: the FII / DII
// view's period; none = 1M).
import type { Tone } from "@/lib/news-tone";
import { FILING_TYPES, type FilingType } from "@/lib/filings/classify";
import { DEFAULT_PERIOD, type Period } from "@/lib/flows/periods";

export type UpdatesView = "news" | "filings" | "flows";
export type UpdatesState = { sector?: string; view: UpdatesView; tone?: Tone; type?: FilingType; period?: Period };

export const TONES: Tone[] = ["pos", "neg", "neu"];

export const parseView = (v?: string): UpdatesView => (v === "flows" || v === "filings" ? v : "news");
export const parseFilingType = (t?: string): FilingType | undefined => FILING_TYPES.find((x) => x.type === t)?.type;

export function updatesHref({ sector, view, tone, type, period }: UpdatesState): string {
  const q = new URLSearchParams();
  if (sector) q.set("sector", sector);
  if (view !== "news") q.set("view", view);
  // Each filter belongs to its own view; switching view drops it.
  if (view === "news" && tone) q.set("tone", tone);
  if (view === "filings" && type) q.set("type", type);
  // The period is kept on every view, so switching back to FII / DII returns to it.
  if (period && period !== DEFAULT_PERIOD) q.set("period", period);
  const s = q.toString();
  return s ? `/updates?${s}` : "/updates";
}
