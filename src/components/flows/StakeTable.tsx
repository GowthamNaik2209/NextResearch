"use client";

import { useMemo, useState } from "react";
import type { StakeRow } from "@/lib/flows/query";
import { fmtMonth } from "@/lib/format";
import { Company, NotYet, SortHead, ShowAll, toneText, arrow, type Sort } from "./parts";
import { holding, shortMonth, signedPp, streakText } from "./format";
import { ScrollX } from "@/components/ScrollX";

type Key = "move" | "holding" | "change";
const FIRST = 10;
// On a phone the company column keeps a readable width and stays put while the figures scroll
// sideways in the table's own box; from sm the table fits and the column takes the spare room.
const HELD = "sticky left-0 z-[1] w-[9.5rem] min-w-[9.5rem] max-w-[9.5rem] bg-panel shadow-[1px_0_0_var(--color-line)] sm:static sm:w-auto sm:min-w-0 sm:bg-transparent sm:shadow-none";

/**
 * Stake changes over the period: FII or DII, every company in view, biggest moves first. Tapping the
 * Holding or Change heading sorts by it (again to reverse).
 */
export function StakeTable({ rows, where, compact }: { rows: StakeRow[]; where?: string; /** Leave out the industry line (one industry is picked). */ compact: boolean }) {
  const [who, setWho] = useState<"fii" | "dii">("fii");
  const [sort, setSort] = useState<Sort<Key>>({ key: "move", desc: true });
  const [all, setAll] = useState(false);

  const sorted = useMemo(() => {
    const v = (r: StakeRow) => (who === "fii" ? r.fii : r.dii);
    const d = (r: StakeRow) => (who === "fii" ? r.dFii : r.dDii);
    const val = (r: StakeRow) => (sort.key === "holding" ? v(r) : sort.key === "change" ? d(r) : d(r) == null ? null : Math.abs(d(r)!));
    // Rows without the figure go last whichever way the column is sorted.
    return rows
      .filter((r) => v(r) != null)
      .sort((a, b) => {
        const x = val(a);
        const y = val(b);
        if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
        return sort.desc ? y - x : x - y;
      });
  }, [rows, who, sort]);

  const base = commonBase(rows);
  const shown = all ? sorted : sorted.slice(0, FIRST);
  const toggle = (key: Key) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["fii", "dii"] as const).map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={who === w}
            onClick={() => setWho(w)}
            className={"tap-y inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold " + (who === w ? "border-ink-soft bg-panel-2 text-ink" : "border-line text-ink-soft hover:text-ink")}
          >
            {w.toUpperCase()} holdings
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">
        {sorted.length} compan{sorted.length === 1 ? "y" : "ies"}
        {base ? ` with a filing back to ${fmtMonth(base)}` : ""}
        {sort.key === "move" ? " · biggest moves first; tap Holding or the change to sort" : ""}
      </p>
      {sorted.length === 0 ? (
        <div className="mt-3">
          <NotYet>No {who.toUpperCase()} holdings are on record{where ? ` for ${where}` : ""}.</NotYet>
        </div>
      ) : (
        <div className="mt-2">
          <ScrollX>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                <th className={"py-1 pr-2 font-semibold " + HELD}>Company</th>
                <SortHead<Key> label="Holding" k="holding" sort={sort} onSort={toggle} />
                <SortHead<Key> label={base ? `Chg since ${fmtMonth(base)}` : "Change"} k="change" sort={sort} onSort={toggle} last />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const v = who === "fii" ? r.fii : r.dii;
                const d = who === "fii" ? r.dFii : r.dDii;
                const n = who === "fii" ? r.fiiStreak : r.diiStreak;
                return (
                  <tr key={r.ticker} className="border-b border-line/50 last:border-0">
                    <td className={"py-2 pr-2 sm:max-w-0 " + HELD}>
                      <Company ticker={r.ticker} name={r.name} sub={compact ? undefined : r.sectorName} />
                    </td>
                    <td className="w-px whitespace-nowrap px-2 py-2 text-right align-top font-mono tabular-nums">{holding(v)}</td>
                    <td className="w-px whitespace-nowrap py-2 pl-2 text-right align-top font-mono tabular-nums">
                      <div className={toneText(d)}>
                        {arrow(d)}
                        {signedPp(d)}
                      </div>
                      {/* How many quarters in a row the latest move has run: a one-off vs a trend. */}
                      <div className="text-[11px] text-ink-soft">
                        {base && r.base.getTime() !== base.getTime() ? `since ${shortMonth(r.base)}` : streakText(n, who === "fii" ? r.dFii : r.dDii)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </ScrollX>
          <ShowAll shown={shown.length} total={sorted.length} all={all} onToggle={() => setAll((a) => !a)} noun="companies" />
        </div>
      )}
    </div>
  );
}

/** The filing most rows compare with (a few companies may only have an older one). */
function commonBase(rows: StakeRow[]): Date | null {
  const n = new Map<number, number>();
  for (const r of rows) n.set(r.base.getTime(), (n.get(r.base.getTime()) ?? 0) + 1);
  const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? new Date(top[0]) : null;
}
