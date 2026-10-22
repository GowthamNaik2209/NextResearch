"use client";

import { useCallback, useState } from "react";
import { LazyResearchDeck, intentProps, prefetchReport } from "./LazyDecks";

// A button that opens a sector's research deck in the slide pop-up. The deck loads when the
// button is hovered or pressed (/docs/deck/<slug>), so the page doesn't carry it.
export function OpenReportButton({ slug, className = "", children }: { slug: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} {...intentProps(() => prefetchReport(slug))} aria-haspopup="dialog" className={className}>
        {children}
      </button>
      {open && <LazyResearchDeck slug={slug} onClose={close} />}
    </>
  );
}
