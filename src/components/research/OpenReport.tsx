"use client";

import { useState } from "react";
import type { Deck } from "@/lib/sector-content/reports";
import { ResearchDeck } from "./ResearchDeck";

// A button that opens a sector's research deck in the slide pop-up. `deck` is built
// on the server (buildDeck) so this client component never imports sector content.
export function OpenReportButton({ deck, className = "", children }: { deck: Deck; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        {children}
      </button>
      {open && <ResearchDeck deck={deck} onClose={() => setOpen(false)} />}
    </>
  );
}
