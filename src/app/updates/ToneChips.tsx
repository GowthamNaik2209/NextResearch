import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import type { Tone } from "@/lib/news-tone";
import { updatesHref } from "./controls";

const CHIPS: { tone?: Tone; label: string; dot?: string }[] = [
  { label: "All" },
  { tone: "pos", label: "Positive", dot: "bg-pos" },
  { tone: "neg", label: "Negative", dot: "bg-danger" },
  { tone: "neu", label: "Neutral", dot: "bg-amber" },
];

// Filters the headlines by their traffic light. A tone with no headlines right now is shown but
// can't be picked.
export function ToneChips({ counts, active, sector }: { counts: Record<Tone, number>; active?: Tone; sector?: string }) {
  return (
    <nav aria-label="Filter by tone" className="flex flex-wrap items-center gap-2">
      {CHIPS.map((c) => {
        const on = c.tone === active;
        const n = c.tone ? counts[c.tone] : null;
        const cls =
          "tap-y inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold " +
          (on ? "border-ink-soft bg-panel-2 text-ink" : "border-line text-ink-soft hover:text-ink");
        const body = (
          <>
            {c.dot && <span aria-hidden="true" className={"h-2 w-2 rounded-full " + c.dot} />}
            {c.label}
            {n != null && <span className="font-mono font-normal text-ink-soft">{n}</span>}
          </>
        );
        return n === 0 ? (
          <span key={c.label} aria-disabled="true" className={cls + " opacity-50"}>
            {body}
          </span>
        ) : (
          <Link key={c.label} href={updatesHref({ sector, view: "news", tone: c.tone })} scroll={false} aria-current={on ? "page" : undefined} className={cls}>
            {body}
          </Link>
        );
      })}
    <InfoTip label="How the traffic lights are set">
        Green is news that looks good for the company, red bad, amber routine or mixed. It is read from the headline&rsquo;s words, so check the story; it is not a buy or sell call.
      </InfoTip>
    </nav>
  );
}
