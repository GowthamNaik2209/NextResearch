import { SEMICON2_DOCS } from "./policies/semicon2.extras";
import { RAREEARTH_DOCS } from "./policies/rareearth.extras";
import { DEFENCEPROC_DOCS } from "./policies/defenceproc.extras";
import { ECMS_DOCS } from "./policies/ecms.extras";

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
  realestate: [
    { title: "Residential, office, warehousing & investment research", source: "Knight Frank India", url: "https://www.knightfrank.co.in/research" },
    { title: "Research reports (housing sales, city viewpoints, homebuyer surveys)", source: "ANAROCK Research", url: "https://www.anarock.com/research/research-reports" },
    { title: "REIT distributions, AUM and investor data", source: "Indian REITs Association", url: "https://indianreitsassociation.com/" },
    { title: "RESIDEX housing price index", source: "National Housing Bank", url: "https://residex.nhbonline.org.in/" },
  ],
  pharma: [
    { title: "Annual reports", source: "Department of Pharmaceuticals, Government of India", url: "https://pharma-dept.gov.in/annual-report" },
    { title: "Indian Pharmaceutical Alliance", source: "IPA", url: "https://www.ipa-india.org/" },
    { title: "Export data and publications", source: "Pharmexcil", url: "https://pharmexcil.com/" },
    { title: "Reports and publications", source: "IQVIA Institute for Human Data Science", url: "https://www.iqvia.com/insights/the-iqvia-institute/reports-and-publications" },
  ],
  semicon2: SEMICON2_DOCS,
  rareearth: RAREEARTH_DOCS,
  defenceproc: DEFENCEPROC_DOCS,
  ecms: ECMS_DOCS,
};

export function getResearchForSector(slug: string): ResearchLink[] {
  return SECTOR_DOCS[slug] ?? [];
}
