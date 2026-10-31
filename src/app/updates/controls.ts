// The /updates page's state lives in its URL, so every view can be linked and works without
// JavaScript: ?sector= (an industry or policy; none = all themes), ?view=flows (the FII / DII
// view; none = headlines) and ?tone= (pos / neg / neu: the headline filter).
import type { Tone } from "@/lib/news-tone";

export type UpdatesView = "news" | "flows";
export type UpdatesState = { sector?: string; view: UpdatesView; tone?: Tone };

export const TONES: Tone[] = ["pos", "neg", "neu"];

export function updatesHref({ sector, view, tone }: UpdatesState): string {
  const q = new URLSearchParams();
  if (sector) q.set("sector", sector);
  if (view === "flows") q.set("view", "flows");
  // The tone filter belongs to the headlines; switching to the FII / DII view drops it.
  else if (tone) q.set("tone", tone);
  const s = q.toString();
  return s ? `/updates?${s}` : "/updates";
}
