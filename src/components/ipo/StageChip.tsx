import type { IpoDeck } from "@/lib/ipo-content";
import type { IpoStage } from "@/lib/ipo-content/types";

// The IPO status chip, shared by the cards and the deck's slides. Kept apart from IpoSlides so the
// card grids don't pull the slide code into the page bundle.
export const STAGE_TEXT: Record<IpoStage, string> = {
  open: "bg-pos text-bg",
  upcoming: "bg-accent text-bg",
  approved: "border border-accent text-accent",
  filed: "border border-line text-ink-soft",
  listed: "bg-panel-2 text-ink",
};

export function StageChip({ deck, className = "" }: { deck: Pick<IpoDeck, "status">; className?: string }) {
  return (
    <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + STAGE_TEXT[deck.status.stage] + " " + className}>
      {deck.status.label}
    </span>
  );
}
