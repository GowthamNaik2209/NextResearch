"use client";

import { useMemo, useState } from "react";
import type { DealRow } from "@/lib/flows/query";
import { fmtDay } from "@/lib/format";
import { ToneLight } from "@/components/ToneLight";
import { ShowAll, SortHead, Ticker, titleCase, type Sort } from "./parts";

type Key = "day" | "company" | "client" | "value";
const FIRST = 12;

/** FII and DII bulk and block deals over the period; tap a heading to sort by it (again to reverse). */
export function DealsTable({ deals }: { deals: DealRow[] }) {
  const [sort, setSort] = useState<Sort<Key>>({ key: "day", desc: true });
  const [all, setAll] = useState(false);

  const sorted = useMemo(() => {
    const cmp: Record<Key, (a: DealRow, b: DealRow) => number> = {
      day: (a, b) => a.day.getTime() - b.day.getTime() || a.valueCr - b.valueCr,
      company: (a, b) => b.name.localeCompare(a.name),
      client: (a, b) => b.client.localeCompare(a.client),
      value: (a, b) => a.valueCr - b.valueCr,
    };
    // "Largest first" for text columns means A to Z, so names read in order on the first tap.
    return [...deals].sort((a, b) => (sort.desc ? -1 : 1) * cmp[sort.key](a, b));
  }, [deals, sort]);
  const shown = all ? sorted : sorted.slice(0, FIRST);
  const toggle = (key: Key) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            <th className="w-7 py-1">
              <span className="sr-only">Buy or sell</span>
            </th>
            <SortHead<Key> label="Company" k="company" sort={sort} onSort={toggle} left />
            <SortHead<Key> label="Client" k="client" sort={sort} onSort={toggle} left />
            <SortHead<Key> label="Date" k="day" sort={sort} onSort={toggle} className="max-sm:hidden" />
            <SortHead<Key> label="₹ cr" k="value" sort={sort} onSort={toggle} last />
          </tr>
        </thead>
        <tbody>
          {shown.map((d, i) => (
            <tr key={`${d.ticker}-${d.client}-${d.day.toISOString()}-${d.side}-${i}`} className="border-b border-line/50 align-top last:border-0">
              <td className="py-2">
                <ToneLight tone={d.side === "BUY" ? "pos" : "neg"} reason={d.side === "BUY" ? "Bought" : "Sold"} small />
              </td>
              <td className="py-2 pr-2">
                <div className="max-w-[11rem] truncate text-ink" title={d.name}>
                  {d.name.replace(/\s+(Ltd\.?|Limited)$/i, "")}
                </div>
                <div className="mt-1">
                  <Ticker ticker={d.ticker} name={d.name} />
                </div>
                {/* Phones: the date sits here, so the table fits without scrolling sideways. */}
                <div className="mt-1 whitespace-nowrap text-[11px] text-ink-soft sm:hidden">{fmtDay(d.day)}</div>
              </td>
              <td className="min-w-[7rem] py-2 pr-2">
                <div className="break-words text-ink">{titleCase(d.client)}</div>
                <div className="mt-0.5 text-[11px] text-ink-soft">
                  {d.party} · {d.side === "BUY" ? "Buy" : "Sell"} · {d.kind === "BLOCK" ? "Block" : "Bulk"}
                </div>
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right text-[11.5px] text-ink-soft max-sm:hidden">{fmtDay(d.day)}</td>
              <td className="whitespace-nowrap py-2 pl-2 text-right font-mono tabular-nums">{crore(d.valueCr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAll shown={shown.length} total={sorted.length} all={all} onToggle={() => setAll((a) => !a)} noun="deals" />
    </div>
  );
}

// A fund's small counter-trade on a big deal day can be worth under a crore: "<1", not "0".
const crore = (v: number) => (v < 0.5 ? "<1" : Math.round(v).toLocaleString("en-IN"));
