import type { SectorReport } from "./types";

export const hotels: SectorReport = {
  slug: "hotels",
  title: "India Hotels & Travel",
  subtitle: "Hotel rooms, holidays, flights, airports and the networks that sell trips - a market where demand runs ahead of new rooms",
  asOf: "Nov 2026",

  stance: {
    label: "Positive on hotels, cautious on air",
    tone: "pos",
    line: "Domestic demand keeps premium hotels fuller and pricier while new rooms arrive slowly; tight air capacity, weak foreign arrivals and the record signing pipeline are the things to watch.",
  },
  keyStats: [
    { label: "India hotel RevPAR, CY2025", value: "₹5,400-5,600", sub: "occupancy 63-65%, ADR ₹8,500-8,700 (HVS Anarock)" },
    { label: "Premium hotel occupancy, H1 FY27", value: "67-69%", sub: "vs 65-67% in H1 FY26; FY27E 72-74% (ICRA)" },
    { label: "Domestic air passengers, CY2025", value: "16.69 crore", sub: "+3.5%; Jan-Sep 2026 -0.8% (DGCA)" },
    { label: "Foreign tourist arrivals, 2025", value: "~9.0 million", sub: "-9.4% vs 2024 (Ministry of Tourism via CAPA)" },
  ],
  thesis: [
    {
      title: "Demand is ahead of supply",
      body: "Only about 14,199 branded rooms opened in CY2025 against 64,118 keys signed (HVS Anarock), and ICRA expects premium occupancy of 72-74% in FY27. Hotels are raising rates rather than chasing occupancy.",
    },
    {
      title: "Brands go asset-light, owners carry the capital",
      body: "IHCL, ITC Hotels and Lemon Tree grow mostly by managing hotels others own, so fees compound with little capital. The building risk and the rate upside sit with listed owners - Chalet, Ventive, SAMHI, Juniper, Brigade Hotels and soon Fleur.",
    },
    {
      title: "Getting there is the swing factor",
      body: "Air traffic slipped in 2026 as SpiceJet shrank and airlines ran short of aircraft, and foreign arrivals are still below 2019. Domestic leisure, weddings and pilgrimages carry the cycle; flights and inbound tourists decide how far it runs.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "IHCL and ITC Hotels post strong Q2 FY27",
      body: "IHCL's revenue rose 21% to ₹2,566 Cr with domestic same-store RevPAR up 25%, and it raised FY27 revenue guidance to 15-17% (26 Oct). ITC Hotels' revenue rose ~26% with RevPAR up 21%.",
      impact: "pos",
      tag: "Results",
    },
    {
      date: "Oct 2026",
      title: "Domestic air traffic turns negative for the year",
      body: "DGCA data show 12.24 crore domestic passengers in Jan-Sep 2026, 0.8% fewer than a year earlier; September traffic was 118 lakh. IndiGo held 65.4% of the market and the Air India group 26.8%.",
      impact: "neg",
      tag: "Aviation",
    },
    {
      date: "Sep 2026",
      title: "ICRA: domestic demand anchors hotel growth",
      body: "ICRA estimates premium occupancy of 67-69% and ARR of ₹8,000-8,200 in H1 FY27, expects 72-74% occupancy for FY27, and sees industry revenue growing 7-9% after 11% in FY26.",
      impact: "pos",
      tag: "Outlook",
    },
    {
      date: "Feb 2026",
      title: "Foreign tourist arrivals fall 9.4% in 2025",
      body: "India received about 9 million foreign tourists in 2025, down from 9.7 million in 2024 (Ministry of Tourism via CAPA), as conflict, flight disruptions and visa issues weighed on inbound travel.",
      impact: "neg",
      tag: "Tourism",
    },
    {
      date: "Jan 2026",
      title: "Lemon Tree splits off its owned hotels",
      body: "Lemon Tree's board approved a scheme on 9 Jan to move owned hotels into Fleur Hotels, with Warburg Pincus investing up to ₹960 Cr; CCI approved it in Apr and the NCLT application followed in Oct. Fleur's listing is targeted for 2027.",
      impact: "neutral",
      tag: "Restructuring",
    },
    {
      date: "Sep 2025",
      title: "GST on mid-priced rooms cut to 5%",
      body: "From 22 Sep 2025, rooms up to ₹7,500 a night carry 5% GST without input tax credit (Notification 15/2025-Central Tax (Rate)); rooms above stay at 18% with credit - a boost for midscale and budget hotels.",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "HVS Anarock puts CY2025 India hotel occupancy at 63-65%, room rates (ADR) at ₹8,500-8,700 and RevPAR at ₹5,400-5,600. Premium hotels did better: ICRA sees 67-69% occupancy in H1 FY27 and 72-74% for the full year, with rates rising.",
      "The chain runs from hotel brands and owners through holidays and theme parks, to the airlines and airports that bring guests, and the wholesalers, online agents and visa desks that sell and process trips. Domestic travellers drive most of it; foreign arrivals (~9 million in 2025) are a small, volatile slice.",
      "Air capacity is the weak link: domestic passengers grew 3.5% in 2025 but fell 0.8% in Jan-Sep 2026 as SpiceJet shrank and airlines waited for aircraft and engines. New airports at Navi Mumbai and Noida add slots for when fleets catch up.",
    ],
    chart: {
      title: "Domestic air passengers, calendar years",
      unit: "crore",
      source: "DGCA via PTI / Business Standard (2022-2025)",
      points: [
        { label: "2022", value: 12.32 },
        { label: "2023", value: 15.2 },
        { label: "2024", value: 16.13 },
        { label: "2025", value: 16.69 },
      ],
    },
    snapshot: [
      { label: "Branded rooms opened vs keys signed, CY2025 (HVS Anarock)", value: "~14,200 vs 64,118", tone: "pos" },
      { label: "Premium occupancy, FY27E (ICRA)", value: "72-74%", tone: "pos" },
      { label: "Hotel industry revenue growth, FY27E (ICRA)", value: "7-9%", tone: "pos" },
      { label: "GST on rooms up to ₹7,500 a night", value: "5% since 22 Sep 2025", tone: "pos" },
      { label: "Domestic air passengers, Jan-Sep 2026 (DGCA)", value: "-0.8% YoY", tone: "neg" },
      { label: "Foreign tourist arrivals, 2025", value: "-9.4% YoY", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Getting there", zoneIds: ["airlines", "airports", "airport_services"], margin: "Thin, volatile (airlines); regulated returns (airports)", moat: "medium", note: "An airline duopoly sets capacity; airports earn on every passenger, with tariffs set by AERA." },
    { stage: "Selling the trip", zoneIds: ["distribution", "visa_forex"], margin: "Take rate on bookings; fee per visa", moat: "medium", note: "Asset-light networks earn a cut of every booking or application; hotels push to sell direct." },
    { stage: "Hotel brands", zoneIds: ["luxury_chains", "midscale_chains", "franchise_stays"], margin: "30%+ EBITDA at leaders", moat: "high", note: "Brand, locations and loyalty are hard to copy; fees on managed hotels need little capital." },
    { stage: "Hotel owners", zoneIds: ["asset_owners"], margin: "High EBITDA per key; capital-heavy", moat: "medium", note: "Own the buildings and the rate upside; returns hinge on entry price and leverage." },
    { stage: "Holidays & leisure", zoneIds: ["holidays", "parks"], margin: "Low (tour operating) to high (mature parks)", moat: "low", note: "Prepaid holidays fund working capital; parks are fixed-cost and weather-dependent." },
  ],

  drivers: [
    { title: "Rooms in short supply", metric: "64,118 keys signed vs ~14,200 opened", body: "Branded supply opens years after signing, so demand growth shows up as higher room rates (HVS Anarock, CY2025)." },
    { title: "Domestic leisure and weddings", metric: "Premium occupancy 72-74% FY27E", body: "Weddings, MICE, pilgrimages and short leisure trips fill hotels even when foreign arrivals dip (ICRA)." },
    { title: "Air connectivity", metric: "16.69 crore flyers in 2025", body: "New airports and aircraft deliveries decide how many travellers reach each hotel market; 2026 has been flat (DGCA)." },
    { title: "Tax and policy", metric: "5% GST up to ₹7,500/night", body: "Lower GST on mid-priced rooms, rail tourism circuits and the cruise push widen the paying base." },
  ],
  mix: {
    title: "Who flies India's domestic travellers: market share, Sep 2026",
    source: "DGCA monthly domestic traffic (Sep 2026), via Business Today and PTI",
    slices: [
      { label: "IndiGo", value: 65.4 },
      { label: "Air India group", value: 26.8 },
      { label: "Akasa, SpiceJet & others", value: 7.8 },
    ],
  },

  pestle: {
    political: [
      { point: "Tourism push: rail circuits (Bharat Gaurav), cruise terminals, new airports and spiritual-tourism projects.", impact: "pos" },
      { point: "Conflict and security events (Pahalgam, West Asia) cut arrivals and close routes at short notice.", impact: "neg" },
    ],
    economic: [
      { point: "Rising incomes and domestic leisure spending keep premium hotels full; ICRA sees 7-9% industry revenue growth in FY27.", impact: "pos" },
      { point: "Jet fuel prices and a weaker rupee raise airfares and outbound package costs.", impact: "neg" },
    ],
    social: [
      { point: "Weddings, pilgrimages and short 'staycations' are now the core of hotel demand.", impact: "pos" },
      { point: "Foreign tourist arrivals (~9 million in 2025) remain below pre-Covid levels.", impact: "neg" },
    ],
    technological: [
      { point: "Revenue-management and distribution software lets hotels price dynamically across channels.", impact: "pos" },
      { point: "Google and global online agents control much of the search demand, keeping commissions high.", impact: "neutral" },
    ],
    legal: [
      { point: "GST on rooms up to ₹7,500 a night cut to 5% (no input credit) from 22 Sep 2025.", impact: "pos" },
      { point: "Airline duty-time rules, AERA tariff orders and NCLT cases (SpiceJet) shape aviation capacity and costs.", impact: "neutral" },
    ],
    environmental: [
      { point: "Heatwaves, floods and monsoon disruptions shift leisure travel seasons.", impact: "neg" },
      { point: "Water, energy and waste norms raise hotel operating costs; green certification is becoming a sales point.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "indhotel", tier: "core", why: "Largest chain; fee-led pipeline of 280 hotels and RevPAR leadership across luxury to economy." },
    { key: "itchotels", tier: "core", why: "Owned flagship luxury hotels plus asset-light managed brands, growing since its 2025 demerger." },
    { key: "eihotel", tier: "core", why: "Highest room rates in Indian listed hospitality; owned hotels capture rate rises." },
    { key: "chalet", tier: "direct", why: "Owner of upscale hotels in supply-short city markets, plus office income." },
    { key: "lemontree", tier: "direct", why: "Largest listed midscale chain; Fleur split leaves a fee-led brand business." },
    { key: "juniper", tier: "direct", why: "India's largest owner of Hyatt hotels in Mumbai and Delhi." },
    { key: "tbotek", tier: "indirect", why: "B2B wholesaler that earns on hotel bookings worldwide, including Indian outbound." },
    { key: "gmrairport", tier: "indirect", why: "Delhi and Hyderabad airports earn on every traveller, whichever airline flies them." },
    { key: "indigo", tier: "indirect", why: "Carries about two in three domestic flyers; its capacity sets hotel arrivals." },
    { key: "mhril", tier: "indirect", why: "Prepaid holiday memberships tied to domestic drive-to leisure." },
  ],

  companyNews: [
    { key: "indhotel", date: "Oct 2026", development: "Q2 FY27 revenue rose 21% to ₹2,566 Cr and profit 23% to ₹349 Cr; domestic same-store RevPAR up 25%; FY27 guidance raised to 15-17%.", impact: "Sets the pace for the sector and confirms rate-led growth at premium hotels.", tone: "pos" },
    { key: "itchotels", date: "Oct 2026", development: "Q2 FY27 revenue rose ~26% to about ₹1,054 Cr and net profit ~52% to about ₹203 Cr, with RevPAR up 21%.", impact: "Luxury owner-operators are converting rate gains into profit.", tone: "pos" },
    { key: "thomascook", date: "Nov 2026", development: "Q2 FY27 pre-exceptional profit before tax roughly flat at about ₹85 Cr while total income fell ~5%.", impact: "Outbound travel is softer than domestic hotels; forex held up.", tone: "neutral" },
    { key: "lemontree", date: "Jan 2026", development: "Board approved moving owned hotels into Fleur Hotels with Warburg Pincus investing up to ₹960 Cr; NCLT application filed Oct 2026.", impact: "Another chain separating brand fees from hotel ownership.", tone: "neutral" },
    { key: "bls", date: "Dec 2025", development: "Delhi High Court quashed the MEA's two-year tender debarment (18 Dec 2025).", impact: "Removes an overhang on India-mission contracts, though MEA may reissue a notice.", tone: "pos" },
    { key: "tbotek", date: "Oct 2025", development: "Completed the acquisition of US luxury wholesaler Classic Vacations (up to US$125m) on 2 Oct.", impact: "Indian travel platforms are buying overseas demand, not just selling to Indians.", tone: "neutral" },
  ],

  risks: [
    { risk: "The record signing pipeline opens together and caps room rates", mitigant: "Openings lag signings by years; leaders shift to fee income", severity: "medium" },
    { risk: "Air capacity stays short (groundings, SpiceJet distress, crew rules)", mitigant: "Aircraft deliveries resume; new airports add slots; drive-to tourism grows", severity: "medium" },
    { risk: "Conflict or terror events hit arrivals and routes", mitigant: "Domestic leisure and weddings dominate demand", severity: "high" },
    { risk: "Leverage at owners and new listings' promoter stake sales", mitigant: "IPO proceeds repaid debt at most owners; strong cash flows from mature hotels", severity: "low" },
  ],
  outlook: {
    bull: "Supply keeps lagging, premium occupancy holds in the mid-70s and rates rise high single digits; airlines restore capacity and foreign arrivals recover, lifting every link of the chain.",
    base: "Industry revenue grows 7-9% in FY27 (ICRA) on rate-led RevPAR gains; air traffic recovers slowly and fee-led brands outgrow owners.",
    bear: "A rush of openings in 2027-28 meets flat air traffic and a geopolitical shock; rates stall, owners' leverage bites and valuations de-rate.",
  },
  reading: [
    { title: "Domestic hotel demand anchors growth amid global travel (hotels quarterly update)", source: "ICRA", url: "https://www.icra.in/Research/ViewResearchReport/7133", year: "2026" },
    { title: "India hospitality industry overview 2025", source: "HVS Anarock via Hospitality Net", url: "https://www.hospitalitynet.org/news/4132315/hvs-anarock-india-hospitality-industry-overview-2025", year: "2026" },
    { title: "IHCL Q2 FY2027 results press release", source: "IHCL", url: "https://www.journaldespalaces.com/en/pressrelease-79864-india-ihcl-announces-financial-results-for-q2-fy2027-18th-consecutive-record-quarter-best-ever-q2-upgrades-fy2027-revenue-guidance-by-300-basis-points.html", year: "2026" },
    { title: "India records ~9m foreign tourist arrivals in 2025", source: "CAPA", url: "https://centreforaviation.com/news/india-records-9m-foreign-tourist-arrivals-in-2025-down-9-1348185", year: "2026" },
    { title: "Domestic air traffic drops 6.5% in September; year-to-date numbers turn negative", source: "Business Today (DGCA data)", url: "https://www.businesstoday.in/latest/corporate/story/domestic-air-traffic-drops-6-5-in-september-year-to-date-passenger-numbers-turn-negative-564093-2026-10-27", year: "2026" },
  ],
};
