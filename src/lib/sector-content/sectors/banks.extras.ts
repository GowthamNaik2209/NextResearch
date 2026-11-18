// Banks & NBFCs: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.banks) and ../docs.ts (SECTOR_DOCS.banks).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const BANKS_SCENARIOS: Scenario[] = [
  {
    id: "rates-keep-rising",
    title: "RBI keeps raising rates",
    blurb: "After the Oct 2026 hike to 5.50%, the repo rate climbs toward 6% or more",
    story:
      "RBI raised the repo rate 25 bps to 5.50% on 7 Oct 2026 and changed its stance to 'calibrated tightening', with inflation projected above 5% for the rest of the year. If it keeps going, banks whose loans are linked to the repo rate re-price their loans within weeks while most deposits re-price slowly, so large banks with strong current and savings deposits earn more for a few quarters. NBFCs and housing finance companies borrow from banks and bond markets at fixed or quickly resetting rates and lend at fixed rates, so their spreads narrow first. State infrastructure lenders mostly pass costs through. Higher rates also cool demand for home and vehicle loans.",
    effect: "headwind",
    impacts: [
      S("large_banks", 2, "Repo-linked loans re-price faster than deposits; spreads widen for a while", "tailwind"),
      S("psu_banks", 1, "Loan re-pricing helps, but bond holdings lose value as yields rise"),
      S("consumer_credit", 3, "Bank- and bond-funded NBFCs pay more at once; loan yields lag"),
      S("vehicle_finance", 2, "Fixed-rate vehicle loans and higher funding costs squeeze spreads"),
      S("prime_housing", 2, "HFCs compete with banks on price while paying more for funds"),
      S("affordable_housing", 2, "Bond-funded HFCs see spreads narrow; buyers delay purchases"),
      S("infra_lenders", 1, "Costs passed through to borrowers with a lag"),
    ],
    stocks: [
      { key: "hdfcBank", severity: 2, effect: "tailwind", why: "Large repo-linked book and deep deposit base" },
      { key: "bajfinance", severity: 2, why: "Largest bond- and bank-funded retail NBFC" },
      { key: "irfc", severity: 1, effect: "tailwind", why: "Cost-plus leases pass higher rates to the Railways" },
    ],
  },
  {
    id: "unsecured-stress",
    title: "Unsecured credit stress returns",
    blurb: "Small personal loans, cards and microfinance slip back into high defaults",
    story:
      "Microfinance overdues (31-90 days) fell to 1.6% by Dec 2025 from 3.2% a year earlier (MFIN), and personal loans are growing at 17% again (RBI, Sep 2026). If borrowers once more take too many small unsecured loans and a rate rise or a weak harvest hits their incomes, defaults climb first in microfinance, small app-based loans and credit cards. MFIs, small finance banks and banks with large micro-loan books take the losses; gold lenders and secured lenders gain as borrowers and lenders move to collateral.",
    effect: "headwind",
    impacts: [
      S("microfinance", 3, "Overdues and write-offs rise; funding to smaller MFIs dries up"),
      S("sfb", 3, "Former MFIs still carry large micro-loan books"),
      S("consumer_credit", 3, "Small personal loans and card revolve go bad first"),
      S("midsize_private", 2, "Banks with micro-loan and card books (Bandhan, IndusInd, RBL) take losses"),
      S("gold_loans", 2, "Borrowers and lenders switch to gold-backed loans", "tailwind"),
      S("oversight", 1, "RBI tightens risk weights or lending caps again"),
    ],
    stocks: [
      { key: "muthootFinance", severity: 2, effect: "tailwind", why: "Gold loans gain share when unsecured lending turns risky" },
      { key: "sbiCard", severity: 2, why: "Revolving card balances are among the first to default" },
    ],
  },
  {
    id: "psu-consolidation",
    title: "Smaller PSU banks are merged",
    blurb: "The government folds the five smaller public-sector banks into larger ones",
    story:
      "The 2019-20 mergers cut India's public-sector banks to twelve. Five smaller ones (Bank of Maharashtra, Central Bank, IOB, UCO and Punjab & Sind) remain, with the government still holding most of their shares above the public-float limit. If the government merges them into larger state banks, it avoids selling shares into a weak market and creates fewer, stronger banks. Holders of the smaller banks get shares of the acquirer; acquirers take on integration work, staff and IT costs for several years.",
    effect: "headwind",
    impacts: [
      S("psu_banks", 3, "Acquirers face integration costs; small banks' share overhang ends"),
      S("large_banks", 1, "SBI could be asked to absorb a bank, as in past rounds"),
      S("oversight", 1, "RBI and the government manage capital and depositor continuity"),
      S("credit_rails", 1, "Core-banking migrations bring software and services work", "tailwind"),
    ],
  },
  {
    id: "foreign-owners",
    title: "Foreign banks keep buying in",
    blurb: "RBI keeps approving large foreign stakes in mid-size banks and NBFCs",
    story:
      "SMBC bought 20% of Yes Bank (Sep 2025), Blackstone got RBI approval for up to 9.99% of Federal Bank (Feb 2026), MUFG took 20% of Shriram Finance (Apr 2026), Emirates NBD completed 60% of RBL Bank (Jun 2026), IHC took control of Sammaan Capital (May 2026) and Fairfax's purchase of 60.72% of IDBI Bank won Cabinet approval (Oct 2026). If RBI keeps approving such stakes, mid-size private banks and NBFCs get cheaper capital and funding and a floor under their valuations, and large banks face better-funded competitors. If RBI tightens ownership or voting rules instead, the re-rating reverses.",
    effect: "tailwind",
    impacts: [
      S("midsize_private", 3, "Strategic capital, cheaper funding and takeover interest"),
      S("vehicle_finance", 2, "Shriram's MUFG stake shows the route for large NBFCs"),
      S("diversified_nbfc", 2, "Group and foreign capital for NBFCs rebuilding after clean-ups"),
      S("large_banks", 1, "Better-funded rivals compete for deposits and corporate loans", "headwind"),
    ],
    stocks: [
      { key: "idbiBank", severity: 3, why: "Sale to Fairfax needs RBI approval and an open offer" },
      { key: "rblBank", severity: 2, why: "Emirates NBD's 60% stake and capital completed Jun 2026" },
    ],
  },
];

export const BANKS_DOCS: ResearchLink[] = [
  { title: "Financial Stability Report, June 2026 - banks' and NBFCs' soundness and stress tests", source: "Reserve Bank of India", url: "https://rbi.org.in/scripts/PublicationReportDetails.aspx?ID=1325" },
  { title: "Sectoral Deployment of Bank Credit - September 2026", source: "Reserve Bank of India (30 Oct 2026)", url: "https://rbi.org.in/SCRIPTs/BS_PressReleaseDisplay.aspx?prid=63891" },
  { title: "Minutes of the Monetary Policy Committee meeting, 5-7 October 2026", source: "Reserve Bank of India (21 Oct 2026)", url: "https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63839" },
  { title: "Emirates NBD and RBL Bank complete the strategic investment", source: "UAE Government Media Office (18 Jun 2026)", url: "https://www.mediaoffice.ae/en/news/2026/june/18-06/emirates-nbd-and-rbl-bank-announce-the-successful-completion-of-the-landmark-strategic-investment" },
];
