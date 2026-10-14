import type { SectorReport } from "./types";

export const energy: SectorReport = {
  slug: "energy",
  title: "India Power Generation",
  subtitle: "A coal-anchored grid adding renewables, storage and new thermal at once",
  asOf: "Oct 2026",

  stance: {
    label: "Structural tailwind",
    tone: "pos",
    line: "Demand growth funds both new thermal and record renewables; value shifts toward storage, equipment makers and scale IPPs.",
  },
  keyStats: [
    { label: "Installed capacity, FY26", value: "~515 GW", sub: "approx. (CEA)" },
    { label: "Non-fossil share of capacity", value: ">50%", sub: "crossed mid-2025, 5 yrs early" },
    { label: "Coal share of generation", value: "~73-75%", sub: "still the base-load backbone" },
    { label: "Record peak demand", value: "250 GW+", sub: "CEA sees ~366 GW by FY32" },
  ],
  thesis: [
    {
      title: "Demand is outrunning the old plan",
      body: "Electrification, cooling load and data centres push peak demand up ~5-7% a year. The government now plans ~80 GW of new coal by FY32 alongside renewables.",
    },
    {
      title: "Renewables need storage to keep scaling",
      body: "Solar adds 30 GW+ a year, but evening peaks need firm power. Storage mandates, VGF and FDRE tenders turn BESS and pumped hydro into the next build-out.",
    },
    {
      title: "Manufacturing moves onshore",
      body: "ALMM rules for modules and now cells, PLI and import duties shift profit from Chinese suppliers to Indian module, cell, turbine and BTG makers.",
    },
  ],

  developments: [
    {
      date: "Jun 2026",
      title: "ALMM List-II for solar cells takes effect",
      body: "Government-backed and net-metering projects must use domestically made, ALMM-listed cells, not just modules - a big push for Indian cell capacity.",
      impact: "pos",
      tag: "Manufacturing",
    },
    {
      date: "Dec 2025",
      title: "SHANTI Act opens nuclear power",
      body: "Parliament passed a law allowing private companies into nuclear generation, part of the 100 GW-by-2047 nuclear goal.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Sep 2025",
      title: "GST 2.0 cuts tax on renewable equipment",
      body: "GST on solar modules, wind turbines and related devices fell from 12% to 5%, lowering project capex; coal's GST rose to 18% as the cess was removed.",
      impact: "pos",
      tag: "Tax",
    },
    {
      date: "Jul 2025",
      title: "Non-fossil capacity crosses 50%",
      body: "Solar, wind, hydro and nuclear passed half of installed capacity, five years ahead of India's 2030 NDC target.",
      impact: "pos",
      tag: "Milestone",
    },
    {
      date: "Jun 2025",
      title: "Rs 5,400 Cr VGF for 30 GWh of BESS",
      body: "Ministry of Power approved viability gap funding for 30 GWh of battery storage, on top of the 4 GWh scheme of 2023.",
      impact: "pos",
      tag: "Storage",
    },
    {
      date: "Feb 2025",
      title: "Co-located storage advised for solar tenders",
      body: "MoP asked future solar tenders to include 2-hour storage equal to at least 10% of plant capacity, to shift solar power into the evening.",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "India is the world's third-largest power producer. Coal still supplies about three-quarters of electricity, while almost all new capacity is solar and wind.",
      "The grid now needs both: new coal and pumped hydro for evening and night peaks, and cheap solar for daytime. Battery storage tenders sit in the middle.",
      "The constraints are grid lines in RE-rich states, unsigned power-sale agreements and weak discom finances.",
    ],
    chart: {
      title: "Installed power generation capacity in India",
      unit: "GW",
      source: "CEA installed capacity reports; FY26 approx., FY30 NextResearch estimate",
      points: [
        { label: "FY21", value: 382 },
        { label: "FY22", value: 399 },
        { label: "FY23", value: 416 },
        { label: "FY24", value: 442 },
        { label: "FY25", value: 475 },
        { label: "FY26", value: 515 },
        { label: "FY30P", value: 750, projected: true },
      ],
    },
    snapshot: [
      { label: "Solar capacity, Mar 2025", value: "~106 GW", tone: "pos" },
      { label: "Coal PLF, FY25", value: "~69%", tone: "neutral" },
      { label: "Solar bid tariffs", value: "~Rs 2.5/kWh", tone: "pos" },
      { label: "ALMM module vs cell capacity", value: "~100 vs ~25 GW", tone: "neutral" },
      { label: "Pumped storage operating", value: "~5-7 GW", tone: "neg" },
      { label: "Discom AT&C losses, FY24", value: "~16%", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Thermal & hydro equipment", zoneIds: ["thermal_equip", "hydro_equip"], margin: "8-12% EBITDA", moat: "high", note: "BTG and hydro turbines are a near-duopoly of BHEL and L&T; order books are at record levels." },
    { stage: "Solar & wind manufacturing", zoneIds: ["solar_equip", "wind_equip"], margin: "15-25% EBITDA", moat: "medium", note: "ALMM and duties protect margins today; module overcapacity is the risk." },
    { stage: "Battery storage manufacturing", zoneIds: ["storage_equip"], margin: "Early, sub-scale", moat: "medium", note: "Cells still mostly imported; PLI-ACC plants are ramping." },
    { stage: "Regulated thermal & hydro generators", zoneIds: ["thermal_gencos", "hydro_gencos"], margin: "15.5-16.5% regulated RoE", moat: "high", note: "Cost-plus tariffs give steady returns; long PPAs with state discoms." },
    { stage: "Solar, wind & hybrid IPPs", zoneIds: ["solar_developers", "wind_developers"], margin: "80-90% EBITDA, high debt", moat: "medium", note: "Returns depend on cost of capital, land and grid access." },
    { stage: "Storage integrators & PSP", zoneIds: ["storage_integrators"], margin: "Contracted, annuity-like", moat: "low", note: "BESS tariffs have fallen fast; pumped hydro sites are scarcer and stickier." },
  ],

  drivers: [
    { title: "Power demand growth", metric: "~5-7% a year", body: "Air-conditioning, electric mobility, industry and data centres push energy and peak demand to records most summers." },
    { title: "Non-fossil target", metric: "500 GW by 2030", body: "SECI, NTPC, NHPC and SJVN tender ~50 GW of renewables a year, increasingly as hybrid and round-the-clock projects." },
    { title: "Storage build-out", metric: "34 GWh VGF", body: "Viability gap funding, storage mandates and falling cell prices make BESS bankable; pumped-storage pipeline is 50 GW+." },
    { title: "Thermal pipeline", metric: "~80 GW by FY32", body: "New coal units for base load revive orders for BTG makers and capex for NTPC and private IPPs." },
  ],
  mix: {
    title: "Installed capacity by source, Mar 2025 (approx.)",
    source: "CEA installed capacity report",
    slices: [
      { label: "Coal & lignite", value: 47 },
      { label: "Solar", value: 22 },
      { label: "Wind", value: 11 },
      { label: "Large hydro", value: 10 },
      { label: "Gas, nuclear & others", value: 10 },
    ],
  },

  pestle: {
    political: [
      { point: "Strong central backing for both energy security (coal) and transition (500 GW target, storage VGF).", impact: "pos" },
      { point: "State discoms are politically pressed to keep tariffs low, which delays payments and PPA signing.", impact: "neg" },
    ],
    economic: [
      { point: "Solar-plus-storage now bids near Rs 3-4.5/kWh, competitive with new coal.", impact: "pos" },
      { point: "Projects are capital-heavy; higher interest rates quickly hit IPP returns.", impact: "neg" },
    ],
    social: [
      { point: "Rising incomes lift air-conditioner ownership and per-capita power use from a low base (~1,400 kWh).", impact: "pos" },
      { point: "Land acquisition and local resistance slow hydro, transmission and large solar parks.", impact: "neg" },
    ],
    technological: [
      { point: "Cheaper LFP cells and bifacial/TOPCon modules keep cutting the cost of firm renewable power.", impact: "pos" },
      { point: "Fast tech change can strand older module and cell lines within a few years.", impact: "neutral" },
    ],
    legal: [
      { point: "ALMM lists for modules and cells and Renewable Consumption Obligations lock in domestic demand.", impact: "pos" },
      { point: "Tariff disputes and change-in-law claims often go to CERC and APTEL, delaying cash flows.", impact: "neutral" },
    ],
    environmental: [
      { point: "Net zero by 2070 and 50% non-fossil capacity by 2030 set a long runway for clean power.", impact: "pos" },
      { point: "Heatwaves, weak monsoons and coal-plant emission norms add operating and compliance risk.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "ntpc", tier: "core", why: "Largest generator; adding coal, renewables (NTPC Green), pumped storage and nuclear." },
    { key: "bhel", tier: "core", why: "Main supplier of coal BTG sets and hydro turbines; record thermal order book." },
    { key: "tataPowerEnergy", tier: "core", why: "Integrated across thermal, renewables, pumped storage and solar cell/module making." },
    { key: "adaniGreenEnergy", tier: "direct", why: "One of India's largest RE IPPs; building the 30 GW Khavda park." },
    { key: "waareeEnergy", tier: "direct", why: "Largest solar module maker; moving into cells as ALMM-II takes effect." },
    { key: "suzlon", tier: "direct", why: "Market leader in wind turbines; hybrid and FDRE tenders lift wind orders." },
    { key: "jswEnergy", tier: "direct", why: "Thermal, hydro, renewables and fast-growing battery storage portfolio." },
    { key: "adaniPower", tier: "direct", why: "Largest private thermal IPP; expanding coal capacity as base-load demand rises." },
    { key: "nhpc", tier: "indirect", why: "Largest hydro PSU with a growing pumped-storage pipeline." },
    { key: "lt", tier: "indirect", why: "EPC for thermal, hydro and transmission; power is a small share of a large group." },
  ],

  companyNews: [
    { key: "bhel", date: "FY25", development: "Booked record order inflows of ~Rs 90,000 Cr+, mostly coal BTG sets.", impact: "Confirms the thermal revival; execution speed is now the bottleneck.", tone: "pos" },
    { key: "jswEnergy", date: "Mar 2025", development: "Completed the ~4.7 GW O2 Power renewable acquisition.", impact: "Shows consolidation in RE IPPs as scale lowers capital costs.", tone: "pos" },
    { key: "adaniGreenEnergy", date: "2025", development: "Operational capacity crossed ~15 GW, led by the Khavda park in Gujarat.", impact: "Giga-scale parks set the cost benchmark for solar and wind tariffs.", tone: "pos" },
    { key: "ntpc", date: "Nov 2024", development: "Listed NTPC Green Energy via a ~Rs 10,000 Cr IPO.", impact: "Gives the PSU leader a separate vehicle to fund 60 GW of RE by 2032.", tone: "pos" },
    { key: "tataPowerEnergy", date: "2024-25", development: "Commissioned its 4.3 GW cell and module plant in Tirunelveli.", impact: "Early domestic cell supply ahead of ALMM-II requirements.", tone: "pos" },
    { key: "waareeEnergy", date: "2025", development: "US launched anti-dumping probes on Indian-origin modules while Waaree expands US output.", impact: "Export margins are at risk; more supply may turn back to India.", tone: "neg" },
  ],

  risks: [
    { risk: "Discom stress and unsigned power-sale agreements", mitigant: "Late-payment rules, RDSS reforms, central PSU offtakers", severity: "high" },
    { risk: "Transmission lag causes RE curtailment", mitigant: "Green Energy Corridors, ISTS build-out, co-located storage", severity: "medium" },
    { risk: "Module overcapacity and export tariffs", mitigant: "ALMM-II cell rule, domestic demand growth", severity: "medium" },
    { risk: "Coal supply, heatwaves or weak monsoon", mitigant: "Record domestic coal output, storage and pumped hydro", severity: "medium" },
  ],
  outlook: {
    bull: "Demand grows 7%+ a year, storage tenders scale fast and India passes ~750-800 GW of capacity by FY30 with domestic cells.",
    base: "Capacity reaches ~700-750 GW by FY30; coal still supplies most energy while solar-plus-storage meets new peaks.",
    bear: "Discom stress and grid delays slow PPA signing, leaving manufacturers with excess capacity and IPPs with idle projects.",
  },
  reading: [
    { title: "India Energy Outlook 2021", source: "International Energy Agency", url: "https://www.iea.org/reports/india-energy-outlook-2021", year: "2021" },
    { title: "Installed capacity reports", source: "Central Electricity Authority", url: "https://cea.nic.in/installed-capacity-report/?lang=en" },
    { title: "India electricity data and insights", source: "Ember", url: "https://ember-energy.org/countries-and-regions/india/" },
    { title: "Ministry of New and Renewable Energy", source: "MNRE", url: "https://mnre.gov.in/" },
  ],
};
