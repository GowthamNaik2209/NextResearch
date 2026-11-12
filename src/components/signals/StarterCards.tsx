"use client";

import { PRESETS } from "@/lib/signals/strategy";

// "Start from an idea": the ready-made rules as cards, each with the plain idea behind it, so a first
// visit starts from something that makes sense rather than an empty builder. The card whose rules
// are on screen is marked "In use" until the rules are edited.
const IDEA: Record<string, string> = {
  "trend-200": "Ride the long trend",
  "golden-cross": "Ride the long trend",
  supertrend: "Ride the trend",
  "trend-top-fifth": "Follow the strongest stocks",
  "rsi-pullback": "Dips within an uptrend",
  "breakout-20": "Catch breakouts",
  "bb-squeeze": "Catch breakouts",
  "macd-adx": "Momentum turning up",
};

export function StarterCards({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  return (
    <section aria-label="Start from an idea" className="flex flex-col gap-1.5">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Start from an idea</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {PRESETS.map((p) => {
          const on = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(p.id)}
              className={"relative flex min-w-0 flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left hover:bg-accent/10 " + (on ? "border-accent bg-accent/15 ring-2 ring-accent" : "border-btn bg-panel")}
            >
              <span className="flex w-full items-center justify-between gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">{IDEA[p.id] ?? "Idea"}</span>
                {on && <span className="shrink-0 rounded bg-accent px-1.5 py-px text-[10px] font-semibold text-bg">✓ In use</span>}
              </span>
              <span className="text-sm font-semibold text-ink">{p.label}</span>
              <span title={p.note} className="line-clamp-3 text-[11px] leading-snug text-ink-soft">
                {p.note}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
