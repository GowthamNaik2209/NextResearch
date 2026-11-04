// Capital Markets: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.capmarkets) and ../docs.ts (SECTOR_DOCS.capmarkets).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const CAPMARKETS_SCENARIOS: Scenario[] = [
  {
    id: "fo-curbs-round-two",
    title: "SEBI tightens F&O again",
    blurb: "Fewer weekly expiries, bigger lots or another STT rise",
    story:
      "SEBI's 2024-25 rules (one weekly expiry per exchange, bigger contracts, upfront premium) roughly halved options volumes in FY26, and the April 2026 STT hike added cost. If SEBI goes further - scrapping the remaining weekly expiries or raising lot sizes again - options orders fall once more. Exchanges and F&O-heavy brokers are hit first; depositories and cash-market income barely move. Retail traders may drift to commodity options on MCX.",
    effect: "headwind",
    impacts: [
      S("exchanges", 3, "Equity options are the largest revenue line for NSE and almost all of BSE's growth"),
      S("brokers", 3, "Most discount-broker orders are F&O"),
      S("wealth", 1, "Clearing and institutional desks see lower volumes"),
      S("depositories", 1, "Little direct effect - F&O does not move shares between demat accounts"),
      S("amc", 1, "Some trading money may move into SIPs instead", "tailwind"),
    ],
    stocks: [
      { key: "bse", severity: 3, why: "Its Sensex weekly expiry is the business; losing it would hurt most" },
      { key: "angelOne", severity: 3, why: "F&O orders are still the bulk of its revenue" },
      { key: "mcx", severity: 1, effect: "tailwind", why: "Commodity options are outside the equity curbs (unless SEBI extends them)" },
    ],
  },
  {
    id: "long-bear-market",
    title: "A long equity bear market",
    blurb: "Shares fall for a year; SIPs stop and IPOs dry up",
    story:
      "Almost every income line in this chain is a share of market value or market activity. In a year-long fall, AUM-linked fees (AMCs, registrars, wealth managers) shrink with prices, new SIP registrations slow and some stop, IPOs and QIPs are postponed, and new demat accounts dry up. Rating agencies are the least exposed, as bank-loan and bond ratings continue.",
    effect: "headwind",
    impacts: [
      S("amc", 3, "Equity AUM - and fees - fall with prices; SIP stoppages rise"),
      S("wealth", 3, "Advised assets and transactional income both fall"),
      S("ibanking", 3, "IPO and QIP pipelines are postponed"),
      S("distribution", 2, "Trail commissions shrink with AUM"),
      S("registrars", 2, "Fees are basis points of AUM"),
      S("brokers", 2, "Active clients fall; margin books shrink"),
      S("exchanges", 2, "Cash volumes and new listings fall; options hold up better"),
      S("depositories", 2, "Fewer new accounts and debits"),
      S("ratings", 1, "Bond and loan ratings continue, equity-linked work slows"),
    ],
    episode: { label: "Sep 2024 - Mar 2025 correction", from: "2024-09-27", to: "2025-03-03", note: "The Nifty fell about 15% from its September 2024 peak while FPIs sold heavily and SEBI's first F&O curbs started." },
  },
  {
    id: "fee-cut",
    title: "SEBI cuts fund fees again",
    blurb: "A lower expense-ratio cap or a cut in distributor trail",
    story:
      "SEBI reshaped expense ratios in April 2026 (a base expense ratio, with brokerage caps halved). A further cut - lower slabs for large schemes or a cap on distributor commission - would come straight out of AMC and distributor margins. Registrars are paid by AMCs and usually get squeezed at the next renewal. Investors gain; direct-plan apps lose less than commission-based distributors.",
    effect: "headwind",
    impacts: [
      S("amc", 3, "Revenue yield on AUM falls directly"),
      S("distribution", 3, "Trail commissions are paid out of the expense ratio"),
      S("registrars", 2, "AMCs push RTA pricing down at renewal"),
      S("wealth", 1, "MF-led wealth managers earn trails too"),
      S("ibanking", 1, "Lower brokerage caps cut institutional commissions"),
      S("brokers", 1, "Direct-plan platforms gain share from distributors", "tailwind"),
    ],
  },
  {
    id: "ipo-supercycle",
    title: "IPO supercycle continues",
    blurb: "Record fund-raising as start-ups, PSUs and subsidiaries list",
    story:
      "2025-26 brought some of India's largest IPOs (NSE, SBI Funds, ICICI Prudential AMC, Groww). If the pipeline of start-ups, PSU stake sales and conglomerate subsidiaries keeps coming, bankers earn more mandates, exchanges and depositories add annual listing and issuer fees, registrars process more allotments, and newly rich promoters and employees become wealth-management clients.",
    effect: "tailwind",
    impacts: [
      S("ibanking", 3, "More IPO, QIP and block mandates"),
      S("wealth", 2, "IPO and ESOP wealth flows to private-wealth managers"),
      S("exchanges", 2, "Listing fees and more stocks to trade"),
      S("depositories", 2, "Each listing pays annual issuer charges; IPOs pull in new demat accounts"),
      S("registrars", 2, "IPO allotment and share-registry work (KFin leads)"),
      S("brokers", 2, "IPO applications drive account openings"),
      S("ratings", 1, "More debt raising alongside equity"),
    ],
    stocks: [
      { key: "kfin", severity: 3, why: "Largest issuer registrar - handles many IPO allotments" },
      { key: "jmFinancial", severity: 3, why: "Equity capital markets are its core franchise" },
    ],
  },
];

export const CAPMARKETS_DOCS: ResearchLink[] = [
  { title: "Monthly mutual-fund data: AUM, SIP flows, folios", source: "Association of Mutual Funds in India (AMFI)", url: "https://www.amfiindia.com/research-information/amfi-monthly" },
  { title: "Market Pulse: monthly review of investors, volumes and market structure", source: "National Stock Exchange of India", url: "https://www.nseindia.com/research/publications-reports-nse-market-pulse" },
  { title: "SEBI reports, including the studies of individual traders' F&O losses", source: "Securities and Exchange Board of India", url: "https://www.sebi.gov.in/reports-and-statistics/reports.html" },
  { title: "Net losses of individual F&O traders widened in FY25: SEBI study", source: "Business Standard", url: "https://www.business-standard.com/markets/news/net-losses-of-traders-in-fo-widens-in-fy25-sebi-study-125070701221_1.html" },
];
