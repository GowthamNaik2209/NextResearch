"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { GROUPS, GROUP_QUESTION, METRICS, METRIC_BY_ID, type MetricKind } from "@/lib/signals/metrics";
import { InfoTip } from "@/components/InfoTip";

// The rule builder's indicator picker: a search box over the 64 indicators, grouped by the question
// each answers ("Is it trending?") rather than by jargon, with each one's note as a line under its
// name. An indicator this stock's prices can't give is listed but can't be picked.

const FIELD = "min-h-9 rounded border border-line bg-panel-2 px-1.5 font-mono text-xs font-semibold text-ink sm:min-h-8";

/** A small "i" with an indicator's one-line note and a link to its section of the guide. */
export function MetricInfo({ id }: { id: string }) {
  const m = METRIC_BY_ID.get(id);
  if (!m) return null;
  return (
    <InfoTip label={`About ${m.label}`}>
      {m.note}{" "}
      <Link href={`/signals/indicators#${m.id}`} className="font-semibold text-accent underline">
        Learn more
      </Link>
    </InfoTip>
  );
}

export function MetricPicker({ value, onChange, kind, exclude, unavailable, label }: { value: string; onChange: (id: string) => void; kind?: MetricKind; exclude?: string; unavailable: Record<string, string>; label: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = METRIC_BY_ID.get(value);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const groups = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (s: string) => words.every((w) => s.toLowerCase().includes(w));
    return GROUPS.map((g) => ({
      g,
      list: METRICS.filter((m) => m.group === g && (!kind || m.kind === kind) && m.id !== exclude && (!words.length || hit(`${m.label} ${m.note} ${GROUP_QUESTION[g]}`))),
    })).filter((x) => x.list.length);
  }, [q, kind, exclude]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={box} className="relative min-w-0">
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)} className={FIELD + " inline-flex max-w-full items-center gap-1 text-left"}>
        <span className="truncate">{current?.label ?? "Pick an indicator"}</span>
        <span aria-hidden className="text-ink-soft">▾</span>
      </button>
      {open && (
        <div id={listId} className="absolute left-0 top-full z-30 mt-1 flex max-h-80 w-[22rem] max-w-[80vw] flex-col overflow-hidden rounded-md border border-line bg-panel shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: RSI, average, volume, breakout…"
            aria-label="Search indicators"
            className="m-2 min-h-9 rounded border border-line bg-bg px-2 text-xs text-ink"
          />
          <div className="min-h-0 overflow-y-auto pb-1">
            {groups.length ? (
              groups.map(({ g, list }) => (
                <div key={g}>
                  <div className="sticky top-0 bg-panel-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{GROUP_QUESTION[g]}</div>
                  {list.map((m) => {
                    const na = unavailable[m.id];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!!na}
                        onClick={() => pick(m.id)}
                        title={na ? `Not available: ${na}` : undefined}
                        className={"block w-full px-2.5 py-1.5 text-left hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45 " + (m.id === value ? "bg-accent/10" : "")}
                      >
                        <span className="block font-mono text-xs font-semibold text-ink">
                          {m.label}
                          {na ? " · n/a" : ""}
                        </span>
                        <span className="block text-[11px] leading-snug text-ink-soft">{m.note}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-ink-soft">No indicator matches &ldquo;{q}&rdquo;.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
