import type { SectorReport } from "./types";

export const rareearth: SectorReport = {
  slug: "rareearth",
  title: "India Rare-Earth Magnets (REPM)",
  subtitle: "The ₹7,280 Cr bet on making sintered NdFeB magnets at home",
  asOf: "Oct 2026",

  stance: {
    label: "Early: buyers benefit first",
    tone: "neutral",
    line: "A strategic scheme with real money per kilo, but listed exposure is thin and winners are not named yet; magnet users gain supply security before any maker earns from it.",
  },
  keyStats: [
    { label: "Scheme outlay", value: "₹7,280 Cr", sub: "₹6,450 Cr sales incentive + ₹750 Cr capex subsidy + ₹80 Cr administration (Cabinet, 26 Nov 2025)" },
    { label: "Target capacity", value: "6,000 t/yr", sub: "5 winners, 600-1,200 t each" },
    { label: "Bids received", value: "20", sub: "technical bids opened 13 Aug 2026 (MHI)" },
    { label: "China share of sintered magnets", value: "~94%", sub: "of world output, 2024 (IEA)" },
  ],
  thesis: [
    {
      title: "A new industry, paid per kilo",
      body: "Winners earn their quoted incentive - at most ₹2,150 per kg of magnets sold, and at most 40% of sales - for five years after a two-year build: up to ₹1,290 Cr for a 1,200-tonne plant, plus a capital subsidy of up to ₹150 Cr. Only magnets made from NdPr oxide in India qualify.",
    },
    {
      title: "Listed exposure is thin and binary",
      body: "IREL, the recyclers and most specialist bidders are unlisted. Listed bidders are either giants for whom magnets are immaterial (L&T, Coal India) or a small-cap whose story depends on winning (20 Microns).",
    },
    {
      title: "Buyers win first; upstream is the real bottleneck",
      body: "EV, two-wheeler and defence makers gain a second source and less China risk. But IREL's 500 tonnes of oxide for the scheme supports only about 1,500 of the 6,000 tonnes of magnets, so feedstock - not magnet presses - decides how fast this scales.",
    },
  ],

  developments: [
    {
      date: "Sep 2026",
      title: "Midwest's sintered-magnet line nears output",
      body: "Midwest Advanced Materials' Hyderabad plant (500 tonnes a year first phase, NFTDC technology, Technology Development Board support) was reported to be close to commercial output, after missing a Dec 2025 target for first magnets; it would be India's first commercial sintered NdFeB output. It aims for 5,000 tonnes a year. Lohum's ECMS-approved magnet project (Mar 2026) is still being built.",
      impact: "pos",
      tag: "Capacity",
    },
    {
      date: "Aug 2026",
      title: "20 bids for the magnet scheme",
      body: "MHI received 20 bids, opened 13 Aug, including Coal India, L&T, 20 Microns, Proterial (India), NEO Performance Materials, Attero, Lohum, ReNew and a Midwest Energy-MAM joint venture. No shortlist or winner had been announced by 20 Oct 2026.",
      impact: "pos",
      tag: "Scheme",
    },
    {
      date: "Mar 2026",
      title: "Global tender issued",
      body: "MHI floated the RFP on 20 Mar 2026 with a two-stage least-cost bid on the CPP portal. The bid deadline then slipped from 28 May to 29 Jun, 29 Jul and finally 12 Aug to widen participation.",
      impact: "neutral",
      tag: "Scheme",
    },
    {
      date: "Feb 2026",
      title: "Budget announces Rare Earth Corridors",
      body: "Union Budget 2026-27 proposed support for Odisha, Kerala, Andhra Pradesh and Tamil Nadu to set up dedicated rare-earth corridors linking mining, processing, research and manufacturing.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Jan 2026",
      title: "BARC hands GMDC a rare-earth process",
      body: "BARC handed over an indigenous process technology for GMDC's Ambadungar deposit in Gujarat (19 Jan); GMDC then signed a non-binding MoU with NMDC (16 Mar 2026) to study an integrated rare-earth chain.",
      impact: "pos",
      tag: "Mining",
    },
    {
      date: "Nov 2025",
      title: "Cabinet clears the scheme as China pauses curbs",
      body: "The Cabinet approved the ₹7,280 Cr REPM scheme on 26 Nov 2025 (notified 15 Dec). The same month China suspended its October 2025 export-control expansion for a year, to 10 Nov 2026; the April 2025 licensing regime stayed.",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "Sintered NdFeB magnets are the strongest permanent magnets made. They sit in EV traction motors, e-scooter hub motors, wind generators, missiles and electronics. China makes about 94% of them and refines more than 90% of the rare earths they need (IEA).",
      "India has large rare-earth reserves (about 6.9 million tonnes of oxide per USGS; 7.23 million tonnes in monazite per the government) but almost no oxide-to-magnet industry, so nearly all magnets are imported - about 93% of FY25 permanent-magnet tonnage came from China. China's 2025 export licences cut Indian e-scooter output within weeks, which turned a niche input into a policy priority.",
      "The REPM scheme funds five integrated plants (oxide to metal to alloy to magnet) totalling 6,000 tonnes a year. It sits alongside the National Critical Mineral Mission (₹16,300 Cr, Jan 2025), a ₹1,500 Cr recycling incentive (Sep 2025) and the Budget 2026-27 Rare Earth Corridors.",
    ],
    chart: {
      title: "Maximum sales-linked incentive per winner, by allotted capacity",
      unit: "₹ Cr over 5 years",
      source: "MHI REPM scheme terms: ₹2,150/kg cap x capacity x 5 years (₹645 Cr at 600 t, ₹1,290 Cr at 1,200 t)",
      points: [
        { label: "600 t", value: 645 },
        { label: "700 t", value: 752.5 },
        { label: "800 t", value: 860 },
        { label: "900 t", value: 967.5 },
        { label: "1,000 t", value: 1075 },
        { label: "1,100 t", value: 1182.5 },
        { label: "1,200 t", value: 1290 },
      ],
    },
    snapshot: [
      { label: "India rare-earth oxide reserves (USGS)", value: "~6.9 million t", tone: "pos" },
      { label: "IREL NdPr oxide for scheme winners", value: "500 t/yr", tone: "neg" },
      { label: "China share of rare-earth refining (IEA)", value: ">90%", tone: "neg" },
      { label: "India magnet imports, FY25 (SBI)", value: "US$291m", tone: "neutral" },
      { label: "Share of FY25 magnet tonnage from China", value: "~93%", tone: "neg" },
      { label: "China curb pause ends", value: "10 Nov 2026", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Mining (beach sand & hard rock)", zoneIds: ["beach_sand", "hardrock"], margin: "By-product of titanium minerals", moat: "high", note: "Monazite is a regulated atomic mineral handled by state-owned IREL; hard-rock deposits (GMDC) are at pilot stage." },
    { stage: "Separation to oxides", zoneIds: ["separation"], margin: "Thin outside China", moat: "high", note: "The real chokepoint: chemistry-heavy, regulated and dominated by China; IREL is India's only scale player." },
    { stage: "Metal & alloy", zoneIds: ["metal_alloy"], margin: "Captive inside magnet makers", moat: "medium", note: "Almost no commercial Indian capacity; know-how sits with NFTDC, BARC and foreign partners." },
    { stage: "Magnet making & recycling", zoneIds: ["magnet_making", "recycling"], margin: "Scheme pays up to ₹2,150/kg", moat: "medium", note: "Incentive-backed for five years; long-run economics depend on matching Chinese prices." },
    { stage: "Motors & end products", zoneIds: ["ev_motors", "ev_2w", "wind", "defence"], margin: "Magnets are a small cost share", moat: "low", note: "Users gain supply security, not magnet margins; some are designing magnets out (ferrite motors)." },
  ],

  drivers: [
    { title: "Supply risk from China", metric: "Pause ends 10 Nov 2026", body: "April 2025 licensing is still in force and the tougher October 2025 controls are only suspended; every new curb strengthens the case for local supply." },
    { title: "EV and two-wheeler demand", metric: "Demand ~2x by 2030", body: "The government expects India's magnet use to double from 2025 to 2030, led by electric vehicles; the 2025 shortage showed how exposed e-scooters are." },
    { title: "A full policy stack", metric: "₹25,000 Cr+", body: "REPM (₹7,280 Cr), the National Critical Mineral Mission (₹16,300 Cr) and the recycling scheme (₹1,500 Cr) fund mining, processing, magnets and recycling together." },
    { title: "Defence indigenisation", metric: "US cut-off 1 Jan 2027", body: "Chinese licences exclude defence uses, and from 2027 US defence rules bar magnets mined or processed in China, pushing allies to build their own." },
  ],
  mix: {
    title: "REPM scheme outlay by component",
    source: "Union Cabinet approval, 26 Nov 2025; scheme notification S.O. 5800(E), 15 Dec 2025",
    slices: [
      { label: "Sales-linked incentive (₹6,450 Cr)", value: 88.6 },
      { label: "Capital subsidy (₹750 Cr)", value: 10.3 },
      { label: "Administration (₹80 Cr)", value: 1.1 },
    ],
  },

  pestle: {
    political: [
      { point: "Bipartisan strategic priority after China's 2025 curbs; Cabinet-approved scheme with fixed per-kg incentives.", impact: "pos" },
      { point: "Feedstock is state-controlled through IREL, so progress depends on government allocation decisions.", impact: "neutral" },
    ],
    economic: [
      { point: "Five years of sales-linked incentives make early plants bankable despite China's cost lead.", impact: "pos" },
      { point: "China can cut magnet and oxide prices to undercut new entrants once incentives end.", impact: "neg" },
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
      { point: "Monazite contains thorium, so processing is regulated under atomic-energy rules.", impact: "neg" },
      { point: "Only magnets made from oxide in India qualify for incentives, which forces real localisation.", impact: "pos" },
    ],
    environmental: [
      { point: "Separation produces acidic and radioactive residues that need careful handling.", impact: "neg" },
      { point: "Magnets enable EVs and wind power, and recycling can supply part of future demand.", impact: "pos" },
    ],
  },

  beneficiaries: [
    { key: "microns20", tier: "core", why: "The only small-cap listed bidder; a win (₹645-1,290 Cr of incentives) would be large against ₹954 Cr of FY26 revenue. Binary." },
    { key: "lt", tier: "core", why: "Bidder with engineering depth and captive demand from its EV motor business; magnets would be a tiny part of L&T." },
    { key: "gmdc", tier: "direct", why: "Most direct listed route into Indian rare-earth feedstock (Ambadungar, BARC technology); its rare-earth business is still pre-revenue - today's revenue is lignite and other minerals." },
    { key: "sona", tier: "direct", why: "Largest magnet importer among Indian motor makers; gains most from a local second source." },
    { key: "coalIndia", tier: "direct", why: "Bidder with the cash to build; immaterial to its earnings." },
    { key: "bajaj", tier: "indirect", why: "Its Chetak e-scooter output fell 47% in July 2025 on magnet shortages; local supply de-risks EV volumes." },
    { key: "tvs", tier: "indirect", why: "Large e-scooter maker (iQube) that gains supply security from a local magnet source." },
    { key: "nmdc", tier: "indirect", why: "GMDC's rare-earth partner (MoU, Mar 2026); a small option next to iron ore." },
    { key: "midwestLtd", tier: "indirect", why: "Sister concern (not parent) of India's most advanced private magnet project, with Sri Lankan mineral-sand licences." },
    { key: "unominda", tier: "indirect", why: "Makes e-two- and three-wheeler traction motors in-house, so it buys magnets directly and gains from a local source." },
  ],

  companyNews: [
    { key: "lt", date: "Aug 2026", development: "Bid for the REPM scheme; reported to need a technology partner and to be building EV traction motors with Israel's EVR Motors.", impact: "A large engineering group entering magnets signals the scheme can attract serious capital.", tone: "pos" },
    { key: "coalIndia", date: "Aug 2026", development: "Bid for the REPM scheme as part of its push into critical minerals.", impact: "PSU participation raises the chance at least one winner has deep pockets and state backing.", tone: "pos" },
    { key: "microns20", date: "Aug 2026", development: "Named among the 20 bidders for the magnet scheme; bid details not disclosed.", impact: "Shows small mineral processors see a niche, but no sintered-magnet record is public.", tone: "neutral" },
    { key: "gmdc", date: "Jan 2026", development: "Received BARC's indigenous rare-earth processing technology for Ambadungar (19 Jan); a non-binding MoU with NMDC followed on 16 Mar 2026.", impact: "First listed company with a domestic hard-rock rare-earth path outside IREL.", tone: "pos" },
    { key: "ola", date: "Oct 2025", development: "Became the first Indian two-wheeler maker to get government certification for an in-house rare-earth-free ferrite motor.", impact: "Proof that part of the motor market can design magnets out - a ceiling on NdFeB demand.", tone: "neutral" },
    { key: "bajaj", date: "Jul 2025", development: "Chetak production fell 47% year on year to 10,824 units as Chinese magnet shipments stalled; the line restarted in late Aug 2025.", impact: "The clearest evidence of why India needs its own magnet supply.", tone: "neg" },
  ],

  risks: [
    { risk: "Award and build delays push first Indian magnets beyond 2028", mitigant: "Fixed two-year gestation in the scheme; early private lines such as Midwest's already commissioning", severity: "high" },
    { risk: "Oxide shortage: IREL's 500 t of NdPr oxide covers only about 1,500 of the 6,000 t of magnets", mitigant: "Imports from allied suppliers, recycling, new hard-rock sources (GMDC) and corridor projects", severity: "high" },
    { risk: "Chinese price cuts make Indian magnets uncompetitive after incentives end", mitigant: "Buyers paying a premium for non-China supply; defence and export demand from allies", severity: "medium" },
    { risk: "Demand shifts to ferrite or magnet-free motors in small vehicles", mitigant: "Cars, buses, wind and defence still need NdFeB; demand expected to double by 2030", severity: "medium" },
  ],
  outlook: {
    bull: "Winners are named by early 2027, China re-tightens exports, and Indian magnets win long-term contracts with motor makers at a premium, while GMDC and recyclers add oxide beyond IREL.",
    base: "Awards land in the coming months, plants come up through 2028, and the first sizeable Indian output reaches buyers around 2028-29; listed beneficiaries see sentiment, not earnings, until then.",
    bear: "Awards slip, China eases curbs and cuts prices, and oxide shortages leave plants under-used; the scheme ends up funding small, high-cost capacity.",
  },
  reading: [
    { title: "Cabinet approves Rs 7,280 crore scheme for sintered rare-earth permanent magnets", source: "PIB, 26 Nov 2025", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2194687" },
    { title: "Scheme notification, RFP and addenda (Sintered REPM scheme)", source: "Ministry of Heavy Industries", url: "https://heavyindustries.gov.in/en/scheme-notification" },
    { title: "MHI receives 20 bids for integrated sintered NdFeB magnet plants", source: "PIB, 13 Aug 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2299078" },
    { title: "India's REE strategy: turning resources into capacity", source: "Observer Research Foundation", url: "https://www.orfonline.org/research/india-s-ree-strategy-turning-resources-into-capacity" },
  ],
};
