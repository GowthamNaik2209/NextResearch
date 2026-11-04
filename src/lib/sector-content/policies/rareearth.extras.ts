// Critical Minerals & Rare Earths (NCMM + REPM): what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.rareearth) and ../docs.ts (SECTOR_DOCS.rareearth).
import type { Scenario } from "../scenarios";
import type { ResearchLink } from "../docs";

export const RAREEARTH_SCENARIOS: Scenario[] = [
  {
    id: "china-curbs-return",
    title: "China's curbs come back",
    blurb: "China paused its Oct 2025 export controls for one year only, to 10 Nov 2026",
    story:
      "China paused its tougher October 2025 rare-earth, magnet and battery-material controls for a year, to 10 November 2026; the April 2025 licensing regime is still in force. If the pause lapses, Indian magnet buyers face licence delays again before any Indian plant can produce (scheme plants need about two years from award), and battery-material supply chains get tighter too. Motor and e-scooter makers are hit first, as in mid-2025. The upside goes to anyone who can make magnets, oxide or battery salts outside China - recyclers included - which strengthens the case for faster awards and for the Critical Mineral Mission's overseas push.",
    effect: "headwind",
    impacts: [
      { zone: "ev_2w", severity: 3, why: "E-scooter output fell by about half at Bajaj in July 2025 the last time" },
      { zone: "ev_motors", severity: 3, why: "Permanent-magnet motors cannot ship without magnets; redesigns take quarters" },
      { zone: "defence", severity: 2, why: "Chinese licences already exclude defence end-uses; any tightening hurts more" },
      { zone: "wind", severity: 1, why: "India's geared DFIG turbines use little magnet, so the hit is small" },
      { zone: "magnet_making", severity: 2, effect: "tailwind", why: "Buyers pay up for non-China supply; pressure to award the scheme quickly" },
      { zone: "recycling", severity: 1, effect: "tailwind", why: "Scrap magnets become more valuable feedstock" },
      { zone: "battery_recycling", severity: 1, effect: "tailwind", why: "Recovered lithium, cobalt and nickel gain value as non-China supply" },
      { zone: "lithium", severity: 1, effect: "tailwind", why: "More urgency behind KABIL and Coal India's overseas deals" },
    ],
  },
  {
    id: "scheme-awards",
    title: "Scheme winners named",
    blurb: "MHI picks the five beneficiaries and IREL allocates oxide",
    story:
      "The ministry opens financial bids and names up to five winners for 6,000 tonnes a year, each with a sales-linked incentive of up to ₹2,150 per kg for five years after a two-year build, and 500 tonnes a year of IREL NdPr oxide shared by the three lowest bidders. Winners get a funded path to a new business; for a small-cap like 20 Microns that is large relative to its size, for L&T or Coal India it is a footnote. Buyers gain a visible second source from about 2028, and upstream separation and alloy capacity has to follow.",
    effect: "tailwind",
    impacts: [
      { zone: "magnet_making", severity: 3, why: "Allotted tonnes, incentive per kg and IREL oxide define the winners" },
      { zone: "metal_alloy", severity: 2, why: "Winners must build oxide-to-metal and alloy steps in-house" },
      { zone: "separation", severity: 2, why: "IREL's oxide guarantee tightens; demand for more NdPr oxide" },
      { zone: "ev_motors", severity: 1, why: "A local second source starts qualification work" },
      { zone: "beach_sand", severity: 1, why: "More monazite needed over time" },
    ],
  },
  {
    id: "copper-squeeze",
    title: "Copper stays scarce",
    blurb: "Record copper prices and a global concentrate shortage persist",
    story:
      "Copper hit a record in September 2026 (LME three-month US$14,533 a tonne) as mine supply lagged electrification demand. If that persists, the miner wins and the custom smelters lose: Hindustan Copper earns more on every tonne it digs, while Hindalco's Dahej and Adani's Mundra plants pay up for scarce concentrate and earn thin processing fees. Recyclers who recover copper from e-waste gain, and the Mission's overseas copper hunt (Coal India in Chile) becomes more urgent.",
    effect: "tailwind",
    impacts: [
      { zone: "copper", severity: 2, why: "Higher prices help the miner; low processing fees hurt custom smelters" },
      { zone: "battery_recycling", severity: 1, why: "Recovered copper from e-waste is worth more" },
      { zone: "lithium", severity: 1, why: "Overseas deals widen from lithium to copper assets" },
      { zone: "ev_motors", severity: 1, effect: "headwind", why: "Copper windings get costlier for motor makers" },
    ],
  },
  {
    id: "hardrock-breakthrough",
    title: "Mission supply starts to land",
    blurb: "Auctioned blocks, Ambadungar and overseas lithium move from paper to production",
    story:
      "GMDC's Ambadungar deposit (BARC technology, Jan 2026) proves its process at scale, the first auctioned critical-mineral blocks (56 by June 2026) clear exploration and permits, and KABIL's Argentine lithium blocks find a resource worth developing. India gets oxide and battery minerals from sources beyond IREL's beach-sand monazite and Chinese refiners, which eases the magnet scheme's biggest constraint. Listed miners - GMDC, Coal India, Hindustan Zinc, Vedanta - finally have critical-mineral revenue to show.",
    effect: "tailwind",
    impacts: [
      { zone: "hardrock", severity: 3, why: "Pilot-to-commercial step turns an option into a business" },
      { zone: "separation", severity: 2, why: "New feed needs new separation capacity" },
      { zone: "magnet_making", severity: 2, why: "Oxide for winners beyond IREL's allocation" },
      { zone: "auctions", severity: 2, why: "Block wins start turning into mines and royalties" },
      { zone: "lithium", severity: 2, why: "Overseas brine blocks move towards production" },
      { zone: "beach_sand", severity: 1, effect: "headwind", why: "IREL loses its near-monopoly over feedstock" },
    ],
  },
];

// Each URL loaded on 3 Nov 2026.
export const RAREEARTH_DOCS: ResearchLink[] = [
  { title: "Cabinet approves National Critical Mineral Mission", source: "PIB / PM India, 29 Jan 2025", url: "https://www.pmindia.gov.in/en/news_updates/cabinet-approves-national-critical-mineral-mission-to-build-a-resilient-value-chain-for-critical-mineral-resources-vital-to-green-technologies-with-an-outlay-of-rs-34300-crore-over-seven-years" },
  { title: "Cabinet approves Rs 7,280 crore scheme for sintered rare-earth permanent magnets", source: "PIB, 26 Nov 2025", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2194687" },
  { title: "MHI receives 20 bids for integrated sintered NdFeB magnet plants", source: "PIB, 13 Aug 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2299078" },
  { title: "Cabinet approves ₹1,500 crore incentive scheme to promote critical mineral recycling", source: "PIB, 3 Sep 2025", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163454" },
];
