// The /updates page's state lives in its URL, so every view can be linked and works without
// JavaScript: ?sector= (an industry or policy; none = all themes), ?view=flows (the FII / DII
// view; none = headlines), ?tone= (pos / neg / neu: the headline filter) and ?period= (1D ... 5Y:
// the FII / DII view's period; none = 1M).
import type { Tone } from "@/lib/news-tone";
import { DEFAULT_PERIOD, type Period } from "@/lib/flows/periods";

export type UpdatesView = "news" | "flows";
export type UpdatesState = { sector?: string; view: UpdatesView; tone?: Tone; period?: Period };

export const TONES: Tone[] = ["pos", "neg", "neu"];

export function updatesHref({ sector, view, tone, period }: UpdatesState): string {
  const q = new URLSearchParams();
  if (sector) q.set("sector", sector);
  if (view === "flows") q.set("view", "flows");
  // The tone filter belongs to the headlines; switching to the FII / DII view drops it.
  else if (tone) q.set("tone", tone);
  // The period is kept on the headlines too, so switching back to FII / DII returns to it.
  if (period && period !== DEFAULT_PERIOD) q.set("period", period);
  const s = q.toString();
  return s ? `/updates?${s}` : "/updates";
}
