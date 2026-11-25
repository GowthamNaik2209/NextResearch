import type { SectorReport } from "./types";

export const autos: SectorReport = {
  slug: "autos",
  title: "India Automobiles",
  subtitle: "Two-wheelers, cars, trucks and tractors and the parts, tyre and aftermarket makers behind them - record volumes, squeezed margins",
  asOf: "Nov 2026",

  stance: {
    label: "Positive on volumes, cautious on margins",
    tone: "neutral",
    line: "Lower GST, exports and rural demand carried FY26 to record sales in every segment; 2026's metal and rubber inflation, a softer monsoon and CAFE III costs decide how much of that reaches profit.",
  },
  keyStats: [
    { label: "Domestic vehicle sales, FY26", value: "2.83 crore", sub: "+10.4%, highest ever; every segment a record (SIAM)" },
    { label: "Passenger vehicles, FY26", value: "46.43 lakh", sub: "+7.9%; exports +17.5% to 9.05 lakh (SIAM)" },
    { label: "Two-wheelers, FY26", value: "2.17 crore", sub: "+10.7%; exports +23.4% to 51.8 lakh (SIAM)" },
    { label: "Tractors, FY26", value: "~11.6 lakh", sub: "first year above 10 lakh, up about 23% (TMA via trade press)" },
  ],
  thesis: [
    {
      title: "The GST cut reset demand",
      body: "From 22 Sep 2025 small cars, bikes up to 350cc, trucks and buses moved from 28% to 18% GST, tractors to 5% and all parts to 18%. FY26 then set records in every segment, and dispatches stayed strong into FY27 (PVs +36.5% in Aug 2026).",
    },
    {
      title: "Costs, not demand, are the issue",
      body: "West Asia-linked inflation in aluminium, copper, steel and rubber hit 2026 margins: Maruti's Q2 FY27 profit fell 27% on record volumes and CEAT's margin fell about 4 points. Makers with pricing power (SUVs, premium bikes, replacement brands) hold up best.",
    },
    {
      title: "The fleet on the road is the steadier earner",
      body: "Tyres, batteries, oils and spares sell to India's growing fleet whatever happens to new sales. Engine parts face electrification over time, while electronics, brakes, steering and bearings stay on every vehicle and gain content.",
    },
  ],

  developments: [
    {
      date: "Nov 2026",
      title: "October retail falls on Diwali timing; tractors and trucks hold",
      body: "FADA: vehicle retail fell 23.8% year on year to 31.72 lakh in Oct 2026 as Dhanteras and Diwali moved to November; two-wheelers fell 28%. Tractors (79,285, +3.1%) and CVs (1.15 lakh, +2.3%) had their best-ever Octobers.",
      impact: "neutral",
      tag: "Demand",
    },
    {
      date: "Nov 2026",
      title: "Q2 FY27: volumes up, margins squeezed",
      body: "Maruti sold a record 6.97 lakh vehicles but its standalone profit fell 27% (27 Oct). Bajaj's profit rose 35% on exports, Mahindra's 25% on SUVs (5 Nov), and Hero's rose 41% with a one-time gain.",
      impact: "neutral",
      tag: "Results",
    },
    {
      date: "Oct-Nov 2026",
      title: "Tata Motors takes control of Iveco",
      body: "Tata Motors (CV) settled its tender offer for Iveco Group on 30 Oct 2026 at €14.40 a share, making the European truck and bus maker a subsidiary; after the reopened window its stake reached 96.25% (excluding treasury shares, 9 Nov), and a Dutch legal squeeze-out of the remaining shares is under way.",
      impact: "neutral",
      tag: "M&A",
    },
    {
      date: "Sep 2026",
      title: "CAFE III fuel-efficiency rules notified",
      body: "Notified 30 Sep 2026 for 1 Apr 2027-31 Mar 2032: a reference fleet's limit tightens from about 94.8 to 78.9 g CO2/km; EVs get 3x credit, strong hybrids 1.6x, credits can be traded, and the proposed small-car relief was dropped.",
      impact: "neg",
      tag: "Policy",
    },
    {
      date: "Apr 2026",
      title: "FY26 sets records in every segment",
      body: "SIAM: domestic sales rose 10.4% to 2.83 crore - PVs 46.43 lakh, two-wheelers 2.17 crore, three-wheelers 8.36 lakh and CVs 10.8 lakh - the first year in seven with all segments at highs.",
      impact: "pos",
      tag: "Volumes",
    },
    {
      date: "Feb 2026",
      title: "US and EU trade deals open doors for parts",
      body: "The US-India interim framework (6 Feb) promises quotas at 0-18% duty for many auto parts once put in place (not yet done by late Nov 2026, as far as reported); the India-EU FTA (27 Jan) phases out duties on car parts over 5-10 years and lets 2.5 lakh EU cars a year in at falling duties.",
      impact: "pos",
      tag: "Trade",
    },
  ],

  overview: {
    narrative: [
      "India sold a record 2.83 crore vehicles in FY26 (SIAM). Two-wheelers are about three-quarters of units; cars and SUVs (46.43 lakh) carry most of the value, with utility vehicles driving growth while small cars were roughly flat for the year. Exports rose fast in both PVs (+17.5%) and two-wheelers (+23.4%).",
      "The chain runs from the vehicle makers through system suppliers (lighting, brakes, steering, modules, glass), engine and driveline makers (pistons, crankshafts, fuel injection, bearings, axles), to tyres, batteries, oils and the dealers and used-car platforms that serve the fleet on the road.",
      "2026's question is margins: metal and rubber inflation linked to the West Asia conflict forced repeated price rises, while CAFE III (from Apr 2027) and safety rules add cost. Electric two-wheelers are growing fast (2.24 lakh registrations in Oct 2026, Vahan), led by the incumbents rather than start-ups.",
    ],
    chart: {
      title: "Domestic passenger-vehicle sales, fiscal years",
      unit: "lakh units",
      source: "SIAM (via Autocar Professional and PTI), FY22-FY26",
      points: [
        { label: "FY22", value: 30.69 },
        { label: "FY23", value: 38.9 },
        { label: "FY24", value: 42.19 },
        { label: "FY25", value: 43.02 },
        { label: "FY26", value: 46.43 },
      ],
    },
    snapshot: [
      { label: "Two-wheeler exports, FY26 (SIAM)", value: "51.8 lakh, +23.4%", tone: "pos" },
      { label: "PV dispatches, Aug 2026 (SIAM)", value: "4.39 lakh, +36.5%", tone: "pos" },
      { label: "E-2W registrations, Oct 2026 (Vahan)", value: "2.24 lakh, +48%", tone: "pos" },
      { label: "Vehicle retail, Oct 2026 (FADA)", value: "-23.8% (Diwali in Nov)", tone: "neutral" },
      { label: "Maruti standalone profit, Q2 FY27", value: "-27% YoY", tone: "neg" },
      { label: "GST on small cars, bikes ≤350cc, trucks", value: "18% since 22 Sep 2025", tone: "pos" },
    ],
  },

  valueChain: [
    { stage: "Vehicle makers", zoneIds: ["two_wheelers", "passenger_vehicles", "commercial_vehicles", "tractors"], margin: "Mid-teens EBITDA at leaders; cyclical in trucks", moat: "high", note: "Brands, dealer networks and scale; leaders hold share for decades." },
    { stage: "Systems & modules", zoneIds: ["body_electricals", "chassis_systems", "modules_interiors"], margin: "10-15% EBITDA", moat: "medium", note: "Platform wins last a model's life; content per vehicle rises with safety and electronics." },
    { stage: "Engine & driveline", zoneIds: ["engine_parts", "emissions_fuel", "driveline"], margin: "12-20% EBITDA at niche leaders", moat: "medium", note: "Precision and technology licences; engine parts face electrification, driveline less so." },
    { stage: "Tyres & replacement", zoneIds: ["tyres", "replacement"], margin: "Swings with rubber, lead and crude", moat: "medium", note: "Brands and dealer reach sell to the whole fleet on the road." },
    { stage: "Dealers & used vehicles", zoneIds: ["dealers"], margin: "Thin on new vehicles; service richer", moat: "low", note: "Makers set dealer terms; used cars and service earn more." },
  ],

  drivers: [
    { title: "Lower GST", metric: "18% on small cars, bikes ≤350cc, trucks", body: "The 22 Sep 2025 cut lowered on-road prices across mass segments; tractors fell to 5% and all parts to 18%." },
    { title: "Exports", metric: "2W exports +23.4%, PV +17.5% (FY26)", body: "Bajaj, TVS, Maruti and Hyundai export to Africa, Latin America and the Middle East; parts makers ship to the US and Europe." },
    { title: "SUVs and premium mix", metric: "Mahindra SUVs +26% in Q2 FY27", body: "Buyers trade up to SUVs and premium bikes, raising revenue and parts content per vehicle." },
    { title: "Rural income", metric: "Tractors above 10 lakh in FY26", body: "Monsoon, crop prices and rural credit drive tractors, entry bikes and small trucks; FY27 looks flatter after weak rains." },
  ],
  mix: {
    title: "What India's vehicle buyers bought: domestic sales by segment, FY26",
    source: "SIAM FY26 domestic sales (Apr 2026), via Autocar Professional",
    slices: [
      { label: "Two-wheelers", value: 76.8 },
      { label: "Passenger vehicles", value: 16.4 },
      { label: "Commercial vehicles", value: 3.8 },
      { label: "Three-wheelers", value: 3.0 },
    ],
  },

  pestle: {
    political: [
      { point: "GST 2.0 (22 Sep 2025) cut taxes on mass vehicles, tractors and parts, lifting demand across segments.", impact: "pos" },
      { point: "Trade deals with the US (interim, Feb 2026) and the EU (Jan 2026) await notification and ratification.", impact: "neutral" },
    ],
    economic: [
      { point: "Repo-rate cuts, income-tax relief and lower GST supported FY26's record demand (SIAM).", impact: "pos" },
      { point: "Aluminium, copper, steel and rubber inflation in 2026 squeezed margins and forced price rises.", impact: "neg" },
    ],
    social: [
      { point: "Buyers trade up to SUVs and premium bikes; used-car buying grows fast.", impact: "pos" },
      { point: "Rural demand depends on the monsoon; Mahindra expects a flat FY27 for tractors.", impact: "neg" },
    ],
    technological: [
      { point: "Electric two-wheelers reached 2.24 lakh registrations in Oct 2026, led by TVS, Bajaj, Ather and Hero.", impact: "pos" },
      { point: "Rare-earth magnet and chip dependence on imports (China's 2025 curbs cut e-scooter output).", impact: "neg" },
    ],
    legal: [
      { point: "CAFE III from 1 Apr 2027 tightens fuel rules each year and allows credit trading.", impact: "neutral" },
      { point: "Proposed ABS on all new two-wheelers would add cost to entry bikes (draft of Jun 2025).", impact: "neutral" },
    ],
    environmental: [
      { point: "CAFE credits favour EVs (3x), strong hybrids (1.6x) and flex-fuel vehicles.", impact: "neutral" },
      { point: "Emission steps for trucks and tractors raise costs and pull buying forward or back.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "mm", tier: "core", why: "SUV leader, half of India's tractors and the top pickup maker - the broadest play on the cycle." },
    { key: "maruti", tier: "core", why: "Largest carmaker and exporter; small cars gain most from 18% GST, margins the watch point." },
    { key: "tvs", tier: "core", why: "Gaining share in scooters, premium bikes and e-scooters, with strong exports." },
    { key: "bajajauto", tier: "core", why: "Largest two-wheeler exporter and three-wheeler leader; record Q2 FY27." },
    { key: "eichermot", tier: "direct", why: "Royal Enfield's grip on mid-size bikes plus VECV trucks." },
    { key: "tmcv", tier: "direct", why: "India's largest truck and bus maker, now with Iveco in Europe." },
    { key: "unominda", tier: "direct", why: "Content per vehicle rises with LEDs, switches and electronics on every fuel type." },
    { key: "bosch", tier: "direct", why: "Reference supplier for fuel injection and engine electronics as emission rules tighten." },
    { key: "escorts", tier: "indirect", why: "Kubota-backed tractor maker riding farm mechanisation." },
    { key: "exide", tier: "indirect", why: "Replacement batteries for the whole fleet on the road." },
  ],

  companyNews: [
    { key: "maruti", date: "Oct 2026", development: "Q2 FY27 volumes rose 26.5% to a record 6,96,654 but standalone profit fell 26.9% to ₹2,415 Cr as material costs rose 48% and treasury income fell (27 Oct).", impact: "Shows volumes alone don't protect margins when metals spike.", tone: "neg" },
    { key: "mm", date: "Nov 2026", development: "Q2 FY27 consolidated revenue rose 25% to ₹57,553 Cr and profit 25% to ₹4,588 Cr; SUV volumes +26%, but tractor margin fell to 17.6% and the FY27 tractor outlook was cut to flat (5 Nov).", impact: "SUVs carry the cycle while farm demand cools.", tone: "pos" },
    { key: "bajajauto", date: "Oct 2026", development: "Q2 FY27 standalone revenue hit a record ₹20,003 Cr and profit rose 35% to ₹3,354 Cr; exports up 41% (27 Oct).", impact: "Exports are now a second engine for two-wheeler makers.", tone: "pos" },
    { key: "heromotoco", date: "Nov 2026", development: "Q2 FY27 revenue rose 23% to ₹14,971 Cr; consolidated profit rose 41% to ₹1,861 Cr including a ₹397 Cr one-time gain, standalone profit only 4.6%.", impact: "Rural commuter bikes grow, but cost inflation caps margins.", tone: "neutral" },
    { key: "tmcv", date: "Nov 2026", development: "Settled the Iveco tender offer on 30 Oct at €14.40 a share and reached 96.25% after the reopened window; a Dutch squeeze-out of the remaining shares is under way.", impact: "India's truck leader becomes a global CV group, with integration and debt to manage.", tone: "neutral" },
    { key: "ceat", date: "Oct 2026", development: "Q2 FY27 revenue rose 26% to ₹4,762 Cr but EBITDA margin fell about 4 points to 9.5%; said a 7-8% price rise is needed.", impact: "Tyre makers are the most exposed to rubber and crude costs.", tone: "neg" },
  ],

  risks: [
    { risk: "Metal and rubber prices stay high and price rises lag", mitigant: "Repeated price increases in 2026; commodity prices tend to revert", severity: "high" },
    { risk: "Weak monsoon hits tractors, entry bikes and small trucks", mitigant: "Urban SUV and premium demand; exports", severity: "medium" },
    { risk: "CAFE III and safety rules raise costs and shift the mix away from engines", mitigant: "Hybrids, CNG and EV credits; suppliers diversifying into electronics and EV parts", severity: "medium" },
    { risk: "Tariffs and rare-earth curbs disrupt exports and EV output", mitigant: "US and EU trade deals; light rare-earth and ferrite motors", severity: "medium" },
  ],
  outlook: {
    bull: "Commodity prices ease in 2027, the trade deals take effect and the monsoon is normal: volumes grow high single digits, margins recover and parts exporters re-rate.",
    base: "Volumes grow mid-to-high single digits in FY27 on the GST reset and SUVs; margins recover slowly as price rises catch up, while tractors stay flat.",
    bear: "Inflation persists, rains fail and CAFE III costs bite: entry bikes and tractors fall, margins stay squeezed and engine-part makers lose share to EVs faster than expected.",
  },
  reading: [
    { title: "Auto industry hits 7-year peak in FY26 as all segments log record sales", source: "Autocar Professional (SIAM data)", url: "https://www.autocarpro.in/news/auto-industry-hits-7-year-peak-in-fy26-as-all-segments-log-record-sales-132106", year: "2026" },
    { title: "Government notifies CAFE III norms: EVs get 3x credit, credit trading allowed", source: "Autocar Professional", url: "https://www.autocarpro.in/news/government-notifies-cafe-iii-norms-evs-get-3x-credit-credit-trading-allowed-134984", year: "2026" },
    { title: "Maruti Suzuki Q2 net profit drops 27% to Rs 2,415 crore amid input cost inflation", source: "Autocar Professional", url: "https://www.autocarpro.in/news/maruti-suzuki-q2-net-profit-drops-27-percent-to-rs-2415-crore-amid-input-cost-inflation-135496", year: "2026" },
    { title: "Tractor retail sales rise 3.10% to 79,285 units in October", source: "Autocar Professional (FADA data)", url: "https://www.autocarpro.in/analysis-sales/tractor-retail-sales-rise-310-percent-to-79285-units-in-october-fada-135779", year: "2026" },
    { title: "Tata Motors sets Iveco stake at 96.25%, moves ahead with squeeze-out", source: "Autocar Professional", url: "https://www.autocarpro.in/news/tata-motors-sets-iveco-stake-at-9625-percent-moves-ahead-with-squeeze-out-135838", year: "2026" },
    { title: "GST on small cars, motorcycles slashed to 18% from 28%", source: "Autocar Professional", url: "https://www.autocarpro.in/news/gst-cut-on-autos-farm-machinery-to-boost-demand-128419", year: "2025" },
  ],
};
