// Who a bulk or block deal's client is, guessed from the name NSE prints (upper case): a foreign
// institution (FII), a domestic one (DII: mutual funds, insurers, pension and provident funds, Indian
// banks) or anyone else (OTHER: domestic brokers and prop desks, companies, individuals). NSE says
// nothing about the client type, so this is a name match. It is deliberately conservative: a name
// it is unsure of is OTHER, and the FII / DII view only counts what it is confident about.
//
// Order matters: domestic-institution names are checked first ("HSBC MUTUAL FUND" is a DII although
// HSBC is a foreign bank), then foreign brands, then foreign legal forms and places. An Indian legal
// form ("PRIVATE LIMITED", "LLP") beats the weaker foreign hints ("ASIA", a trailing "SA").
import type { PartyType } from "./types";

// Dots and brackets out, everything else that isn't a letter, digit or & to a space, padded with
// spaces so every pattern can match on whole words: "J.P. MORGAN SECURITIES (ASIA) PTE. LTD." becomes
// " JP MORGAN SECURITIES ASIA PTE LTD ".
function normalise(name: string): string {
  const s = name.toUpperCase().replace(/\./g, "").replace(/[^A-Z0-9&]+/g, " ").trim();
  return ` ${s} `;
}

// Domestic institutions.
const DII: RegExp[] = [
  / MUTUAL FUND /,
  / MUTUL FUND /, // NSE's own typo for 360 ONE's fund
  / MF /,
  // AMC trustee companies that hold a fund's units ("NIPPON LIFE INDIA TRUSTEE LTD A/C ...").
  / (NIPPON LIFE INDIA|HDFC|ICICI PRUDENTIAL|SBI|KOTAK MAHINDRA|AXIS|UTI|ADITYA BIRLA SUN ?LIFE|DSP|TATA|MIRAE ASSET|INVESCO|FRANKLIN TEMPLETON|EDELWEISS|MOTILAL OSWAL|PPFAS|QUANT|BANDHAN|CANARA ROBECO|BARODA BNP PARIBAS|HSBC|WHITEOAK CAPITAL|360 ONE|SUNDARAM|LIC) (MUTUAL FUND )?TRUSTEE/,
  / ASSET MANAGEMENT (COMPANY|CO) (LIMITED|LTD) A ?C /,
  // Insurers.
  / LIFE INSURANCE /,
  / GENERAL INSURANCE /,
  / (NEW INDIA|UNITED INDIA|ORIENTAL|NATIONAL) ASSURANCE /,
  / (HDFC ERGO|ICICI LOMBARD|BAJAJ ALLIANZ|TATA AIG|SBI GENERAL|STAR HEALTH) /,
  // Pension and provident funds.
  / EMPLOYEES PROVIDENT FUND /,
  / EPFO /,
  / NPS TRUST /,
  / NATIONAL PENSION SYSTEM /,
  / (SBI|UTI|LIC|HDFC|ICICI PRUDENTIAL|KOTAK MAHINDRA|ADITYA BIRLA SUN ?LIFE|TATA|AXIS|DSP|MAX LIFE) PENSION /,
  // Indian banks trading for their own book.
  / (STATE BANK OF INDIA|HDFC BANK|ICICI BANK|AXIS BANK|KOTAK MAHINDRA BANK|INDUSIND BANK|YES BANK|IDFC FIRST BANK|IDBI BANK|BANK OF BARODA|BANK OF INDIA|BANK OF MAHARASHTRA|PUNJAB NATIONAL BANK|CANARA BANK|UNION BANK OF INDIA|INDIAN OVERSEAS BANK|CENTRAL BANK OF INDIA|UCO BANK|PUNJAB & SIND BANK|INDIAN BANK|FEDERAL BANK|RBL BANK|BANDHAN BANK|KARUR VYSYA BANK|SOUTH INDIAN BANK|CITY UNION BANK|KARNATAKA BANK) (LIMITED |LTD )?$/,
  / SMALL FINANCE BANK (LIMITED|LTD) $/,
];

// Foreign banks, brokers, asset managers and sovereign funds, by name.
const FII_BRANDS: RegExp[] = [
  / GOLDMAN SACHS /,
  / MORGAN STANLEY /,
  / SOCIETE GENERALE /,
  / BNP PARIBAS /,
  / CITIGROUP /,
  / CITIBANK /,
  / J ?P ?MORGAN /,
  / BOFA /,
  / BANK OF AMERICA /,
  / MERRILL LYNCH /,
  / NOMURA /,
  / UBS /,
  / CLSA /,
  / BARCLAYS /,
  / HSBC /,
  / HONGKONG AND SHANGHAI BANKING /,
  / CREDIT SUISSE /,
  / DEUTSCHE /,
  / MACQUARIE /,
  / VANGUARD /,
  / BLACKROCK /,
  / FIDELITY /,
  / ABU DHABI INVESTMENT AUTHORITY /,
  / KUWAIT INVESTMENT AUTHORITY /,
  / GOVERNMENT OF SINGAPORE /,
  / MONETARY AUTHORITY OF SINGAPORE /,
  / NORGES /,
  / T ROWE PRICE /,
  / FRANKLIN TEMPLETON INVESTMENT FUNDS /,
];

// Foreign legal forms and places that settle it even next to "LIMITED".
const FII_STRONG: RegExp[] = [
  / SINGAPORE /,
  / MAURITIUS /,
  / CAYMAN /,
  / LUXEMBOURG /,
  / IRELAND /,
  / PTE /,
  / PLC /,
  / LLC /,
  / LP /,
  / LIMITED PARTNERSHIP /,
  / BV /,
  / GMBH /,
  / SICAV /,
  / ICAV /,
  / UCITS /,
  / PCC /,
  / VCC /, // a Singapore variable capital company
  / INC /,
  / INCORPORATED /,
  / IFSC /, // GIFT City funds invest as FPIs
  / MASTER FUND /,
];

// Weaker hints, only when the name carries no Indian legal form.
const FII_WEAK: RegExp[] = [/ ASIA /, / EUROPE /, / (SA|SE|AG|NV|APS) $/];

// Indian company forms: a domestic broker, prop desk or company unless a strong foreign mark says otherwise.
const INDIAN_FORM = / (PRIVATE LIMITED|PRIVATE LTD|PVT LIMITED|PVT LTD|LLP|SHARE BROKERS?|HUF) /;

/** FII, DII or OTHER for a deal's client name; OTHER when unsure. */
export function classifyParty(clientName: string): PartyType {
  const n = normalise(clientName);
  if (n.trim() === "") return "OTHER";
  if (DII.some((re) => re.test(n))) return "DII";
  if (FII_BRANDS.some((re) => re.test(n))) return "FII";
  if (FII_STRONG.some((re) => re.test(n))) return "FII";
  if (INDIAN_FORM.test(n)) return "OTHER";
  if (FII_WEAK.some((re) => re.test(n))) return "FII";
  return "OTHER";
}
