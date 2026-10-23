"use client";

import { useState } from "react";
import Link from "next/link";

// The industries a company is mapped in: the primary one, then "+N more" that opens the rest.
// Each links to that industry's page. A company in several supply chains is a diversified bet
// on all of them, so the count is shown wherever a stock sits in a list (baskets, watchlist).
export function IndustryChips({ industries, className = "" }: { industries: { slug: string; name: string }[]; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!industries.length) return null;
  const shown = open ? industries : industries.slice(0, 1);
  // A long name wraps inside a rounded box (not a pill, which pinches two lines). On a touch
  // screen a chip is 28px tall with a 36px tap area (::before reaches 5px past the 1px border, above and below).
  const touch = "relative pointer-coarse:min-h-7 pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-[5px] pointer-coarse:before:content-['']";
  const chip = "inline-flex min-h-6 max-w-full items-center rounded-xl border border-line px-2 py-0.5 text-left text-[11px] leading-snug text-balance text-ink-soft hover:border-accent hover:text-ink " + touch;
  return (
    <div className={"flex flex-wrap items-center gap-1.5 " + className}>
      {shown.map((i) => (
        <Link key={i.slug} href={`/sector/${i.slug}`} className={chip}>
          {i.name}
        </Link>
      ))}
      {industries.length > 1 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title={open ? undefined : industries.map((i) => i.name).join(", ")}
          className={"inline-flex min-h-6 items-center whitespace-nowrap rounded-full bg-accent/10 px-2 text-[11px] font-semibold text-accent hover:bg-accent/20 " + touch}
        >
          {open ? "Show less" : `In ${industries.length} industries`}
        </button>
      )}
    </div>
  );
}
