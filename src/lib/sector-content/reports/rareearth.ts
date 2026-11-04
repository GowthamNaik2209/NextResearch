import type { SectorReport } from "./types";

export const rareearth: SectorReport = {
  slug: "rareearth",
  title: "India Critical Minerals & Rare Earths",
  subtitle: "The ₹16,300 Cr Critical Mineral Mission and the ₹7,280 Cr magnet scheme: auctions, lithium, copper, recycling and magnets",
  asOf: "Nov 2026",

  stance: {
    label: "Early: base metals pay now, the rest is optionality",
    tone: "neutral",
    line: "Real policy money and a strategic push, but most critical-mineral exposure is long-dated or unlisted; copper earns today, while auction wins, overseas lithium, recycling and magnets are options that pay later.",
  },
  keyStats: [
    { label: "Critical Mineral Mission", value: "₹16,300 Cr", sub: "government outlay to FY31, plus ~₹18,000 Cr expected from PSUs (Cabinet, 29 Jan 2025)" },
    { label: "Blocks auctioned", value: "56 of 88", sub: "critical-mineral blocks offered, seven tranches to Jun 2026 (Ministry of Mines)" },
    { label: "Magnet scheme", value: "₹7,280 Cr", sub: "6,000 t/yr, 20 bids, no winners yet (MHI, Nov 2026)" },
    { label: "Recycling incentive", value: "₹1,500 Cr", sub: "FY26-FY31; targets 270 kt/yr of capacity (Cabinet, 3 Sep 2025)" },
  ],
  thesis: [
    {
      title: "Two policies, one chain",
      body: "The magnet scheme pays per kilo for a new factory industry; the Critical Mineral Mission funds everything upstream - exploration (1,200 GSI projects by FY31), block auctions, overseas assets through KABIL and PSUs, a national stockpile, and recycling. Together they target the same China risk.",
    },
    {
      title: "Base metals earn today; the rest is optionality",
      body: "Hindustan Copper, Hindalco, Vedanta and Adani's Kutch Copper earn from copper now, with prices at a record in Sep 2026. Auction wins (Vedanta, Hindustan Zinc, Coal India, Oil India), overseas lithium and magnet bids are years from revenue and small next to the core businesses.",
    },
    {
      title: "The bottleneck is processing, not ore",
      body: "India can find and buy minerals, but lacks refining: IREL's 500 tonnes of oxide for the magnet scheme supports only about 1,500 of its 6,000 tonnes, and there is no lithium refinery at scale. Recycling (Gravita, Attero, Lohum) is the quickest new source of refined supply.",
    },
  ],

  developments: [
    {
      date: "Sep 2026",
      title: "Eighth auction tranche bids in; copper at a record",
      body: "Technical bids for the eighth tranche of 20 critical-mineral blocks (lithium, rare earths, graphite, tungsten, vanadium; launched 15 Jul) were due on 21 Sep; results were not out by 3 Nov. LME copper set back-to-back records in early Sep, reaching about US$14,694 a tonne on 8 Sep. Midwest's Hyderabad sintered-magnet line was reported close to commercial output.",
      impact: "pos",
      tag: "Auctions",
    },
    {
      date: "Aug 2026",
      title: "20 magnet-scheme bids; Coal India eyes Chile lithium",
      body: "MHI opened 20 magnet-scheme bids on 13 Aug, including Coal India, L&T, 20 Microns, Proterial (India), NEO, Attero, Lohum, ReNew and a Midwest JV; no winner had been named by 3 Nov 2026. Reuters reported Coal India was weighing buying Wealth Minerals' Chilean lithium unit and setting up a Singapore minerals trading office.",
      impact: "pos",
      tag: "Scheme",
    },
    {
      date: "Jun 2026",
      title: "Seventh tranche takes auctions to 56 blocks",
      body: "Ten more blocks were auctioned (graphite, rare earths, vanadium, titanium, glauconite, phosphate), with Gujarat, Uttarakhand and Telangana joining for the first time - 56 of 88 offered since Nov 2023, plus 11 exploration-licence blocks.",
      impact: "pos",
      tag: "Auctions",
    },
    {
      date: "Apr 2026",
      title: "58 companies cleared for the recycling scheme",
      body: "The Ministry of Mines approved 58 companies under the ₹1,500 Cr critical-mineral recycling scheme - 20 on 30 Mar and 38 on 29 Apr 2026 - pledging about ₹5,000 Cr of investment and ~850,000 tonnes a year of capacity. Only plants that extract minerals, not black mass alone, qualify for payouts.",
      impact: "pos",
      tag: "Scheme",
    },
    {
      date: "Feb 2026",
      title: "Budget announces Rare Earth Corridors",
      body: "Union Budget 2026-27 proposed support for Odisha, Kerala, Andhra Pradesh and Tamil Nadu to set up rare-earth corridors linking mining, processing, research and manufacturing. In Jan, BARC handed GMDC a process for its Ambadungar deposit, and Gravita started a 6,000 t/yr lithium-ion recycling plant at Mundra.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Nov 2025",
      title: "Magnet scheme cleared as China pauses curbs",
      body: "The Cabinet approved the ₹7,280 Cr REPM scheme on 26 Nov 2025 (notified 15 Dec), two months after the ₹1,500 Cr recycling incentive (3 Sep). The same month China suspended its October 2025 export-control expansion for a year, to 10 Nov 2026; the April 2025 licensing stayed.",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    headline: "NCMM carries most of the policy money: ₹16,300 Cr of government outlay plus ~₹18,000 Cr of expected PSU spend, against ₹7,280 Cr for REPM magnets",
    narrative: [
      "Critical minerals - lithium, cobalt, nickel, graphite, copper, rare earths, tungsten and others - go into batteries, motors, grids, electronics and weapons. China refines most of them and makes about 94% of the world's sintered rare-earth magnets (IEA). Its 2025 export licences cut Indian e-scooter output within weeks, turning supply security into policy.",
      "India's answer is a stack. The National Critical Mineral Mission (Jan 2025) funds exploration, auctions of critical-mineral blocks (56 sold by June 2026), overseas assets through KABIL, Coal India and NMDC, a stockpile, and a ₹1,500 Cr recycling incentive. The ₹7,280 Cr REPM scheme pays five makers to build 6,000 tonnes a year of magnets from oxide.",
      "For investors, the listed routes are mostly big miners and metal makers for whom critical minerals are a small new line - the exceptions being copper, which earns today, and a few small caps whose story hinges on one bid or plant.",
    ],
    chart: {
      kind: "categories",
      title: "Policy money behind India's critical-minerals push",
      unit: "₹ Cr",
      source: "Cabinet approvals: NCMM 29 Jan 2025 (govt outlay + expected PSU spend), recycling 3 Sep 2025 (part of NCMM), REPM 26 Nov 2025; KABIL Argentina budget ~US$24m (reported)",
      points: [
        { label: "NCMM: PSU spend (expected)", value: 18000 },
        { label: "NCMM: govt outlay", value: 16300 },
        { label: "REPM magnet scheme", value: 7280 },
        { label: "Recycling (within NCMM)", value: 1500 },
        { label: "KABIL Argentina lithium", value: 200 },
      ],
    },
    snapshot: [
      { label: "Critical-mineral blocks auctioned (to Jun 2026)", value: "56 of 88", tone: "pos" },
      { label: "Reasi lithium auctions (2024)", value: "Annulled twice", tone: "neg" },
      { label: "IREL NdPr oxide for magnet winners", value: "500 t/yr", tone: "neg" },
      { label: "China share of sintered magnets (IEA)", value: "~94%", tone: "neg" },
      { label: "LME copper record (8 Sep 2026)", value: "~US$14,694/t", tone: "pos" },
      { label: "China curb pause runs to", value: "10 Nov 2026", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Exploration & auctions", zoneIds: ["auctions", "lithium", "hardrock", "beach_sand"], margin: "Back-loaded; royalties to the state", moat: "medium", note: "Blocks won today are years from output; monazite stays with IREL; overseas lithium (KABIL) is exploration-stage." },
    { stage: "Refining & smelting", zoneIds: ["separation", "copper"], margin: "Thin processing fees", moat: "high", note: "The real chokepoint: rare-earth separation is China-dominated and regulated; copper smelters are squeezed by scarce concentrate." },
    { stage: "Metal & alloy", zoneIds: ["metal_alloy"], margin: "Captive inside magnet makers", moat: "medium", note: "Almost no commercial Indian capacity; know-how sits with NFTDC, BARC and foreign partners." },
    { stage: "Magnets & recycling", zoneIds: ["magnet_making", "recycling", "battery_recycling"], margin: "Incentive-backed", moat: "medium", note: "REPM pays up to ₹2,150/kg; the recycling scheme pays capex and opex support for actual mineral extraction." },
    { stage: "Motors & end products", zoneIds: ["ev_motors", "ev_2w", "wind", "defence"], margin: "Minerals are a small cost share", moat: "low", note: "Users gain supply security, not mineral margins; some are designing magnets out (ferrite motors)." },
  ],

  drivers: [
    { title: "Supply risk from China", metric: "Pause to 10 Nov 2026", body: "April 2025 licensing is still in force and the tougher October 2025 controls are only suspended; every new curb strengthens the case for Indian and allied supply." },
    { title: "Electrification demand", metric: "Copper at a record", body: "EVs, grids, storage and data centres pull on copper, lithium, nickel and magnets; the government expects India's magnet use to double from 2025 to 2030." },
    { title: "A full policy stack", metric: "₹41,500 Cr+", body: "NCMM (₹16,300 Cr of government money, the ₹1,500 Cr recycling incentive among it, plus ~₹18,000 Cr expected from PSUs) and REPM (₹7,280 Cr) fund mining, processing, magnets and recycling together." },
    { title: "Auctions and overseas assets", metric: "56 blocks; 5 in Argentina", body: "Seven auction tranches have sold 56 blocks at home, and KABIL holds five lithium brine blocks in Catamarca, Argentina; Coal India is pursuing lithium in Chile." },
  ],
  mix: {
    title: "Critical Mineral Mission funding by source",
    source: "Union Cabinet, 29 Jan 2025 (NCMM) and 3 Sep 2025 (recycling scheme, part of NCMM)",
    slices: [
      { label: "PSU investment (₹18,000 Cr, expected)", value: 52.5 },
      { label: "Government outlay excl. recycling (₹14,800 Cr)", value: 43.1 },
      { label: "Recycling incentive (₹1,500 Cr)", value: 4.4 },
    ],
  },

  pestle: {
    political: [
      { point: "A strategic priority after China's 2025 curbs: a seven-year Critical Mineral Mission plus a magnet scheme with fixed per-kg incentives.", impact: "pos" },
      { point: "State bodies (IREL, KABIL, GSI/MECL) control feedstock, exploration and overseas deals, so progress depends on government decisions and host-country licences.", impact: "neutral" },
    ],
    economic: [
      { point: "Incentives (magnets per kg; recycling capex and opex) and record copper prices make early plants bankable despite China's cost lead.", impact: "pos" },
      { point: "China can cut magnet, oxide and lithium prices to undercut new entrants; the 2023-25 lithium crash shows how fast that happens.", impact: "neg" },
    ],
    social: [
      { point: "Local magnet plants and corridors add skilled jobs in coastal mineral states.", impact: "pos" },
      { point: "Beach-sand mining faces local opposition over coastal erosion and livelihoods.", impact: "neg" },
    ],
    technological: [
      { point: "Integrated oxide-to-magnet know-how is scarce in India; most bidders need foreign partners or NFTDC/BARC licences.", impact: "neg" },
      { point: "Ferrite and magnet-free motors (Ola, Sona Comstar) could cap NdFeB demand growth in small vehicles.", impact: "neutral" },
    ],
    legal: [
      { point: "Monazite contains thorium, so processing is regulated under atomic-energy rules; auctioned blocks still need forest and environmental clearances.", impact: "neg" },
      { point: "The Centre now auctions critical-mineral blocks itself, and incentives pay only for real localisation (magnets from Indian oxide; recycling that extracts minerals, not just black mass).", impact: "pos" },
    ],
    environmental: [
      { point: "Separation produces acidic and radioactive residues that need careful handling.", impact: "neg" },
      { point: "Magnets, copper and battery metals enable EVs and the grid, and recycling e-waste and spent batteries can supply part of future demand.", impact: "pos" },
    ],
  },

  beneficiaries: [
    { key: "hindcopper", tier: "core", why: "India's only integrated copper miner, earning the copper price today; plans to triple ore capacity to 12.2 million tonnes a year by FY30, and a KABIL partner." },
    { key: "microns20", tier: "core", why: "The only small-cap listed magnet-scheme bidder; a win (₹645-1,290 Cr of incentives) would be large against its size. Binary." },
    { key: "hindalco", tier: "direct", why: "India's largest custom copper smelter, adding 300,000 tonnes a year at Dahej by FY29, with e-waste recycling and battery foil alongside." },
    { key: "gmdc", tier: "direct", why: "Most direct listed route into Indian rare-earth feedstock (Ambadungar, BARC technology); still pre-revenue in rare earths." },
    { key: "coalIndia", tier: "direct", why: "Magnet bidder, graphite-vanadium block winner and chasing Chile lithium - the most active PSU, though immaterial to its coal earnings." },
    { key: "gravita", tier: "direct", why: "The listed entrant in battery recycling (6,000 t/yr Mundra plant, Jan 2026), still at pilot stage." },
    { key: "vedanta", tier: "indirect", why: "Base-metals parent after the demerger and an active block winner (Genjana nickel-chromium-PGE)." },
    { key: "hindzinc", tier: "indirect", why: "Won tungsten, rare-earth and potash blocks, and a letter of intent for Karnataka's Gundlupet rare-earth and yttrium block (Sep 2026) - early options next to zinc and silver." },
    { key: "lt", tier: "indirect", why: "Magnet-scheme bidder with captive EV-motor demand; magnets would be a tiny part of L&T." },
    { key: "sona", tier: "indirect", why: "Largest magnet importer among Indian motor makers; gains most from a local second source." },
  ],

  companyNews: [
    { key: "hindzinc", date: "Sep 2026", development: "Received a letter of intent from Karnataka for the 314-hectare Gundlupet rare-earth and yttrium block (disclosed 3 Sep).", impact: "Its second rare-earth block after Uttar Pradesh; still exploration-stage and years from revenue.", tone: "pos" },
    { key: "coalIndia", date: "Aug 2026", development: "Bid for the REPM scheme; Reuters reported it was weighing buying Wealth Minerals' Chilean lithium unit and setting up a Singapore minerals trading office.", impact: "PSU balance sheets are the Mission's main tool for buying assets abroad.", tone: "pos" },
    { key: "microns20", date: "Aug 2026", development: "Named among the 20 bidders for the magnet scheme; bid details not disclosed.", impact: "Shows small mineral processors see a niche, but no sintered-magnet record is public.", tone: "neutral" },
    { key: "hindcopper", date: "Apr 2026", development: "Set out a plan to lift ore capacity from about 4.2 to 12.2 million tonnes a year by FY30 with about ₹7,189 Cr of capex.", impact: "The only domestic copper-ore expansion of scale; execution decides how much import dependence it cuts.", tone: "pos" },
    { key: "gravita", date: "Jan 2026", development: "Commissioned a 6,000 t/yr lithium-ion battery recycling plant at Mundra; management later called it a pilot with no significant near-term revenue (May 2026).", impact: "The pilot makes black mass only; mineral extraction - what the ₹1,500 Cr scheme pays for - is planned for about FY29.", tone: "neutral" },
    { key: "hindalco", date: "Jan 2026", development: "Commissioned a battery-foil plant in Odisha and reaffirmed the 300,000 t/yr Dahej copper smelter expansion for FY29.", impact: "Links the copper and battery chains; adds domestic smelting capacity that needs imported concentrate.", tone: "pos" },
  ],

  risks: [
    { risk: "Auction wins and overseas assets take years to produce - or never do (Reasi lithium drew no successful bid twice)", mitigant: "NCMM exploration funding, exploration licences for deep minerals, and PSU balance sheets that can wait", severity: "high" },
    { risk: "Processing gap: IREL's 500 t of oxide covers only about 1,500 of 6,000 t of magnets, and there is no lithium refinery at scale", mitigant: "Recycling incentives, Rare Earth Corridors, new hard-rock sources (GMDC) and imports from allied suppliers", severity: "high" },
    { risk: "Chinese price cuts (rare earths, lithium) make new Indian capacity uneconomic", mitigant: "Five-year magnet incentives; buyers paying a premium for non-China supply; allied defence rules", severity: "medium" },
    { risk: "A copper price fall hits Hindustan Copper, while scarce concentrate keeps smelter fees thin", mitigant: "Long-run electrification demand; smelters' by-product credits and recycling feed", severity: "medium" },
  ],
  outlook: {
    bull: "Magnet winners are named early in 2027, China re-tightens exports, auctioned blocks and KABIL's Argentine brine prove up, and recyclers scale - while copper stays strong for Hindustan Copper and the smelters fill their new capacity.",
    base: "Awards and auction results keep coming, magnet plants come up through 2028, and the first sizeable output reaches buyers around 2028-29; listed miners see sentiment, not earnings, from critical minerals until then, and copper drives the base-metal names.",
    bear: "Awards slip, China eases curbs and cuts prices, lithium blocks fail to attract bids and copper falls; the policies end up funding small, high-cost capacity.",
  },
  reading: [
    { title: "Cabinet approves National Critical Mineral Mission", source: "PIB / PM India, 29 Jan 2025", url: "https://www.pmindia.gov.in/en/news_updates/cabinet-approves-national-critical-mineral-mission-to-build-a-resilient-value-chain-for-critical-mineral-resources-vital-to-green-technologies-with-an-outlay-of-rs-34300-crore-over-seven-years" },
    { title: "Cabinet approves ₹1,500 crore incentive scheme to promote critical mineral recycling", source: "PIB, 3 Sep 2025", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163454" },
    { title: "Cabinet approves Rs 7,280 crore scheme for sintered rare-earth permanent magnets", source: "PIB, 26 Nov 2025", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2194687" },
    { title: "MHI receives 20 bids for integrated sintered NdFeB magnet plants", source: "PIB, 13 Aug 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2299078" },
    { title: "India's REE strategy: turning resources into capacity", source: "Observer Research Foundation", url: "https://www.orfonline.org/research/india-s-ree-strategy-turning-resources-into-capacity" },
  ],
};
