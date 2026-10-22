"use client";

import type { IpoDeck } from "@/lib/ipo-content";
import { Presentation } from "@/components/research/Presentation";
import { IPO_SLIDES } from "./IpoSlides";

// One IPO's ten-slide deck in the shared pop-up presentation. The footer's main link is the
// offer document itself; an IPO that belongs to a sector we map also links that sector's page.
export function IpoDeckView({
  deck,
  onClose,
  initialSlide = 0,
  urlParam,
}: {
  deck: IpoDeck;
  onClose: () => void;
  initialSlide?: number;
  /** Name the deck in the URL while open (?ipo=<slug>); see Presentation. */
  urlParam?: string;
}) {
  const doc = deck.sources[0];
  return (
    <Presentation
      icon={deck.icon}
      kicker={`IPO · ${deck.name}`}
      ariaLabel={`${deck.name} IPO deck`}
      slides={IPO_SLIDES}
      renderSlide={(i, openStock) => {
        const Slide = IPO_SLIDES[i].Component;
        return <Slide deck={deck} openStock={openStock} />;
      }}
      cta={() =>
        doc
          ? { href: doc.url, label: "Read the offer document", short: "Offer document", external: true }
          : { href: "/ipos", label: "All upcoming IPOs", short: "All IPOs" }
      }
      extra={() => (deck.sectorSlug ? { href: `/sector/${deck.sectorSlug}`, label: "Industry page" } : undefined)}
      onClose={onClose}
      initialSlide={initialSlide}
      urlParam={urlParam ? { name: urlParam, value: deck.slug } : undefined}
    />
  );
}
