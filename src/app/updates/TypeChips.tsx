import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { FILING_TYPES, type FilingType } from "@/lib/filings/classify";
import type { Period } from "@/lib/flows/periods";
import { updatesHref } from "./controls";

const CHIPS: { type?: FilingType; label: string }[] = [{ label: "All" }, ...FILING_TYPES];

// Filters the filings by type, as ToneChips does the headlines by tone. A type with no filings
// right now is shown but can't be picked.
export function TypeChips({ counts, active, sector, period }: { counts: Record<FilingType, number>; active?: FilingType; sector?: string; period?: Period }) {
  return (
    <nav aria-label="Filter by filing type" className="flex flex-wrap items-center gap-2">
      {CHIPS.map((c) => {
        const on = c.type === active;
        const n = c.type ? counts[c.type] : null;
        const cls =
          "tap-y inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold " +
          (on ? "border-accent bg-accent text-bg" : "border-btn text-ink-soft hover:bg-accent/10 hover:text-ink");
        const body = (
          <>
            {c.label}
            {n != null && <span className={"font-mono font-normal " + (on ? "text-bg/80" : "text-ink-soft")}>{n}</span>}
          </>
        );
        // A type with nothing in it can't be picked; one already picked (a shared link) stays a link.
        return n === 0 && !on ? (
          <span key={c.label} aria-disabled="true" className={cls + " opacity-50"}>
            {body}
          </span>
        ) : (
          <Link key={c.label} href={updatesHref({ sector, view: "filings", type: c.type, period })} scroll={false} aria-current={on ? "page" : undefined} className={cls}>
            {body}
          </Link>
        );
      })}
      <InfoTip label="What counts as a filing here">
        Announcements covered companies made to NSE in the last 7 days: results, orders, deals and stake changes, dividends and buybacks, credit ratings, management changes and other material events. Routine notices (call schedules, newspaper copies, trading-window dates) are left out. The summary is NSE&rsquo;s own; open the PDF for the full filing.
      </InfoTip>
    </nav>
  );
}
