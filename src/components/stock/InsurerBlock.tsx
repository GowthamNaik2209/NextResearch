import type { SupplierFinancials } from "@/lib/sector-content";
import { BlockCard } from "./LenderBlock";
import { insurerRows } from "./kind-blocks";

// An insurer's own figures under the usual Key stats in the stock pop-up and on the company page
// (the rows come from kind-blocks.ts). One i button for the whole block.

export const INSURER_NOTE =
  "How an insurer is read beyond the Key stats above (P/B, ROE and revenue growth, which is premiums with investment income): how profitable a life insurer's new policies are (VNB margin) and its price against embedded value (P/EV), what a general insurer pays in claims and costs per ₹100 of premium (combined ratio; under 100% is an underwriting profit) and its capital cover (solvency ratio; the regulator asks for at least 1.5x). VNB margin, P/EV, combined and solvency ratios are kept by hand from each insurer's quarterly public disclosures; tap a quarter for its source.";

export function InsurerBlock({ f, compact, className }: { f: SupplierFinancials; compact?: boolean; className?: string }) {
  const { rows, missing } = insurerRows(f);
  return (
    <BlockCard title="Insurance figures" info={INSURER_NOTE} rows={rows} compact={compact} className={className}>
      {missing && <p className="mt-1.5 text-[10.5px] leading-snug text-ink-soft">Insurance figures not yet added: they are kept by hand from each quarter&rsquo;s public disclosure.</p>}
    </BlockCard>
  );
}
