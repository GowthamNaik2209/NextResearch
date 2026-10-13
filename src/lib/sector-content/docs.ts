// Curated external reading list per sector — first-class industry/research
// sources (McKinsey, IEA, trade bodies, etc.) for people who want to read
// beyond this app's own 3D maps and financials. Kept as its own small content
// file (keyed by the same slugs as `products.ts`) rather than bolted onto
// `SectorDef`, so it can be edited/extended without touching the large
// untyped 3D content file.
export type ResearchLink = {
  title: string;
  source: string;
  url: string;
};

// Starter set: one or two stable, top-level hub pages per sector from
// well-known organizations' own sites (McKinsey's industry insight hubs, IEA,
// IRENA, GSMA, SIA, UIC). These are topic/industry hubs, not specific report
// deep-links — swap in or add specific report URLs as you curate them.
export const SECTOR_DOCS: Record<string, ResearchLink[]> = {
  ev4w: [
    { title: "Automotive & Assembly insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/automotive-and-assembly/our-insights" },
    { title: "Electric vehicles", source: "International Energy Agency (IEA)", url: "https://www.iea.org/topics/electric-vehicles" },
  ],
  semiconductors: [
    { title: "Semiconductors insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/semiconductors/our-insights" },
    { title: "Industry data & research", source: "Semiconductor Industry Association (SIA)", url: "https://www.semiconductors.org" },
  ],
  datacenter: [
    { title: "Technology, Media & Telecommunications insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights" },
    { title: "Data centres and data transmission networks", source: "International Energy Agency (IEA)", url: "https://www.iea.org/topics/data-centres-and-data-transmission-networks" },
  ],
  railways: [
    { title: "Travel, Logistics & Infrastructure insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/travel-logistics-and-infrastructure/our-insights" },
    { title: "Statistics & research", source: "International Union of Railways (UIC)", url: "https://uic.org" },
  ],
  naval: [
    { title: "Aerospace & Defense insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/aerospace-and-defense/our-insights" },
  ],
  aerospace: [
    { title: "Aerospace & Defense insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/aerospace-and-defense/our-insights" },
  ],
  telecom5g: [
    { title: "Technology, Media & Telecommunications insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights" },
    { title: "Industry data & research", source: "GSMA", url: "https://www.gsma.com" },
  ],
  solarmodules: [
    { title: "Solar", source: "International Energy Agency (IEA)", url: "https://www.iea.org/topics/solar" },
    { title: "Publications", source: "International Renewable Energy Agency (IRENA)", url: "https://www.irena.org" },
  ],
  energy: [
    { title: "Electric Power & Natural Gas insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/electric-power-and-natural-gas/our-insights" },
    { title: "Reports & analysis", source: "International Energy Agency (IEA)", url: "https://www.iea.org" },
  ],
};

export function getResearchForSector(slug: string): ResearchLink[] {
  return SECTOR_DOCS[slug] ?? [];
}
