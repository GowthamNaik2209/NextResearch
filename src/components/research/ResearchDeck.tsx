"use client";

import type { Deck } from "@/lib/sector-content/reports";
import { Presentation } from "./Presentation";
import { SLIDES } from "./slides";

// One sector's ten-slide research deck in the shared pop-up presentation.
export function ResearchDeck({
  deck,
  onClose,
  initialSlide = 0,
  urlParam,
}: {
  deck: Deck;
  onClose: () => void;
  initialSlide?: number;
  /** Name the deck in the URL while open (?report=<slug>); see Presentation. */
  urlParam?: string;
}) {
  const isPolicy = deck.category === "policy";
  return (
    <Presentation
      icon={deck.icon}
      kicker={`${isPolicy ? "Policy report" : "Industry report"} · ${deck.name}`}
      ariaLabel={`${deck.report.title} research report`}
      slides={SLIDES}
      renderSlide={(i, openStock) => {
        const Slide = SLIDES[i].Component;
        return <Slide deck={deck} openCompany={openStock} />;
      }}
      cta={(i) => ({
        ...(SLIDES[i].cta?.(deck) ?? { href: `/sector/${deck.slug}`, label: `Open ${isPolicy ? "policy" : "industry"} page` }),
        short: `${isPolicy ? "Policy" : "Industry"} page`,
      })}
      extra={(i) => SLIDES[i].extra?.(deck)}
      onClose={onClose}
      initialSlide={initialSlide}
      urlParam={urlParam ? { name: urlParam, value: deck.slug } : undefined}
    />
  );
}
