"use client";

import type { SavedSignal } from "@/lib/signals/saved";
import { describeStrategy } from "@/lib/signals/describe";
import { Panel } from "@/components/baskets/Panel";
import { fmtDay } from "@/lib/format";

// "My signals": every saved set of rules, newest first. Opening one loads its stock or basket with
// its rules; the switch turns its alert email on or off; × deletes it.

export function SavedPanel({ saved, current, onOpen, onAlerts, onDelete }: { saved: SavedSignal[]; current: string | null; onOpen: (s: SavedSignal) => void; onAlerts: (s: SavedSignal, on: boolean) => void; onDelete: (s: SavedSignal) => void }) {
  return (
    <Panel title={`My signals · ${saved.length}`} info="Rules you saved, one set per stock or basket. They open where you left them. With the email switch on, you get an email when a saved rule is met on a close.">
      {saved.length ? (
        <ul className="flex flex-col">
          {saved.map((s) => {
            const on = s.id === current;
            return (
              <li key={s.id} className={"flex items-start gap-2 border-b border-grid px-2.5 py-2 last:border-b-0 " + (on ? "bg-accent/5" : "")}>
                <button type="button" onClick={() => onOpen(s)} className="min-w-0 flex-1 text-left">
                  <span className="block text-xs font-semibold text-ink">
                    {s.name}
                    <span className="ml-1 font-mono text-[10px] font-normal text-ink-soft">{s.scope === "stock" ? s.target : "basket"}</span>
                  </span>
                  <span className="line-clamp-2 block text-[11px] leading-snug text-ink-soft">{describeStrategy(s.strategy).entry}</span>
                  <span className="block font-mono text-[10px] text-ink-soft">saved {fmtDay(s.updatedAt, { short: true })}</span>
                </button>
                <label className="flex min-h-8 flex-none items-center gap-1 text-[11px] font-semibold text-ink-soft" title="Email me when these rules are met on a close">
                  <input type="checkbox" checked={s.alerts} onChange={(e) => onAlerts(s, e.target.checked)} className="size-4 accent-[var(--accent)]" />
                  Email
                </label>
                <button type="button" onClick={() => onDelete(s)} aria-label={`Delete saved signal for ${s.name}`} className="inline-flex min-h-8 min-w-8 flex-none items-center justify-center rounded border border-btn text-ink-soft hover:text-ink">
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-3 py-3 text-xs text-ink-soft">Save the rules for a stock or basket and they open where you left them next time. Turn on its email to hear when they trigger.</p>
      )}
    </Panel>
  );
}
