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
  const chip = "inline-flex min-h-6 items-center rounded-full border border-line px-2 text-[11px] text-ink-soft hover:border-accent hover:text-ink";
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
          className="inline-flex min-h-6 items-center rounded-full bg-accent/10 px-2 text-[11px] font-semibold text-accent hover:bg-accent/20"
        >
          {open ? "Show less" : `In ${industries.length} industries`}
        </button>
      )}
    </div>
  );
}
