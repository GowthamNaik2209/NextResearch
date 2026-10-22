// Rare-Earth Magnets (REPM): what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.rareearth) and ../docs.ts (SECTOR_DOCS.rareearth).
import type { Scenario } from "../scenarios";
import type { ResearchLink } from "../docs";

export const RAREEARTH_SCENARIOS: Scenario[] = [
  {
    id: "china-curbs-return",
    title: "China's curbs come back",
    blurb: "The pause on China's Oct 2025 export controls lapses after 10 Nov 2026",
    story:
      "China paused its tougher October 2025 rare-earth and magnet controls for a year, to 10 November 2026; the April 2025 licensing regime is still in force. If the pause lapses, Indian magnet buyers face licence delays again before any Indian plant can produce (scheme plants need about two years from award). Motor and e-scooter makers are hit first, as in mid-2025. The upside goes to anyone who can make magnets or oxide outside China, which strengthens the case for the scheme and for faster awards.",
    effect: "headwind",
    impacts: [
      { zone: "ev_2w", severity: 3, why: "E-scooter output fell by about half at Bajaj in July 2025 the last time" },
      { zone: "ev_motors", severity: 3, why: "Permanent-magnet motors cannot ship without magnets; redesigns take quarters" },
      { zone: "defence", severity: 2, why: "Chinese licences already exclude defence end-uses; any tightening hurts more" },
      { zone: "wind", severity: 1, why: "India's geared DFIG turbines use little magnet, so the hit is small" },
      { zone: "magnet_making", severity: 2, effect: "tailwind", why: "Buyers pay up for non-China supply; pressure to award the scheme quickly" },
      { zone: "recycling", severity: 1, effect: "tailwind", why: "Scrap magnets become more valuable feedstock" },
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
    id: "ferrite-shift",
    title: "Motors move to ferrite",
    blurb: "Two-wheeler makers switch to rare-earth-free motors faster than expected",
    story:
      "Ola has certified a ferrite motor, TVS is reported (unconfirmed) to be working on one, and Sona Comstar has rare-earth-free motors validated for three-wheelers. If ferrite and magnet-free designs spread quickly in two- and three-wheelers, domestic demand for NdFeB magnets grows more slowly than the government's 'double by 2030' estimate. Vehicle makers win on supply security; new Indian magnet plants face thinner demand and more pressure on price.",
    effect: "headwind",
    impacts: [
      { zone: "magnet_making", severity: 2, why: "Smaller domestic market for the scheme's magnets" },
      { zone: "recycling", severity: 1, why: "Less future scrap from two-wheeler motors" },
      { zone: "ev_2w", severity: 2, effect: "tailwind", why: "Less exposure to China curbs and cheaper motors" },
      { zone: "ev_motors", severity: 1, effect: "tailwind", why: "Motor makers with ferrite designs win share in small vehicles" },
    ],
  },
  {
    id: "hardrock-breakthrough",
    title: "Hard-rock rare earths scale up",
    blurb: "Ambadungar and other inland deposits move from pilot to production",
    story:
      "GMDC's Ambadungar deposit (BARC technology, Jan 2026) and the GMDC-NMDC partnership prove the process at scale, and corridor states push new separation plants. India gets oxide from sources beyond IREL's beach-sand monazite, which eases the scheme's biggest constraint. Listed miners finally have rare-earth revenue to show, and magnet makers outside IREL's three oxide slots can source locally.",
    effect: "tailwind",
    impacts: [
      { zone: "hardrock", severity: 3, why: "Pilot-to-commercial step turns an option into a business" },
      { zone: "separation", severity: 2, why: "New feed needs new separation capacity" },
      { zone: "magnet_making", severity: 2, why: "Oxide for winners beyond IREL's allocation" },
      { zone: "beach_sand", severity: 1, effect: "headwind", why: "IREL loses its near-monopoly over feedstock" },
    ],
  },
];

// Each URL loaded on 20 Oct 2026.
export const RAREEARTH_DOCS: ResearchLink[] = [
  { title: "Cabinet approves Rs 7,280 crore scheme for sintered rare-earth permanent magnets", source: "PIB, 26 Nov 2025", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2194687" },
  { title: "Scheme notification (S.O. 5800(E)), RFP and addenda", source: "Ministry of Heavy Industries", url: "https://heavyindustries.gov.in/en/scheme-notification" },
  { title: "MHI receives 20 bids for integrated sintered NdFeB magnet plants", source: "PIB, 13 Aug 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2299078" },
  { title: "India's REE strategy: turning resources into capacity", source: "Observer Research Foundation", url: "https://www.orfonline.org/research/india-s-ree-strategy-turning-resources-into-capacity" },
];
