import type { SectorReport } from "./types";

export const pharma: SectorReport = {
  slug: "pharma",
  title: "India Pharmaceuticals",
  subtitle: "From the US generics peak to brands, biologics and contract chemistry",
  asOf: "Oct 2026",

  stance: {
    label: "Mixed: rotate within",
    tone: "neutral",
    line: "India brands, CDMO and specialty look structurally stronger; US-generic earnings face a post-gRevlimid reset and a dated tariff clock.",
  },
  keyStats: [
    { label: "Indian pharma market, CY2025", value: "~Rs 2.4 lakh Cr", sub: "+8.1% (Pharmarack)" },
    { label: "Pharma exports, FY25", value: "US$30.5bn", sub: "+9.4%; FY26 ~flat (Pharmexcil)" },
    { label: "US share of exports", value: "~34%", sub: "largest market (Pharmexcil)" },
    { label: "IPM growth, Aug 2026", value: "+10.7%", sub: "value; units flat (Pharmarack)" },
  ],
  thesis: [
    {
      title: "The domestic brand franchise is the anchor",
      body: "India's branded market grows ~8-11% a year on price, launches and chronic disease, with no US-style erosion. Consolidation (Torrent-JB, Mankind-Bharat Serums) shows what these brands are worth.",
    },
    {
      title: "US generics: past the peak, on a tariff clock",
      body: "gRevlimid has ended and plain generics keep eroding. Generics are tariff-free until Jul 2028, then face 100%-200% unless made in the US, so complex products and US plants decide who keeps US profits.",
    },
    {
      title: "Chemistry and outsourcing are re-rating",
      body: "BIOSECURE, China+1 and GLP-1/peptide demand pull innovator work to Indian CDMOs (Divi's custom synthesis +45% in Q1 FY27), while PLI plants chip at China dependence in KSMs.",
    },
  ],

  developments: [
    {
      date: "Sep 2026",
      title: "Indian market grows 10.7% in August",
      body: "Pharmarack data showed value growth of 10.7% with flat unit volumes; cardiac, anti-diabetic and nutrition grew ~15-16% while anti-infectives and respiratory lagged.",
      impact: "pos",
      tag: "Demand",
    },
    {
      date: "Jul 2026",
      title: "US sets a tariff clock for generics",
      body: "The US President announced 0% tariffs on generic drugs for two years from 1 Aug 2026, then 100% for a year and 200% after, for companies that do not build US plants. The India-US interim deal promises 'negotiated outcomes'.",
      impact: "neg",
      tag: "Trade",
    },
    {
      date: "Apr 2026",
      title: "Section 232 duties on patented drugs",
      body: "A US proclamation imposed 100% tariffs on patented medicines and their APIs (lower or zero for companies onshoring or signing pricing deals); generics and biosimilars were exempted, subject to review within a year.",
      impact: "neutral",
      tag: "Trade",
    },
    {
      date: "Mar 2026",
      title: "Semaglutide goes generic in India",
      body: "On patent expiry Dr Reddy's, Sun, Zydus, Glenmark, Natco and dozens of others launched generic semaglutide at ~Rs 325-4,200 a month versus ~Rs 8,800-11,000 for the originator - a big volume opportunity with fast price erosion.",
      impact: "pos",
      tag: "Market",
    },
    {
      date: "Feb 2026",
      title: "Budget launches Biopharma SHAKTI",
      body: "Union Budget 2026-27 proposed Rs 10,000 crore over five years to build biologics and biosimilars capacity, plus three new NIPERs and upgrades of seven.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Dec 2025",
      title: "BIOSECURE Act becomes US law",
      body: "Signed as part of the FY2026 NDAA, it restricts US federal contracting with 'biotechnology companies of concern'. Binding restrictions are expected from ~2027-28, but vendor diversification toward India has begun.",
      impact: "pos",
      tag: "CDMO",
    },
  ],

  overview: {
    narrative: [
      "India is the world's largest supplier of generic medicines by volume and runs a ~Rs 2.4 lakh crore domestic market. About half of the industry's revenue comes from exports, a third of which go to the US.",
      "Profit pools differ sharply by layer: branded domestic formulations and specialty earn the highest returns, US generics are large but deflationary, and APIs/KSMs swing with Chinese pricing.",
      "The next leg is about moving up the value chain - complex generics, biosimilars, peptides, CDMO and novel drugs - while managing USFDA compliance, US tariffs and China input dependence.",
    ],
    chart: {
      title: "India pharmaceutical exports",
      unit: "US$ bn",
      source: "Pharmexcil / DGCI&S; FY26 provisional (secondary reports of official data)",
      points: [
        { label: "FY20", value: 20.6 },
        { label: "FY21", value: 24.4 },
        { label: "FY22", value: 24.6 },
        { label: "FY23", value: 25.4 },
        { label: "FY24", value: 27.9 },
        { label: "FY25", value: 30.5 },
        { label: "FY26P", value: 31, projected: true },
      ],
    },
    snapshot: [
      { label: "IPM size, CY2025 (Pharmarack)", value: "Rs 2,40,672 Cr", tone: "pos" },
      { label: "IPM growth, Aug 2026 (Pharmarack)", value: "+10.7% value, units flat", tone: "neutral" },
      { label: "China share of imports, many critical APIs", value: "70%+ (PIB, FY25)", tone: "neg" },
      { label: "PLI bulk-drug scheme outlay", value: "Rs 6,940 Cr; 48 projects", tone: "pos" },
      { label: "US tariff on generics", value: "0% to Jul 2028, then 100%", tone: "neg" },
      { label: "Indian pharma US investment pledges", value: "~US$19bn (May 2026)", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "KSMs & intermediates", zoneIds: ["ksm"], margin: "10-20% EBITDA", moat: "low", note: "Commodity chemistry where China sets prices; PLI incentives help import substitution." },
    { stage: "APIs", zoneIds: ["api"], margin: "12-40% EBITDA", moat: "medium", note: "Commodity APIs earn low teens; niche, peptide and complex APIs (Divi's) earn 30%+." },
    { stage: "CDMO & contract research", zoneIds: ["cdmo"], margin: "25-40% EBITDA", moat: "high", note: "Long qualification cycles and sticky commercial supply; lumpy validation revenue." },
    { stage: "Generics, injectables & inputs", zoneIds: ["generics", "injectables", "packaging"], margin: "15-30% EBITDA", moat: "low", note: "US price erosion of 5-10% a year; profits sit in complex and limited-competition products." },
    { stage: "Specialty & biologics", zoneIds: ["specialty", "biologics"], margin: "25-40%+ once scaled", moat: "high", note: "Innovator-like pricing but heavy R&D and launch spend; few Indian players at scale." },
    { stage: "India brands & distribution", zoneIds: ["domestic", "distribution"], margin: "25-35% brands; 3-9% retail", moat: "high", note: "Field force and doctor loyalty protect brands; distribution is a thin-margin scale game." },
  ],

  drivers: [
    { title: "Chronic disease in India", metric: "~10% IPM value growth", body: "Cardiac, diabetes and obesity therapies grow mid-teens; insurance and diagnosis rates are rising from a low base." },
    { title: "Patent cliffs", metric: "Semaglutide + biologics", body: "GLP-1 generics (India, Canada, Brazil from 2026) and large biologic expiries this decade feed generics, biosimilars and peptide APIs." },
    { title: "China+1 and BIOSECURE", metric: "~US$700m a year", body: "Jefferies' estimate of incremental Indian CRDMO revenue from the shift away from Chinese vendors; peptides and small molecules benefit most." },
    { title: "US onshoring", metric: "~US$19bn pledged", body: "Tariff policy is pushing Indian companies to buy or build US plants (Sun-Organon, Cipla's New York site), changing where generic profits are booked." },
  ],
  mix: {
    title: "Indian pharma market by therapy, Aug 2026",
    source: "Pharmarack (via BioSpectrum)",
    slices: [
      { label: "Cardiac", value: 14 },
      { label: "Gastrointestinal", value: 12 },
      { label: "Anti-infectives", value: 11 },
      { label: "Anti-diabetic", value: 9 },
      { label: "All other therapies", value: 54 },
    ],
  },

  pestle: {
    political: [
      { point: "Strong policy support: PLI for bulk drugs and formulations, Biopharma SHAKTI and PRIP research incentives.", impact: "pos" },
      { point: "US tariff policy (Section 232, generic tariff clock) puts India's largest export market at political risk.", impact: "neg" },
    ],
    economic: [
      { point: "Domestic market grows ~8-11% a year with high returns on capital and low leverage for most leaders.", impact: "pos" },
      { point: "US generic price erosion and big-product cliffs (gRevlimid) compress export earnings.", impact: "neg" },
    ],
    social: [
      { point: "Rising chronic-disease burden, ageing and wider insurance lift long-term medicine demand.", impact: "pos" },
      { point: "Affordability pressure keeps drug prices politically sensitive (NLEM, Jan Aushadhi).", impact: "neutral" },
    ],
    technological: [
      { point: "Capability shift into complex generics, biosimilars, peptides, ADCs and novel antibiotics (Zaynich).", impact: "pos" },
      { point: "Biosimilar and complex-generic development is costly and slow, favouring scale players.", impact: "neutral" },
    ],
    legal: [
      { point: "USFDA OAIs and warning letters can freeze approvals from a plant for years.", impact: "neg" },
      { point: "Price control under DPCO 2013 and NPPA ceiling prices cap returns on essential drugs.", impact: "neg" },
    ],
    environmental: [
      { point: "Chemistry clusters face tighter effluent and process-safety scrutiny after the Sigachi explosion (Jun 2025).", impact: "neg" },
      { point: "Customers increasingly demand green chemistry and solvent recovery from API and CDMO suppliers.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "sunPharma", tier: "core", why: "No. 1 in India plus the largest Indian specialty franchise; Organon adds scale in women's health and biosimilars." },
    { key: "divis", tier: "core", why: "Custom synthesis and peptides make it the purest listed play on China+1 and GLP-1 chemistry." },
    { key: "torrent", tier: "core", why: "Chronic-heavy India brands, enlarged by J B Chemicals; little US exposure." },
    { key: "mankind", tier: "direct", why: "Domestic-only volume leader; insulated from US pricing and tariffs." },
    { key: "lupin", tier: "direct", why: "Strongest US complex-generics turnaround (inhalation, limited-competition launches) with growing India business." },
    { key: "zydus", tier: "direct", why: "Balanced US, India and consumer mix with an in-house NCE pipeline." },
    { key: "saiLife", tier: "direct", why: "Small-molecule CRDMO positioned for BIOSECURE-driven vendor shifts." },
    { key: "gland", tier: "direct", why: "Pure-play sterile injectables and fill-finish, where US shortages and GLP-1 demand concentrate." },
    { key: "biocon", tier: "indirect", why: "Broadest listed biosimilar portfolio; leverage limits near-term earnings." },
    { key: "medplus", tier: "indirect", why: "Organised pharmacy and private-label generics gain share from unorganised chemists." },
  ],

  companyNews: [
    { key: "sunPharma", date: "Apr 2026", development: "Agreed to acquire Organon for US$14 a share in cash (US$11.75bn EV), expected to close in early 2027.", impact: "Largest Indian pharma acquisition; signals the leaders' shift toward innovative and biosimilar medicines.", tone: "pos" },
    { key: "aurobindo", date: "Aug 2026", development: "Eugia Unit I received a USFDA warning letter after an OAI; Unit II was classified OAI in Mar 2026.", impact: "Shows sterile-plant compliance is the sector's recurring weak spot.", tone: "neg" },
    { key: "divis", date: "Aug 2026", development: "Q1 FY27 revenue rose ~28% and profit ~66%; custom synthesis grew 45% on dedicated projects entering validation.", impact: "Evidence that big-pharma outsourcing to India is accelerating.", tone: "pos" },
    { key: "drReddy", date: "Jul 2026", development: "Q1 FY27 profit fell sharply as US lenalidomide (gRevlimid) sales ended and a semaglutide API charge hit.", impact: "Marks the end of the gRevlimid windfall that lifted US generics earnings in FY24-FY26.", tone: "neg" },
    { key: "torrent", date: "Jul 2026", development: "Completed the amalgamation of J B Chemicals (51 Torrent shares per 100 JB) after taking control in Jan 2026.", impact: "Consolidation of India chronic brands at premium valuations continues.", tone: "pos" },
    { key: "glenmark", date: "Sep 2025", development: "Received US$700m upfront from AbbVie for ISB 2001, with up to US$1.225bn in milestones.", impact: "Validates Indian biotech R&D as a source of globally valued assets.", tone: "pos" },
  ],

  risks: [
    { risk: "US tariffs on India-made generics from Aug 2028", mitigant: "India-US trade deal talks, US plant acquisitions, shift to complex and branded markets", severity: "high" },
    { risk: "USFDA OAIs, warning letters and import alerts", mitigant: "Quality investments, site redundancy and product transfers to compliant plants", severity: "high" },
    { risk: "China dependence for KSMs and intermediates", mitigant: "PLI bulk-drug plants, backward integration, dual sourcing", severity: "medium" },
    { risk: "Price control and price wars in India (NLEM, semaglutide-style launches)", mitigant: "Chronic, non-scheduled brands and new launches outside the price list", severity: "medium" },
  ],
  outlook: {
    bull: "Generics win a durable tariff carve-out, BIOSECURE moves a large share of Western outsourcing to India, and India brands compound at ~10% with semaglutide expanding the market.",
    base: "India brands grow 8-10%, CDMO and specialty grow mid-teens, while US generics earnings reset lower after gRevlimid and companies spend on US capacity ahead of 2028.",
    bear: "100%+ US generic tariffs take effect without relief, a wave of USFDA actions hits sterile plants, and Chinese price cuts squeeze API and KSM margins.",
  },
  reading: [
    { title: "Healing the world: a roadmap for making India a global pharma exports hub", source: "IPA and Bain & Company", url: "https://www.ipa-india.org/sites/default/files/2025-07/bain_report-healing_the_world_a_roadmap_for_making_india_a_global_pharma_exports_hub.pdf" },
    { title: "The US-India medicine partnership", source: "IQVIA for IPA", url: "https://www.ipa-india.org/sites/default/files/2025-07/IQVIA-US-India-Medicine-Partnership.pdf" },
    { title: "Indian pharmaceutical industry: the way forward", source: "Indian Pharmaceutical Alliance", url: "https://www.ipa-india.org/sites/default/files/2025-07/Indian-pharmaceutical-industry-way-forward.pdf" },
    { title: "Annual reports", source: "Department of Pharmaceuticals", url: "https://pharma-dept.gov.in/annual-report" },
    { title: "Pharmaceutical industry in India", source: "IBEF", url: "https://www.ibef.org/industry/pharmaceutical-india" },
  ],
};
