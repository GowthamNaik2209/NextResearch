// Hotels & Travel: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.hotels) and ../docs.ts (SECTOR_DOCS.hotels).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const HOTELS_SCENARIOS: Scenario[] = [
  {
    id: "supply-lags-demand",
    title: "Room demand keeps outrunning new supply",
    blurb: "Premium occupancy climbs into the 70s and room rates keep rising",
    story:
      "ICRA (Sep 2026) expects premium hotel occupancy of 72-74% in FY27, and HVS Anarock counted only about 14,199 rooms opened in CY2025 against 64,118 keys signed. If new rooms keep arriving slowly while weddings, business travel and domestic leisure grow, hotels raise room rates rather than fill empty rooms. Owners with fixed room counts in big cities gain the most; brands earn more fees on the same hotels; budget platforms see owners join brands to share the upside.",
    effect: "tailwind",
    impacts: [
      S("luxury_chains", 3, "Room rates and RevPAR rise on largely fixed costs"),
      S("asset_owners", 3, "Fixed room counts in supply-short cities capture the full rate rise"),
      S("midscale_chains", 2, "Spill-over demand and more owners signing brands"),
      S("franchise_stays", 1, "Independent hotels join platforms to lift rates"),
      S("distribution", 1, "Higher room rates lift commission per booking"),
    ],
  },
  {
    id: "signings-turn-to-supply",
    title: "The record pipeline opens all at once",
    blurb: "Hotels signed in 2024-26 open together from 2027 and cap room rates",
    story:
      "Signings hit a record 64,118 keys in CY2025 (HVS Anarock), most of them management contracts for brands that put up little capital. If a large share opens in 2027-29, especially in tier-2 cities and a few metro micro-markets, room-rate growth slows. Fee-earning brands still add hotels and fees, but owners in crowded markets see occupancy and rates fall, and midscale chains feel it first because their guests compare prices online.",
    effect: "headwind",
    impacts: [
      S("midscale_chains", 3, "Most new rooms are midscale in tier-2/3 cities"),
      S("asset_owners", 2, "Owners in crowded micro-markets lose rate and occupancy"),
      S("luxury_chains", 1, "Fee income still grows with more managed hotels, but owned-hotel rates slow"),
      S("franchise_stays", 2, "Budget platforms face more competition for owners and guests"),
      S("distribution", 1, "More rooms to sell; hotels spend more on online agents", "tailwind"),
    ],
  },
  {
    id: "air-capacity-squeeze",
    title: "Air seats stay short",
    blurb: "Engine groundings, airline distress and crew rules keep domestic capacity tight",
    story:
      "Domestic air traffic fell 0.8% in Jan-Sep 2026 (DGCA) as SpiceJet shrank, IndiGo and Air India ran short of aircraft, and crew-duty rules forced cancellations. If capacity stays tight, fares stay high: fly-in leisure markets (Goa, Rajasthan, Kerala, the north-east) and airports lose volume, while drive-to and rail tourism - theme parks, Club Mahindra resorts, IRCTC trains - pick up travellers who choose not to fly.",
    effect: "headwind",
    impacts: [
      S("airlines", 2, "Higher fares support yields, but SpiceJet's distress and groundings cut volume"),
      S("airports", 3, "Passenger growth stalls at concession airports"),
      S("airport_services", 2, "Terminal food and lounge sales track footfall"),
      S("luxury_chains", 1, "Fly-in leisure hotels lose arrivals; city hotels less affected"),
      S("parks", 1, "Drive-to family leisure gains", "tailwind"),
      S("holidays", 1, "Rail and road tourism packages gain", "tailwind"),
    ],
  },
  {
    id: "inbound-geopolitics-shock",
    title: "Foreign tourists and West Asia routes stay disrupted",
    blurb: "Conflict closes Gulf routes and keeps foreign tourist arrivals below 2019",
    story:
      "Foreign tourist arrivals fell 9.4% to about 9 million in 2025 (Ministry of Tourism via CAPA), still below pre-Covid levels, and conflict in West Asia has disrupted Gulf-routed flights. A longer disruption hurts tour operators with Middle East businesses, B2B wholesalers selling Gulf hotels, and visa-desk volumes, while luxury hotels lean harder on domestic guests. Domestic leisure and pilgrimage travel act as the cushion.",
    effect: "headwind",
    impacts: [
      S("holidays", 3, "Outbound packages and Gulf destination businesses (Thomas Cook's DEI) hit"),
      S("distribution", 2, "Middle East hotel and air bookings fall for B2B wholesalers"),
      S("visa_forex", 2, "Fewer visa applications and forex sales"),
      S("luxury_chains", 1, "Inbound luxury guests fall; domestic demand fills part of the gap"),
      S("airlines", 1, "International routes rerouted or suspended"),
    ],
  },
];

export const HOTELS_DOCS: ResearchLink[] = [
  { title: "Domestic hotel demand anchors growth amid global travel (hotels quarterly update)", source: "ICRA (29 Sep 2026)", url: "https://www.icra.in/Research/ViewResearchReport/7133" },
  { title: "India hospitality industry overview 2025: occupancy, ADR, RevPAR and signings", source: "HVS Anarock via Hospitality Net", url: "https://www.hospitalitynet.org/news/4132315/hvs-anarock-india-hospitality-industry-overview-2025" },
  { title: "IHCL Q2 FY2027 results: RevPAR up 25%, FY27 guidance raised", source: "IHCL press release (26 Oct 2026)", url: "https://www.journaldespalaces.com/en/pressrelease-79864-india-ihcl-announces-financial-results-for-q2-fy2027-18th-consecutive-record-quarter-best-ever-q2-upgrades-fy2027-revenue-guidance-by-300-basis-points.html" },
  { title: "India records ~9m foreign tourist arrivals in 2025, down 9%", source: "CAPA (Feb 2026)", url: "https://centreforaviation.com/news/india-records-9m-foreign-tourist-arrivals-in-2025-down-9-1348185" },
];
