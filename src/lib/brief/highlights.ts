// The morning brief's "Market highlights": one short line of figures (the indices, breadth and the
// best theme on NextResearch) over the morning's market headlines (headlines.ts). Pure, so the tests
// read the exact words; a figure that is missing just leaves its part out.
import { inr, signedPct } from "@/lib/format";
import type { Breadth, IndexClose, Theme } from "./types";

export type SummaryInput = { indices: IndexClose[]; breadth: Breadth | null; themes: Theme[] };

const index = (i: IndexClose) => `${i.name} ${signedPct(i.pct, 2)} at ${inr(i.close)}`;

export function summaryLine(s: SummaryInput): string {
  const parts: string[] = [];
  if (s.indices.length) parts.push(s.indices.map(index).join(", "));
  if (s.breadth && s.breadth.up + s.breadth.down > 0) parts.push(`${inr(s.breadth.up)} stocks rose and ${inr(s.breadth.down)} fell`);
  const out = parts.length ? `${parts.join("; ")}.` : "";
  const best = s.themes[0];
  return best ? `${out} Best theme on NextResearch: ${best.name}, ${signedPct(best.ret)}.`.trim() : out;
}
