import type { SectorReport } from "./types";

export const greenh2: SectorReport = {
  slug: "greenh2",
  title: "India Green Hydrogen Mission",
  subtitle: "Record-low auction prices, export deals - and plants still to be built",
  asOf: "Nov 2026",

  stance: {
    label: "Neutral, early and export-led",
    tone: "neutral",
    line: "Awards, auction prices and export contracts are ahead of plan; commissioning, incentive payouts and domestic demand are far behind. 2027-2028 decides whether awards turn into tonnes.",
  },
  keyStats: [
    { label: "Mission outlay", value: "₹19,744 Cr", sub: "to FY30; ₹17,490 Cr for SIGHT (Cabinet, Jan 2023)" },
    { label: "SIGHT awards", value: "7.56 lakh t + 3 GW", sub: "production a year (first awarded 8.62 lakh t) + electrolyser factories (MNRE, Aug 2026)" },
    { label: "Lowest green ammonia", value: "₹49.75/kg", sub: "SECI auction, 10-year fixed price (2025)" },
    { label: "Spent so far", value: "₹292 Cr", sub: "to 6 Aug 2026 - ~1.5% of the outlay (MNRE)" },
  ],
  thesis: [
    {
      title: "Price discovery has been the big surprise",
      body: "Green ammonia came in at ₹49.75-64.74/kg across 13 SECI auctions, and refinery green hydrogen fell from ₹397/kg (IOCL, May 2025) to ₹279/kg (Numaligarh, Feb 2026) - far faster than most forecasts.",
    },
    {
      title: "Exports, not India, carry the volume",
      body: "Signed offtake reached ~5.56 lakh tonnes a year by Oct 2026, over 70% for export: Reliance-Samsung C&T, ACME-IHI, AM Green-Uniper/JERA/H2Global. Domestic demand rests on voluntary PSU tenders without a mandate.",
    },
    {
      title: "Listed exposure is mostly inside conglomerates",
      body: "L&T, Reliance, Adani Enterprises, NTPC Green, JSW Energy and Waaree hold awards, but hydrogen is tiny in each. The biggest pure plays (AM Green, ACME Cleantech) are unlisted; Advait is the small listed electrolyser bet.",
    },
  ],

  developments: [
    {
      date: "29 Oct 2026",
      title: "Offtake commitments pass 5.5 lakh tonnes",
      body: "MNRE put signed green hydrogen offtake at 5,55,610 tonnes a year (about 11% of the 2030 goal), with 18 new agreements in 2026 and over 70% of volume for export. Expected investment: over ₹90,000 Cr.",
      impact: "pos",
      tag: "Demand",
    },
    {
      date: "30 Sep 2026",
      title: "AM Green wins Germany's H2Global Asian lot",
      body: "H2Global's trading arm Hintco will buy at least €585m of renewable ammonia over 10 years from Kakinada's second phase, with first deliveries expected in 2029.",
      impact: "pos",
      tag: "Exports",
    },
    {
      date: "Aug 2026",
      title: "Parliament told: ₹292 Cr spent, no plant fully running",
      body: "MNRE said ₹292 Cr had been spent to 6 Aug 2026, awards stood at 3,000 MW of electrolyser factories and ~7.56 lakh tonnes of production, and no SIGHT-backed facility was fully commissioned as of Jul 2026.",
      impact: "neg",
      tag: "Execution",
    },
    {
      date: "Jul 2026",
      title: "ACME-IHI ammonia deal wins Japan's CfD support",
      body: "Japan certified ACME Cleantech's green ammonia supply from Gopalpur, Odisha to IHI (about 4 lakh tonnes a year, under a pact first signed in Jan 2024) for contract-for-difference support, making it a priced, subsidy-backed export contract.",
      impact: "pos",
      tag: "Exports",
    },
    {
      date: "Mar 2026",
      title: "Reliance-Samsung C&T deal; new steel-pilot call",
      body: "Reliance signed a binding 15-year, US$3bn+ green ammonia supply deal with Samsung C&T from Jamnagar (16 Mar). MECON invited bids for a new round of green-steel pilots, after the first three (SAIL, Matrix Gas, Simplex Castings) were approved in Oct 2024 with ₹347 Cr.",
      impact: "pos",
      tag: "Offtake",
    },
    {
      date: "Feb 2026",
      title: "Numaligarh sets a ₹279/kg record",
      body: "BPCL-Sembcorp JV NeuEN Green Energy won Numaligarh Refinery's 10,000-tonne-a-year green hydrogen tender at ₹279/kg, against ₹397/kg (incl. GST) at IOCL Panipat nine months earlier. Nine bidders took part.",
      impact: "pos",
      tag: "Tenders",
    },
  ],

  overview: {
    headline: "Running output (~8,000 t a year) is ~1% of the 7.56 lakh t awarded under SIGHT and 0.16% of the 5 million t 2030 target",
    narrative: [
      "The National Green Hydrogen Mission was approved on 4 Jan 2023 with ₹19,744 Cr to FY30: ₹17,490 Cr for SIGHT incentives, ₹1,466 Cr for pilots, ₹400 Cr for R&D. Its goal is 5 million tonnes a year of green hydrogen by 2030, ~125 GW of linked renewables and over ₹8 lakh Cr of investment.",
      "SIGHT pays two ways: a falling per-kW incentive for electrolyser factories (Component I) and a bid per-kg incentive for the first three years of green hydrogen output (Component II). SECI also runs fixed-price green ammonia auctions for fertiliser plants (Mode 2A) and green hydrogen for refineries (Mode 2B).",
      "Awards and prices are well ahead; delivery is not. Only ~8,000 tonnes a year was running by Feb 2026, three ports were named hydrogen hubs in Oct 2025 (no cash support), and the FY27 budget kept the mission at ₹600 Cr.",
    ],
    chart: {
      kind: "categories",
      title: "Green hydrogen: running vs contracted vs target",
      unit: "'000 tonnes a year",
      source: "MNRE / PIB (Feb, Aug and Oct 2026); 2030 is the mission target",
      points: [
        { label: "Running (Feb 26)", value: 8 },
        { label: "Offtake (Oct 26)", value: 556 },
        { label: "SIGHT awards (Aug 26)", value: 756 },
        { label: "Target 2030", value: 5000, projected: true },
      ],
    },
    snapshot: [
      { label: "Electrolyser factory awards", value: "3,000 MW a year, 15 companies", tone: "pos" },
      { label: "Green ammonia auctioned (2025)", value: "7.24 lakh t a year, 13 plants", tone: "pos" },
      { label: "Refinery green hydrogen awarded", value: "30,000 t a year (4 refineries)", tone: "neutral" },
      { label: "Running capacity (Feb 2026)", value: "~8,000 t a year (0.16% of target)", tone: "neg" },
      { label: "Budget FY27", value: "₹600 Cr (unchanged)", tone: "neutral" },
      { label: "Consumption mandate", value: "None notified", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Renewable power", zoneIds: ["power"], margin: "Utility-like returns; higher tariffs for round-the-clock supply", moat: "medium", note: "50-70% of green hydrogen's cost (World Bank). Often captive within the same group." },
    { stage: "Electrolysers & plant", zoneIds: ["electrolysers", "bop"], margin: "Not yet reported - factories ramping", moat: "medium", note: "Licensed technology, falling per-kW incentive, Chinese price pressure. BoP is steadier and already a business for Indian engineering firms." },
    { stage: "Hydrogen & ammonia production", zoneIds: ["producers"], margin: "Contracted; thin at record-low bids", moat: "medium", note: "Largest capex pool. Returns depend on electrolyser utilisation and firm power cost; incentive paid per kg for three years." },
    { stage: "Storage, pipelines & ports", zoneIds: ["transport"], margin: "Fee-based, long-term", moat: "high", note: "Ports and terminals at Kandla, Tuticorin, Paradip, Kakinada and Mundra handle export ammonia from 2027-2029." },
    { stage: "Offtake", zoneIds: ["ammonia", "refineries", "steel"], margin: "Buyers pay a premium for a small share of supply", moat: "low", note: "Fertiliser, refinery and steel buyers gain price certainty and lower emissions, not profit." },
  ],

  drivers: [
    { title: "Fixed-price domestic contracts", metric: "₹49.75-64.74/kg ammonia", body: "SECI's 10-year green ammonia contracts and 25-year refinery deals give producers bankable revenue." },
    { title: "Subsidy-backed export buyers", metric: ">70% of offtake for export", body: "Japan's CfD scheme, Germany's H2Global and Korean buyers pay for low-carbon ammonia that India can make cheaply." },
    { title: "Cheap renewables", metric: "~125 GW needed by 2030", body: "India's low solar and wind costs, plus transmission-charge waivers, are the core cost advantage." },
    { title: "Carbon rules", metric: "CCTS from FY26; EU CBAM", body: "India's compliance carbon market and the EU's carbon border charge push refiners, fertiliser makers and steelmakers to cut emissions." },
  ],
  mix: {
    title: "Mission outlay by component",
    source: "Union Cabinet / MNRE (₹19,744 Cr, Jan 2023)",
    slices: [
      { label: "SIGHT incentives (₹17,490 Cr)", value: 88.6 },
      { label: "Pilot projects (₹1,466 Cr)", value: 7.4 },
      { label: "R&D (₹400 Cr)", value: 2 },
      { label: "Other (₹388 Cr)", value: 2 },
    ],
  },

  pestle: {
    political: [
      { point: "Strong central backing, state land and power concessions, and three ports named hydrogen hubs (Oct 2025).", impact: "pos" },
      { point: "No consumption obligation; domestic demand depends on voluntary PSU tenders.", impact: "neg" },
    ],
    economic: [
      { point: "Auction prices fell fast (₹397 to ₹279/kg for refinery hydrogen in nine months).", impact: "pos" },
      { point: "Green hydrogen still costs well above grey; record-low bids leave little room for overruns.", impact: "neg" },
    ],
    social: [
      { point: "Mission projects over 6 lakh jobs by 2030, many in coastal hubs in Gujarat, Andhra Pradesh, Odisha and Tamil Nadu.", impact: "pos" },
      { point: "Large land and water needs can meet local resistance.", impact: "neutral" },
    ],
    technological: [
      { point: "First Indian electrolyser factories and the first commercial plant for steel (JSW, Nov 2025).", impact: "pos" },
      { point: "Most stack technology is licensed; L&T's licensor McPhy was liquidated in Jul 2025.", impact: "neg" },
    ],
    legal: [
      { point: "Green Hydrogen Standard (≤2 kg CO2 per kg of hydrogen) and a certification scheme define what qualifies.", impact: "neutral" },
      { point: "No disclosed penalties for missed commissioning dates under SIGHT.", impact: "neg" },
    ],
    environmental: [
      { point: "Displacing grey hydrogen and imported ammonia cuts emissions in refining, fertiliser and steel.", impact: "pos" },
      { point: "Ammonia is toxic; storage and port safety need strict rules.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "lt", tier: "core", why: "Electrolyser factory plus a production award and the IOCL Panipat contract - the broadest listed footprint." },
    { key: "reliance", tier: "core", why: "Production awards in both tranches, a 300 MW electrolyser award and the US$3bn Samsung C&T export deal." },
    { key: "advait", tier: "core", why: "300 MW of electrolyser awards on a small base - the purest listed electrolyser bet, and the riskiest." },
    { key: "adaniEnt", tier: "direct", why: "Adani New Industries: electrolyser awards in both tranches and a Mundra hub, with group power and port." },
    { key: "ntpcGreen", tier: "direct", why: "70,000 t a year green ammonia contract and the Pudimadaka hub, on top of a large renewables pipeline." },
    { key: "jswEnergy", tier: "direct", why: "Runs India's largest operating green hydrogen plant for JSW Steel." },
    { key: "waaree", tier: "direct", why: "Largest Tranche II electrolyser award plus 90,000 t a year of production." },
    { key: "thermax", tier: "indirect", why: "Complete alkaline electrolyser systems (HydrogenPro licence) and balance of plant." },
    { key: "paradeep", tier: "indirect", why: "First green ammonia buyer: fixed rupee price replaces volatile imports." },
    { key: "inoxIndia", tier: "indirect", why: "Cryogenic and liquid hydrogen tanks from a plant next to the Kandla hub." },
  ],

  companyNews: [
    { key: "reliance", date: "Mar 2026", development: "Signed a binding 15-year green ammonia supply and purchase agreement with Samsung C&T, valued at over US$3bn, with supply from the second half of FY29.", impact: "One of the largest binding green ammonia deals globally; a template for bankable export contracts.", tone: "pos" },
    { key: "ntpcGreen", date: "Mar 2026", development: "NTPC Renewable Energy signed the purchase agreement for its 70,000-tonne-a-year SECI green ammonia award (₹51.80/kg).", impact: "Turns a 2025 auction result into a signed domestic contract.", tone: "pos" },
    { key: "bpcl", date: "Feb 2026", development: "Its JV with Sembcorp, NeuEN Green Energy, won Numaligarh Refinery's 10,000-tonne-a-year green hydrogen tender at ₹279/kg.", impact: "Record-low refinery price resets expectations for every later tender.", tone: "pos" },
    { key: "jswEnergy", date: "Nov 2025", development: "Commissioned a 3,800-tonne-a-year green hydrogen plant at JSW Steel's Vijayanagar works under a 7-year offtake.", impact: "First commercial-scale green hydrogen in Indian steelmaking.", tone: "pos" },
    { key: "adaniEnt", date: "Jun 2025", development: "Adani New Industries commissioned India's first off-grid 5 MW green hydrogen pilot in Kutch, run on solar and batteries.", impact: "Proof of concept for the planned Mundra hub; no hub start date yet.", tone: "neutral" },
    { key: "lt", date: "May 2025", development: "L&T Energy GreenTech won IOCL's 10,000-tonne-a-year Panipat green hydrogen tender at ₹397/kg (incl. GST), 25-year build-own-operate.", impact: "India's first refinery green hydrogen contract after two cancelled rounds.", tone: "pos" },
  ],

  risks: [
    { risk: "Awards don't turn into plants (no SIGHT plant fully running as of Jul 2026)", mitigant: "Incentives are paid only on output; binding export contracts now back the largest projects", severity: "high" },
    { risk: "Green hydrogen stays far costlier than grey, with no mandate to buy it", mitigant: "Falling auction prices; carbon market from FY26; EU CBAM", severity: "high" },
    { risk: "Chinese electrolysers undercut Indian factories", mitigant: "Manufacturing incentive and likely local-content preference in PSU tenders", severity: "medium" },
    { risk: "Licensed technology fails or licensors exit (McPhy, 2025)", mitigant: "Several technology routes (alkaline, PEM) and partners; buyers like John Cockerill take over IP", severity: "medium" },
  ],
  outlook: {
    bull: "Tranche I factories and the first export ammonia plants start in 2027, more binding Japanese and European contracts follow, and a refinery/fertiliser purchase obligation creates domestic scale.",
    base: "A handful of large projects (Kakinada, Jamnagar, Gopalpur, Panipat) start between 2027 and 2029; most awards slip, India reaches well short of 5 million tonnes by 2030, and listed exposure stays a small part of conglomerates.",
    bear: "Costs stay high, export buyers delay, and awards lapse - leaving idle electrolyser lines, unpaid incentives and a mission rebased to a far lower target.",
  },
  reading: [
    { title: "National Green Hydrogen Mission: overview and documents", source: "MNRE", url: "https://mnre.gov.in/en/national-green-hydrogen-mission/" },
    { title: "Cabinet approves the National Green Hydrogen Mission", source: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1888547", year: "2023" },
    { title: "SECI completes renewable ammonia auction round", source: "Ammonia Energy Association", url: "https://ammoniaenergy.org/articles/seci-completes-renewable-ammonia-auction-round/", year: "2025" },
    { title: "SECI awards 450,000 tonnes under SIGHT Tranche II", source: "JMK Research", url: "https://jmkresearch.com/seci-awards-450000-mt-annual-capacity-under-sight-tranche-ii-for-green-hydrogen-production/", year: "2025" },
    { title: "National Green Hydrogen Mission: budget, targets and SIGHT", source: "ArthDrishti", url: "https://arthdrishti.com/analysis/2026-10-18-national-green-hydrogen-mission-progress/", year: "2026" },
  ],
};
