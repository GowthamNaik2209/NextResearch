import type { Tone } from "@/lib/news-tone";

export const TONE_LABEL: Record<Tone, string> = { pos: "Positive", neg: "Negative", neu: "Neutral" };

// Red on top, amber, green at the bottom, like a real signal; the lit one is the tone.
const LIGHTS: { tone: Tone; on: string }[] = [
  { tone: "neg", on: "bg-danger shadow-[0_0_6px_var(--danger)]" },
  { tone: "neu", on: "bg-amber shadow-[0_0_6px_var(--amber)]" },
  { tone: "pos", on: "bg-pos shadow-[0_0_6px_var(--pos)]" },
];

/** A small traffic light marking a headline (or a deal) good, neutral or bad for the company. */
export function ToneLight({ tone, reason, small = false, className = "" }: { tone: Tone; reason?: string; /** Smaller, for table rows. */ small?: boolean; className?: string }) {
  const label = reason ? `${TONE_LABEL[tone]}: ${reason}` : TONE_LABEL[tone];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={"flex flex-none flex-col rounded-md bg-panel-2 " + (small ? "gap-[2px] px-1 py-[3px] " : "gap-[3px] px-[5px] py-1 ") + className}
    >
      {LIGHTS.map((l) => (
        <span key={l.tone} className={"block rounded-full " + (small ? "h-[5px] w-[5px] " : "h-[7px] w-[7px] ") + (l.tone === tone ? l.on : "bg-ink-soft/25")} />
      ))}
    </span>
  );
}
