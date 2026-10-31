// Which of NSDL's FPI sectors each of our industries and policies falls in, so picking an industry
// on /updates highlights the sectors its companies are filed under. NSDL uses BSE's 22-sector
// classification (the "Sector" level Screener shows on a company page), named exactly as NSDL prints
// them. An industry can span several (data centres are built by capital-goods, realty and telecom
// companies); the Nifty 50 spans all of them, so it highlights none.
export const NSDL_SECTORS: Record<string, string[]> = {
  nifty50: [],
  ev4w: ["Automobile and Auto Components"],
  semiconductors: ["Capital Goods", "Information Technology"],
  datacenter: ["Capital Goods", "Realty", "Telecommunication"],
  railways: ["Capital Goods"],
  naval: ["Capital Goods"],
  aerospace: ["Capital Goods"],
  telecom5g: ["Telecommunication"],
  solarmodules: ["Power", "Capital Goods"],
  energy: ["Power", "Oil, Gas & Consumable Fuels"],
  realestate: ["Realty", "Construction"],
  pharma: ["Healthcare"],
  semicon2: ["Capital Goods", "Consumer Durables"],
  rareearth: ["Metals & Mining", "Capital Goods"],
  defenceproc: ["Capital Goods"],
  ecms: ["Capital Goods", "Consumer Durables"],
};

/** Shorter names for the narrow sector chart; anything not listed shows as NSDL prints it. */
export const SECTOR_SHORT: Record<string, string> = {
  "Automobile and Auto Components": "Auto",
  "Fast Moving Consumer Goods": "FMCG",
  "Financial Services": "Financials",
  "Information Technology": "IT",
  "Media, Entertainment & Publication": "Media",
  "Oil, Gas & Consumable Fuels": "Oil & gas",
  "Construction Materials": "Constr. materials",
  "Consumer Durables": "Durables",
  "Consumer Services": "Consumer services",
  "Telecommunication": "Telecom",
};
