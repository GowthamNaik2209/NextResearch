import assert from "node:assert/strict";
import { before, afterEach, test } from "node:test";
import { cleanSource, feedCompanies, formatNewsDate, getCompanyNews, getLatestNews, isAbout, isListHeadline, parseGoogleNewsRss } from "./news";
import { newsAgeLabel } from "./news-date";
import { listCompanyMetrics } from "@/lib/sector-content/insights";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";

// Company figures come from the database (DATABASE_URL), as in the app.
before(installFinancialsFromDatabase);

const NOW = Date.parse("2026-10-13T12:00:00Z");
const item = (title: string, source: string, pub: string, link = "https://news.google.com/rss/articles/X") =>
  `<item><title>${title}</title><link>${link}</link><pubDate>${pub}</pubDate><source url="https://x.test">${source}</source></item>`;
const rss = (...items: string[]) => `<?xml version="1.0"?><rss><channel>${items.join("")}</channel></rss>`;

test("parseGoogleNewsRss strips the ' - Source' suffix, decodes entities and sorts newest first", () => {
  const xml = rss(
    item("Old story - Mint", "Mint", "Mon, 05 Oct 2026 10:00:00 GMT"),
    item("Voltas &amp; Blue Star: Q2 &#39;beat&#39; - Business Standard", "Business Standard", "Mon, 12 Oct 2026 09:00:00 GMT"),
  );
  const [first, second] = parseGoogleNewsRss(xml, NOW);
  assert.equal(first.headline, "Voltas & Blue Star: Q2 'beat'");
  assert.equal(first.source, "Business Standard");
  assert.equal(second.headline, "Old story");
});

test("parseGoogleNewsRss drops price-prediction spam, future-dated and malformed items", () => {
  const xml = rss(
    item("VOLTAS Forecast — Price Target — Prediction for 2027 - TradingView", "TradingView", "Mon, 12 Oct 2026 09:00:00 GMT"),
    item("Stocks to Watch for October 14: Tata Elxsi, BEL, Adani - Mint", "Mint", "Mon, 12 Oct 2026 09:30:00 GMT"),
    item("Sumeet Bagadia's top 3 stocks to buy: HDFC Life, CG Power - Livemint", "Livemint", "Mon, 12 Oct 2026 09:40:00 GMT"),
    item("From the future - Mint", "Mint", "Mon, 01 Jan 2029 09:00:00 GMT"),
    item("No date - Mint", "Mint", "not a date"),
    "<item><title>No link</title></item>",
    item("Real news - Mint", "Mint", "Mon, 12 Oct 2026 08:00:00 GMT"),
  );
  assert.deepEqual(parseGoogleNewsRss(xml, NOW).map((h) => h.headline), ["Real news"]);
});

test("formatNewsDate is relative for today and absolute afterwards", () => {
  assert.equal(formatNewsDate(NOW - 20 * 60_000, NOW), "Just now");
  // (Not exactly 5h: NOW - 5h is 07:00:00 GMT, the date-only stamp tested below.)
  assert.equal(formatNewsDate(NOW - 5 * 3_600_000 - 60_000, NOW), "5h ago");
  assert.match(formatNewsDate(Date.parse("2026-10-02T00:00:00Z"), NOW), /^2 Oct 2026$/);
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("getCompanyNews returns live headlines tagged with the company and sector", async () => {
  globalThis.fetch = (async () => ({ ok: true, text: async () => rss(item("CG Power wins big order - Mint", "Mint", new Date().toUTCString())) }) as Response) as typeof fetch;
  const r = await getCompanyNews("CGPOWER");
  assert.equal(r.live, true);
  assert.equal(r.items[0].headline, "CG Power wins big order");
  assert.equal(r.items[0].ticker, "CGPOWER");
  assert.ok(r.items[0].sectorName);
});

test("the news query drops a bracketed part of the name, which no headline quotes", async () => {
  let url = "";
  globalThis.fetch = (async (u: string) => {
    url = decodeURIComponent(String(u));
    return { ok: true, text: async () => rss(item("Horizon Industrial Parks leases 1 msf - Mint", "Mint", new Date().toUTCString())) } as Response;
  }) as typeof fetch;
  await getCompanyNews("HORIZONIND");
  assert.ok(url.includes('"Horizon Industrial Parks" ('), url);
  assert.ok(!url.includes("Blackstone"), url);
});

test("news falls back to the curated seed set when the live feed is down", async () => {
  globalThis.fetch = (async () => ({ ok: false, text: async () => "" }) as Response) as typeof fetch;
  const company = await getCompanyNews("MOTHERSON");
  assert.equal(company.live, false);
  assert.ok(company.items.length > 0, "curated headlines exist for flagship names");
  const feed = await getLatestNews({ limit: 5 });
  assert.equal(feed.live, false);
  assert.ok(feed.items.length > 0);
});

test("a failed fetch falls back to curated news and is only remembered briefly", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return calls === 1 ? ({ ok: false, text: async () => "" } as Response) : ({ ok: true, text: async () => rss(item("Uno Minda wins order - Mint", "Mint", new Date().toUTCString())) } as Response);
  }) as typeof fetch;
  assert.equal((await getCompanyNews("UNOMINDA")).live, false);
  // Within the (short) failure window the fallback is served without hitting the upstream again.
  assert.equal((await getCompanyNews("UNOMINDA")).live, false);
  assert.equal(calls, 1, "the failure window prevents hammering the upstream");
});

test("isAbout keeps headlines about the company and drops market wraps that merely list it", () => {
  const cg = { name: "CG Power & Industrial Solutions", ticker: "CGPOWER" };
  assert.ok(isAbout("CG Power shares: Analyst says book profit on rallies", cg));
  assert.ok(isAbout("CGPOWER hits 52-week high", cg));
  assert.ok(!isAbout("Sensex Advances 0.85% Led by IT and Large Caps; Mixed Sector Performance", cg));
  const motherson = { name: "Samvardhana Motherson International", ticker: "MOTHERSON" };
  assert.ok(isAbout("Motherson arm gets nod to acquire 50.1% stake", motherson), "a single distinctive word is enough");
  const bf = { name: "Bharat Forge", ticker: "BHARATFORG" };
  assert.ok(!isAbout("Bharat Heavy Electricals bags order", bf), "'Bharat' alone does not identify Bharat Forge");
  assert.ok(isAbout("Bharat Forge shares gain 4% as Rs 2,000 crore QIP opens", bf));
});

test("isAbout does not credit a group's flagship with its siblings' news", () => {
  const mm = { name: "Mahindra & Mahindra", ticker: "M&M" };
  assert.ok(!isAbout("Mahindra Holidays accepts Rohit Malik resignation effective Oct 31", mm));
  assert.ok(!isAbout("Mahindra Lifespace Developers shares jump on new project launch", mm));
  assert.ok(!isAbout("Tech Mahindra Q2 results: net profit rises 12%", mm));
  assert.ok(!isAbout("Mahindra & Mahindra Financial Services disbursements grow 8%", mm));
  assert.ok(!isAbout("M&M Financial Services Q2 profit up", mm));
  assert.ok(isAbout("Mahindra & Mahindra Q2 results: profit beats estimates", mm));
  assert.ok(isAbout("M&M shares hit record high on strong SUV sales", mm));
  assert.ok(isAbout("Mahindra launches XUV 7XO at Rs 13.66 lakh", mm), "'Mahindra' alone still means M&M");
  assert.ok(isAbout("Tech Mahindra and M&M lead Nifty gainers", mm), "a sibling elsewhere in the headline does not hide M&M");
});

test("isAbout tells apart companies that share a group or a word in their names", () => {
  const motherson = { name: "Samvardhana Motherson International", ticker: "MOTHERSON" };
  assert.ok(!isAbout("Motherson Sumi Wiring India Q2 profit rises 10%", motherson));
  const msumi = { name: "Motherson Sumi Wiring India", ticker: "MSUMI" };
  assert.ok(isAbout("Motherson Sumi Wiring India Q2 profit rises 10%", msumi));

  const kirlosEng = { name: "Kirloskar Oil Engines", ticker: "KIRLOSENG" };
  assert.ok(!isAbout("Kirloskar Brothers bags Rs 300 crore pump order", kirlosEng));
  assert.ok(!isAbout("Kirloskar Ferrous shares rally", kirlosEng));
  assert.ok(isAbout("Kirloskar Oil Engines Q2 net profit up 18%", kirlosEng));

  const rk = { name: "Ramkrishna Forgings", ticker: "RKFORGE" };
  const sona = { name: "Sona BLW Precision Forgings", ticker: "SONACOMS" };
  assert.ok(isAbout("Ramkrishna Forgings wins export order", rk));
  assert.ok(!isAbout("Ramkrishna Forgings wins export order", sona), "a shared 'Forgings' is not enough");

  const tataPower = { name: "Tata Power", ticker: "TATAPOWER" };
  assert.ok(!isAbout("Tata Steel output rises 6% in Q2", tataPower));
  assert.ok(isAbout("Tata Power commissions 300 MW solar plant", tataPower));
  const tmpv = { name: "Tata Motors Passenger Vehicles", ticker: "TMPV" };
  assert.ok(isAbout("Tata Motors PV sales rise 12% in September", tmpv));
  assert.ok(!isAbout("Tata Motors Commercial Vehicles Q2 volumes dip", tmpv));

  const adaniEnt = { name: "Adani Enterprises", ticker: "ADANIENT" };
  assert.ok(!isAbout("Adani Ports cargo volumes hit record", adaniEnt));
  assert.ok(!isAbout("Adani Green Energy commissions Khavda capacity", adaniEnt));
  assert.ok(isAbout("Adani Enterprises QIP opens today", adaniEnt));

  const bajajAuto = { name: "Bajaj Auto", ticker: "BAJAJ-AUTO" };
  assert.ok(!isAbout("Bajaj Finance AUM grows 25%", bajajAuto));
  assert.ok(isAbout("Bajaj Auto sales up 8% in September", bajajAuto));

  const hal = { name: "Hindustan Aeronautics", ticker: "HAL" };
  assert.ok(!isAbout("Hindustan Unilever Q2 volume growth at 4%", hal));
  assert.ok(isAbout("HAL bags Rs 62,000 crore order for 97 Tejas jets", hal));

  const siemens = { name: "Siemens Ltd", ticker: "SIEMENS" };
  assert.ok(!isAbout("Siemens Energy India shares surge on debut", siemens));
  assert.ok(isAbout("Siemens shares fall after Q2 miss", siemens));
});

test("isAbout matches the short names and spellings headlines actually use", () => {
  const taril = { name: "Transformers & Rectifiers (India)", ticker: "TARIL" };
  assert.ok(isAbout("Transformers and Rectifiers share price jumps 14% after Q2 profit surges", taril));
  assert.ok(!isAbout("Power transformers demand to double by 2030", taril));
  const stl = { name: "Sterlite Technologies", ticker: "STLTECH" };
  assert.ok(isAbout("Sterlite Tech shares gain 5% as arm wins $1.2 billion supply agreement", stl));
  assert.ok(!isAbout("Sterlite Power wins transmission project", stl));
});

test("isAbout handles pharma names: short forms, group siblings and the Sun/SPARC overlap", () => {
  const sun = { name: "Sun Pharmaceutical Industries", ticker: "SUNPHARMA" };
  const sparc = { name: "SPARC (Sun Pharma Advanced Research Company)", ticker: "SPARC" };
  assert.ok(isAbout("Sun Pharma Q2 results: profit rises 12% on specialty sales", sun));
  assert.ok(!isAbout("Sun Pharma Q2 results: profit rises 12% on specialty sales", sparc), "Sun's news is not SPARC's");
  assert.ok(!isAbout("Sun Pharma Advanced Research shares surge on licensing deal", sun));
  assert.ok(isAbout("SPARC shares surge on licensing deal", sparc));
  const torrent = { name: "Torrent Pharmaceuticals", ticker: "TORNTPHARM" };
  assert.ok(isAbout("Torrent Pharma completes JB Chemicals merger", torrent));
  assert.ok(!isAbout("Torrent Power wins 1 GW pumped storage contract", torrent));
  const zydus = { name: "Zydus Lifesciences", ticker: "ZYDUSLIFE" };
  assert.ok(isAbout("Zydus gets USFDA nod for generic drug", zydus));
  assert.ok(!isAbout("Zydus Wellness Q2 volumes rise", zydus));
  const drl = { name: "Dr Reddy's Laboratories", ticker: "DRREDDY" };
  assert.ok(isAbout("Dr. Reddy's Q1 profit beats estimates", drl));
  assert.ok(isAbout("Dr Reddys launches semaglutide in Canada", drl));
  const aartiDrugs = { name: "Aarti Drugs", ticker: "AARTIDRUGS" };
  assert.ok(!isAbout("Aarti Industries shares fall 5%", aartiDrugs));
  assert.ok(!isAbout("Aarti Pharmalabs commissions new API block", aartiDrugs));
});

test("isAbout handles real estate names: REITs, short forms and look-alike words", () => {
  const lodha = { name: "Lodha Developers (Macrotech)", ticker: "LODHA" };
  assert.ok(isAbout("Lodha pre-sales rise 14% in Q2", lodha));
  assert.ok(isAbout("Macrotech Developers raises Rs 3,000 crore via QIP", lodha));
  const embassy = { name: "Embassy Office Parks REIT", ticker: "EMBASSY" };
  assert.ok(isAbout("Embassy REIT leases 1 msf in Bengaluru", embassy));
  assert.ok(!isAbout("US Embassy issues visa advisory", embassy));
  assert.ok(!isAbout("Embassy Developments shares jump 8%", embassy));
  const supreme = { name: "Supreme Industries", ticker: "SUPREMEIND" };
  assert.ok(!isAbout("Supreme Court reserves verdict on builder insolvency case", supreme));
  assert.ok(isAbout("Supreme Industries Q2 pipe volumes up 9%", supreme));
  const sbi = { name: "State Bank of India", ticker: "SBIN" };
  assert.ok(isAbout("SBI cuts home loan rates by 25 bps", sbi));
  assert.ok(!isAbout("SBI Life Q2 VNB margin expands", sbi));
  const finpipe = { name: "Finolex Industries", ticker: "FINPIPE" };
  assert.ok(!isAbout("Finolex Cables wins telecom order", finpipe));
  const mm = { name: "Mahindra & Mahindra", ticker: "M&M" };
  assert.ok(!isAbout("Mahindra Lifespace launches Rs 1,200 crore project in Pune", mm));
});

test("isAbout handles Nifty 50 names: banks and their group companies, the exchange, look-alikes", () => {
  const hdfc = { name: "HDFC Bank", ticker: "HDFCBANK" };
  assert.ok(isAbout("HDFC Bank Q2 profit rises 11%", hdfc));
  assert.ok(!isAbout("HDFC Life Q2 VNB margin expands", hdfc));
  assert.ok(!isAbout("HDFC AMC shares hit record high", hdfc));
  const kotak = { name: "Kotak Mahindra Bank", ticker: "KOTAKBANK" };
  assert.ok(isAbout("Kotak Bank shares jump after Q2 beat", kotak));
  const mm = { name: "Mahindra & Mahindra", ticker: "M&M" };
  assert.ok(!isAbout("Kotak Mahindra Bank shares jump after Q2 beat", mm), "Kotak Mahindra Bank is not M&M");
  const ril = { name: "Reliance Industries", ticker: "RELIANCE" };
  assert.ok(isAbout("Reliance shares rise as Jio tariff hike kicks in", ril));
  assert.ok(isAbout("RIL Q2 results: profit beats estimates", ril));
  assert.ok(!isAbout("Reliance Power shares hit upper circuit", ril));
  assert.ok(!isAbout("Reliance Infrastructure wins arbitration award", ril));
  const bse = { name: "BSE", ticker: "BSE" };
  assert.ok(isAbout("BSE shares surge 8% on record F&O volumes", bse));
  assert.ok(!isAbout("Sensex jumps 600 points as banks rally", bse));
  assert.ok(!isAbout("BSE Sensex ends higher led by IT stocks", bse));
  const indigo = { name: "InterGlobe Aviation (IndiGo)", ticker: "INDIGO" };
  assert.ok(isAbout("IndiGo adds 10 new international routes", indigo));
  assert.ok(!isAbout("Indigo Paints Q2 revenue up 7%", indigo));
  const eternal = { name: "Eternal (Zomato)", ticker: "ETERNAL" };
  assert.ok(isAbout("Zomato parent Eternal's Q2 profit jumps", eternal));
  assert.ok(isAbout("Blinkit adds 300 dark stores in Q2", eternal));
  const hul = { name: "Hindustan Unilever", ticker: "HINDUNILVR" };
  assert.ok(isAbout("HUL Q2 volume growth at 4%", hul));
  assert.ok(!isAbout("Unilever plc names new CEO", hul));
  const itc = { name: "ITC", ticker: "ITC" };
  assert.ok(isAbout("ITC Q2 cigarette volumes grow 6%", itc));
  assert.ok(!isAbout("ITC Hotels Q2 RevPAR rises 12%", itc));
  const bajfin = { name: "Bajaj Finance", ticker: "BAJFINANCE" };
  assert.ok(isAbout("Bajaj Finance AUM grows 25%", bajfin));
  assert.ok(!isAbout("Bajaj Housing Finance Q2 profit up 20%", bajfin));
});

test("isAbout handles the solar and energy listings: look-alike names and parent companies", () => {
  const juniper = { name: "Juniper Green Energy", ticker: "JNPR" };
  assert.ok(isAbout("Juniper Green Energy shares rise after 300 MW hybrid order", juniper));
  assert.ok(!isAbout("Juniper Networks unveils AI-native routers", juniper));
  const ntpcGreen = { name: "NTPC Green Energy", ticker: "NTPCGREEN" };
  const ntpc = { name: "NTPC", ticker: "NTPC" };
  assert.ok(isAbout("NTPC Green Q2 profit jumps 40%", ntpcGreen));
  assert.ok(!isAbout("NTPC Green Q2 profit jumps 40%", ntpc), "NTPC Green's news is not NTPC's");
  const waareeRtl = { name: "Waaree Renewable Technologies", ticker: "WAAREERTL" };
  const waaree = { name: "Waaree Energies", ticker: "WAAREEENER" };
  assert.ok(isAbout("Waaree Renewable Technologies bags ₹800 crore EPC order", waareeRtl));
  assert.ok(!isAbout("Waaree Renewable Technologies bags ₹800 crore EPC order", waaree));
  assert.ok(isAbout("Waaree RTL wins five-year O&M order for 360 MWp solar project", waareeRtl));
  assert.ok(!isAbout("Waaree RTL wins five-year O&M order for 360 MWp solar project", waaree), "Waaree RTL is not Waaree Energies");
  const emmvee = { name: "Emmvee Photovoltaic Power", ticker: "EMMVEE" };
  assert.ok(isAbout("Emmvee shares surge on TOPCon cell expansion", emmvee));
  assert.ok(!isAbout("India's photovoltaic imports fall 20% in Q2", emmvee), "'photovoltaic' alone is not Emmvee");
  const cleanmax = { name: "Clean Max Enviro Energy Solutions", ticker: "CLEANMAX" };
  assert.ok(isAbout("CleanMax signs 150 MW PPA with data centre operator", cleanmax));
  const utl = { name: "Fujiyama Power Systems (UTL Solar)", ticker: "UTLSOLAR" };
  assert.ok(isAbout("Fujiyama Power Q2 results: profit doubles", utl));
  assert.ok(isAbout("UTL Solar launches new hybrid inverter range", utl));
  const jio = { name: "Jio Platforms", ticker: "JPL" };
  assert.ok(isAbout("Jio Platforms shares extend gains after listing", jio));
  assert.ok(isAbout("Jio adds 3 million subscribers in September", jio));
  assert.ok(!isAbout("Jio Financial Services Q2 profit rises", jio));
  assert.ok(!isAbout("Streaming platforms see record IPL viewership", jio), "'platforms' alone is not Jio");
  const horizon = { name: "Horizon Industrial Parks (Blackstone)", ticker: "HORIZONIND" };
  assert.ok(isAbout("Horizon Industrial Parks leases 1 msf to 3PL firm", horizon));
  assert.ok(!isAbout("A new horizon for India's warehousing market", horizon));
});

test("cleanSource shows a bare domain when Google gives a URL as the publisher", () => {
  assert.equal(cleanSource("https://www.siam.in/"), "siam.in");
  assert.equal(cleanSource("www.nseindia.com"), "nseindia.com");
  assert.equal(cleanSource("Business Standard"), "Business Standard");
  assert.equal(cleanSource("Moneycontrol.com"), "moneycontrol.com");
  const xml = rss(`<item><title>SIAM data: PV sales up 4% - https://www.siam.in/</title><link>https://x.test/a</link><pubDate>Mon, 12 Oct 2026 09:00:00 GMT</pubDate><source url="https://www.siam.in/">https://www.siam.in/</source></item>`);
  const [h] = parseGoogleNewsRss(xml, NOW);
  assert.equal(h.source, "siam.in");
  assert.equal(h.headline, "SIAM data: PV sales up 4%");
});

test("quote/profile pages and multi-company round-ups are dropped as noise", () => {
  const pub = "Mon, 12 Oct 2026 09:00:00 GMT";
  const xml = rss(
    item("Tata Motors Limited (TMCV.NS) Stock Price, News, Quote & History - Yahoo Finance", "Yahoo Finance", pub),
    item("NHPC Share Price Live Today - Economic Times", "Economic Times", pub),
    item("Q2 results today: DLF, Tata Elxsi, Indus Towers and more - Mint", "Mint", pub),
    item("Stocks in news: Lodha, Embassy REIT, Havells - Moneycontrol", "Moneycontrol", pub),
    item("DLF share price jumps 5% after strong Q2 bookings - Mint", "Mint", pub),
  );
  assert.deepEqual(parseGoogleNewsRss(xml, NOW).map((h) => h.headline), ["DLF share price jumps 5% after strong Q2 bookings"]);
  assert.ok(!isListHeadline("Lodha Q2: pre-sales up 14%, collections rise, debt falls"), "a story with commas is not a list");
  assert.ok(!isListHeadline("Voltas, Blue Star, Havells shares rally as heatwave lifts AC demand"));
  assert.ok(isListHeadline("Q2 results: DLF, Havells, KEI Industries, Polycab"));
  assert.ok(isListHeadline("Q2 results, October 16: DLF, PNB, LTM, Bajaj Housing Finance, Federal Bank, Urban Company, others to post earnings"));
  assert.ok(isListHeadline("Stocks Under F&O Ban: Ambuja Cements, and Others"));
  const spam = rss(item("Bagmane Prime Office REIT Dividend 2026: ₹1.50 & History - INDmoney", "INDmoney", pub), item("DLF Ltd. is Rated Sell by MarketsMOJO - MarketsMojo", "MarketsMojo", pub));
  assert.deepEqual(parseGoogleNewsRss(spam, NOW), []);
});

test("Tata Motors commercial-vehicle news is not credited to TMPV", () => {
  const tmpv = { name: "Tata Motors Passenger Vehicles", ticker: "TMPV" };
  assert.ok(!isAbout("Tata Motors Limited (TMCV.NS) shares rise on truck demand", tmpv));
  assert.ok(!isAbout("Tata Motors commercial vehicle sales rise 9% in September", tmpv));
  assert.ok(!isAbout("TMCV Q2 results: profit up 12%", tmpv));
  assert.ok(isAbout("Tata Motors PV sales rise 12% in September", tmpv));
  assert.ok(isAbout("TMPV launches Sierra EV", tmpv));
});

test("a sector feed is led by the sector's own players (developers/REITs for real estate)", () => {
  const re = listCompanyMetrics().filter((c) => c.sectorSlug === "realestate");
  const picked = feedCompanies("realestate", re, 12).map((c) => c.ticker);
  assert.equal(picked.length, 12);
  const lead = picked.slice(0, 9);
  for (const t of ["DLF", "LODHA", "PHOENIXLTD", "PRESTIGE", "OBEROIRLTY"]) assert.ok(lead.includes(t), `${t} leads the feed`);
  for (const t of ["ULTRACEMCO", "ASIANPAINT", "HAVELLS", "JSWSTEEL", "AMBUJACEM"]) assert.ok(!lead.includes(t), `${t} is not in the core slots`);
  // Sectors without owner/operator data still get their biggest central names.
  const pharma = listCompanyMetrics().filter((c) => c.sectorSlug === "pharma");
  assert.equal(feedCompanies("pharma", pharma, 5).length, 5);
});

test("stamps without a real time (Google's 07:00 GMT, curated midnights) show the date, never 'Just now'", () => {
  const googleDateOnly = Date.parse("2026-10-13T07:00:00Z");
  assert.equal(formatNewsDate(googleDateOnly, googleDateOnly + 20 * 60_000), "13 Oct 2026");
  assert.equal(formatNewsDate(Date.parse("2026-10-13T00:00:00Z"), NOW), "13 Oct 2026");
  assert.equal(newsAgeLabel("Just now", googleDateOnly, googleDateOnly + 60_000), "13 Oct 2026");
  assert.equal(formatNewsDate(Date.parse("2026-10-13T07:00:12Z"), NOW), "4h ago", "a real 07:00:12 stamp stays relative");
});

test("headline ages are recomputed on the viewer's clock, curated month-only dates are kept", () => {
  const ts = NOW - 30 * 60_000;
  assert.equal(newsAgeLabel("3h ago", ts, NOW), "Just now", "a stale cached label is replaced");
  assert.equal(newsAgeLabel("Just now", NOW - 5 * 3_600_000 - 60_000, NOW), "5h ago");
  assert.equal(newsAgeLabel("Mar 2026", Date.parse("2026-03-01"), NOW), "Mar 2026");
  assert.equal(newsAgeLabel("5h ago", NOW - 30 * 3_600_000, NOW), formatNewsDate(NOW - 30 * 3_600_000, NOW));
});

test("one story from several outlets counts once; Iveco/target-price items are not TMPV or company news", async () => {
  const { sameStory, isAbout: about, parseGoogleNewsRss: parse } = await import("./news");
  const t = Date.parse("2026-10-15T10:00:00Z");
  assert.ok(sameStory({ ticker: "DLF", headline: "DLF Q2 profit rises 15% on strong bookings", ts: t }, { ticker: "DLF", headline: "DLF Q2 Results: net profit up 15% YoY", ts: t + 3_600_000 }));
  assert.ok(!sameStory({ ticker: "DLF", headline: "DLF Q2 profit rises 15%", ts: t }, { ticker: "OBEROIRLTY", headline: "Oberoi Realty Q2 profit rises", ts: t }));
  assert.ok(!sameStory({ ticker: "DLF", headline: "DLF launches luxury project in Gurugram", ts: t }, { ticker: "DLF", headline: "DLF Q2 profit rises 15%", ts: t }));
  const tmpv = { name: "Tata Motors Passenger Vehicles", ticker: "TMPV" };
  assert.ok(!about("Iveco Group shareholders approve Tata Motors' takeover proposals", tmpv));
  const rss = `<rss><channel><item><title>Asian Paints target price raised by brokerage - X</title><link>https://x</link><pubDate>Wed, 14 Oct 2026 10:00:00 GMT</pubDate><source>X</source></item><item><title>Tata Motors stock rises 3.08 percent at a 36.64 price-to-earnings ratio - Y</title><link>https://y</link><pubDate>Wed, 14 Oct 2026 10:00:00 GMT</pubDate><source>Y</source></item></channel></rss>`;
  assert.equal(parse(rss, Date.parse("2026-10-16T00:00:00Z")).length, 0);
});

// The four policies added Oct 2026 brought names that are also ordinary words or share a
// family name with companies we don't cover.
test("isAbout handles the Oct 2026 policy companies' look-alikes", () => {
  const cases: [string, string, string, boolean][] = [
    ["Coal India Q2 profit rises 12%", "Coal India", "COALINDIA", true],
    ["20 Microns bids for rare-earth magnet scheme", "20 Microns", "20MICRONS", true],
    ["GMDC shares jump on rare earth plan", "Gujarat Mineral Development Corporation (GMDC)", "GMDCLTD", true],
    ["Gujarat Mineral Development Corporation Q2 results", "Gujarat Mineral Development Corporation (GMDC)", "GMDCLTD", true],
    ["Midwest Ltd shares surge after listing", "Midwest Ltd", "MIDWESTLTD", true],
    ["Midwest Energy wins solar contract", "Midwest Ltd", "MIDWESTLTD", false],
    ["Bajaj Auto October sales up 8%", "Bajaj Auto", "BAJAJ-AUTO", true],
    ["Bajaj Finance Q2 results beat estimates", "Bajaj Auto", "BAJAJ-AUTO", false],
    ["Bajaj Auto Credit raises Rs 500 crore", "Bajaj Auto", "BAJAJ-AUTO", false],
    ["TVS Motor launches new electric scooter", "TVS Motor", "TVSMOTOR", true],
    ["TVS Srichakra Q2 profit falls", "TVS Motor", "TVSMOTOR", false],
    ["TVS Supply Chain shares slide", "TVS Motor", "TVSMOTOR", false],
    ["Ola Electric shares hit record low", "Ola Electric", "OLAELEC", true],
    ["Ola cab fares rise in Bengaluru", "Ola Electric", "OLAELEC", false],
    ["Krutrim cuts jobs as Ola's AI unit shrinks", "Ola Electric", "OLAELEC", false],
    ["Amber Enterprises gets ECMS nod for PCB plant", "Amber Enterprises India", "AMBER", true],
    ["IMD issues amber alert for Mumbai", "Amber Enterprises India", "AMBER", false],
    ["Hindalco Q2 profit beats estimates", "Hindalco Industries", "HINDALCO", true],
    ["Jyoti CNC Automation order book swells", "Jyoti CNC Automation", "JYOTICNC", true],
    ["Jyoti Structures wins Rs 300 crore order", "Jyoti CNC Automation", "JYOTICNC", false],
    ["PCBL Chemical Q2 results", "PCBL Chemical", "PCBL", true],
    ["Acutaas Chemicals shares rally", "Acutaas Chemicals", "ACUTAAS", true],
    ["BPL Ltd shares surge 10%", "BPL", "BPL", true],
    ["BPL card holders to get free rations", "BPL", "BPL", false],
    ["Ashok Leyland bags army truck order", "Ashok Leyland", "ASHOKLEY", true],
    ["Hinduja Leyland Finance raises Rs 500 crore", "Ashok Leyland", "ASHOKLEY", false],
    ["PG Electroplast shares jump on MPMS nod", "PG Electroplast", "PGEL", true],
    ["Archean Chemical arm SiCSem breaks ground", "Archean Chemical Industries", "ACI", true],
    ["ACI Worldwide results beat estimates", "Archean Chemical Industries", "ACI", false],
    ["Minda Corp shares rise on ECMS approval", "Minda Corporation", "MINDACORP", true],
    ["Spark Minda gets camera module approval", "Minda Corporation", "MINDACORP", true],
    ["Uno Minda Q2 profit rises", "Minda Corporation", "MINDACORP", false],
    ["Kalyani Strategic Systems bags artillery order", "Bharat Forge (Kalyani Strategic Systems)", "BHARATFORG", true],
    ["Kalyani Steels Q2 results", "Bharat Forge (Kalyani Strategic Systems)", "BHARATFORG", false],
    ["Cyient DLM Q2 profit rises", "Cyient Ltd", "CYIENT", false],
    ["ASM International orders surge", "ASM Technologies", "ASMTEC", false],
    ["CG Semi starts pilot line at Sanand", "CG Power & Industrial Solutions", "CGPOWER", true],
    ["Kaynes Semicon ships first chips", "Kaynes Technology", "KAYNES", true],
    ["US Midwest farmers brace for drought", "Midwest Ltd", "MIDWESTLTD", false],
    ["NMDC Steel posts Q2 loss", "NMDC", "NMDC", false],
    ["NMDC raises iron ore prices", "NMDC", "NMDC", true],
    ["TVS Holdings Q2 results", "TVS Motor", "TVSMOTOR", false],
    ["Coal India arm BCCL IPO opens", "Coal India", "COALINDIA", true],
    ["Ola Cabs to cut drivers' commission", "Ola Electric", "OLAELEC", false],
  ];
  for (const [h, name, ticker, want] of cases) assert.equal(isAbout(h, { name, ticker }), want, `${ticker}: ${h}`);
});

test("headlines about a namesake, a sister listing or many stocks at once are left out (Oct 2026 QA)", () => {
  assert.equal(isAbout("CPM Pushes TVK Govt To Release Muslim Prisoners, Free Pricol Life Convicts", { name: "Pricol Ltd", ticker: "PRICOLLTD" }), false);
  assert.equal(isAbout("Pricol Q2 profit rises 18% on two-wheeler demand", { name: "Pricol Ltd", ticker: "PRICOLLTD" }), true);
  assert.equal(isAbout("French billionaire Xavier Niel gets CCI approval to acquire 16.2% stake in Vodafone", { name: "Vodafone Idea Ltd", ticker: "IDEA" }), false);
  assert.equal(isAbout("NTPC Green Energy discloses Q2FY27 results", { name: "NTPC Ltd", ticker: "NTPC" }), false);
  assert.equal(isListHeadline("Rs 235 Dividend, 1 Bonus Issue, 2 Stock Split: 34 stocks to trade ex-date this week"), true);
  assert.equal(isListHeadline("TCS, Trent, Bharti Airtel, BSE: 8 NIFTY50 stocks that delivered more than 10% returns in October"), true);
  const rss = `<rss><channel><item><title>Pricol Dividend History: Last ₹2.00, Yield &amp; Record Dates - Site</title><link>https://example.com/a</link><pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate><source>Site</source></item></channel></rss>`;
  assert.deepEqual(parseGoogleNewsRss(rss, Date.parse("2026-10-31T00:00:00Z")), []);
});

test("a company named after an everyday word needs its business around the word (Skipper, Supreme, Eternal)", () => {
  const skipper = { name: "Skipper", ticker: "SKIPPER" };
  // About the company.
  for (const h of [
    "Skipper Limited Reports Record Q2 Revenue of ₹1,384 Crore",
    "Skipper Share Price Falls 5.13%: Price, Valuation",
    "SKIPPER.NS Q2 2026 Earnings: Revenue Up 20.33% YoY, EPS at ₹18.88 - Earnings Surprise Report",
    "Skipper bags ₹740 crore transmission tower orders",
  ])
    assert.equal(isAbout(h, skipper), true, h);
  // Team captains (Oct 2026, from the stock pop-up).
  for (const h of [
    "Discipline will be key to winning Skipper Cup final - Durutalo",
    "Skipper Shubman Gill reaches New Zealand ahead of five-match ODI series",
    "England skipper shares GRUESOME images of split ear injury after plastic surgery",
    "Tilak Varma Relishes Vice-Captaincy, Actively Shares Insights with Skipper Shreyas Iyer",
    "All Blacks skipper Ardie Savea shares pressure playbook with Kiwis ahead of World Cup",
    '"Those were useful runs": Skipper Iyer hails Prince Yadav\'s cameo with bat after 14-run win over WI',
  ])
    assert.equal(isAbout(h, skipper), false, h);
  const supreme = { name: "Supreme Industries", ticker: "SUPREMEIND" };
  assert.equal(isAbout("Supreme Court stays NCLT order in insolvency case", supreme), false);
  assert.equal(isAbout("Supreme Industries Q2 profit rises 12% on pipes volume", supreme), true);
  const eternal = { name: "Eternal", ticker: "ETERNAL" };
  assert.equal(isAbout("An eternal love story returns to theatres this Diwali", eternal), false);
  assert.equal(isAbout("Eternal shares jump 6% after Blinkit orders surge", eternal), true);
  assert.equal(isAbout("Zomato parent posts record quarter", eternal), true);
  assert.equal(isAbout("Eternal vs Swiggy: How India's two quick commerce and food delivery giants fared in Q2FY27", eternal), true);
});

test("other companies with an everyday word in their name need it in context too (Oct 2026)", () => {
  const mankind = { name: "Mankind Pharma", ticker: "MANKIND" };
  assert.equal(isAbout("Mankind Pharma Q2 profit rises 12%", mankind), true);
  assert.equal(isAbout("A giant leap for mankind: NASA marks moon landing anniversary", mankind), false);
  const prince = { name: "Prince Pipes and Fittings", ticker: "PRINCEPIPE" };
  assert.equal(isAbout("Prince Harry to attend Invictus Games opening", prince), false);
  assert.equal(isAbout("Prince Pipes Q2 results: revenue up 9%", prince), true);
  const jupiter = { name: "Jupiter Wagons Ltd", ticker: "JWL" };
  assert.equal(isAbout("NASA probe sends new images of Jupiter's moons", jupiter), false);
  assert.equal(isAbout("Jupiter Wagons bags ₹950 crore order from Indian Railways", jupiter), true);
});

// The Nov 2026 sectors and policies (hospitals, capital markets, transmission, consumer internet,
// PLI-ACC, green hydrogen) and the extended critical-minerals policy. [headline, name, ticker, about?]
const check = (cases: [string, string, string, boolean][]) => {
  for (const [h, name, ticker, want] of cases) assert.equal(isAbout(h, { name, ticker }), want, `${ticker}: ${h}`);
};

test("isAbout handles hospital and health-insurance names: people, rivers, highways and everyday words", () => {
  check([
    ["Apollo Hospitals Q2 profit rises 25%; HealthCo demerger on track", "Apollo Hospitals Enterprise", "APOLLOHOSP", true],
    ["Apollo Tyres Q2 profit falls", "Apollo Hospitals Enterprise", "APOLLOHOSP", false],
    ["Enterprise AI spending to double", "Apollo Hospitals Enterprise", "APOLLOHOSP", false],
    ["Narayana Health to buy UK hospital chain", "Narayana Hrudayalaya (Narayana Health)", "NH", true],
    ["Narayana Hrudayalaya Q2 profit rises 20%", "Narayana Hrudayalaya (Narayana Health)", "NH", true],
    ["Narayana Murthy says 70-hour week is needed", "Narayana Hrudayalaya (Narayana Health)", "NH", false],
    ["NHAI awards NH-48 widening contract", "Narayana Hrudayalaya (Narayana Health)", "NH", false],
    ["KIMS Hospitals Q2 profit rises", "Krishna Institute of Medical Sciences (KIMS Hospitals)", "KIMS", true],
    ["Krishna river water dispute flares", "Krishna Institute of Medical Sciences (KIMS Hospitals)", "KIMS", false],
    ["Medical college seats rise 10%", "Krishna Institute of Medical Sciences (KIMS Hospitals)", "KIMS", false],
    ["Medanta parent Global Health Q2 profit up", "Global Health (Medanta)", "MEDANTA", true],
    ["Global Health Q2 profit rises 20%", "Global Health (Medanta)", "MEDANTA", true],
    ["Global health leaders meet in Geneva", "Global Health (Medanta)", "MEDANTA", false],
    ["Rainbow Children's Medicare shares jump 5%", "Rainbow Children's Medicare", "RAINBOW", true],
    ["Rainbow Q2 profit rises 15%", "Rainbow Children's Medicare", "RAINBOW", true],
    ["A rainbow over Mumbai", "Rainbow Children's Medicare", "RAINBOW", false],
    ["US Medicare cuts payments", "Rainbow Children's Medicare", "RAINBOW", false],
    ["Children's hospital opens in Delhi", "Yatharth Hospital & Trauma Care Services", "YATHARTH", false],
    ["Yatharth Hospital Q2 profit rises", "Yatharth Hospital & Trauma Care Services", "YATHARTH", true],
    ["Jupiter Life Line Q2 profit up", "Jupiter Life Line Hospitals", "JLHL", true],
    ["Jupiter Life Line Q2 profit up", "Jupiter Wagons Ltd", "JWL", false],
    ["Jupiter Wagons bags ₹500 crore order", "Jupiter Life Line Hospitals", "JLHL", false],
    ["Jupiter Wagons bags ₹500 crore order", "Jupiter Wagons Ltd", "JWL", true],
    ["Dr Agarwal's Health Care Q2 profit rises", "Dr Agarwal's Health Care", "AGARWALEYE", true],
    ["Anil Agarwal's Vedanta to list aluminium unit", "Dr Agarwal's Health Care", "AGARWALEYE", false],
    ["Dr Agarwal's Eye Hospital Q2 profit rises", "Dr Agarwal's Health Care", "AGARWALEYE", false],
    ["Dr Agarwal, AIIMS cardiologist, explains heart risk", "Dr Agarwal's Health Care", "AGARWALEYE", false],
    ["Manipal Hospitals files for IPO", "Manipal Health Enterprises (Manipal Hospitals)", "MANIPALHOS", true],
    ["Manipal Academy tops university ranking", "Manipal Health Enterprises (Manipal Hospitals)", "MANIPALHOS", false],
    ["CARE Hospitals opens 500-bed unit in Hyderabad", "Aster DM Quality Care", "ASTERDM", true],
    ["Quality Power Q2 profit rises", "Aster DM Quality Care", "ASTERDM", false],
    ["Quality Power Q2 profit rises", "Quality Power Electrical Equipments", "QPOWER", true],
    ["Metropolis of Mumbai gets new metro line", "Metropolis Healthcare", "METROPOLIS", false],
    ["Metropolis Q2 profit rises", "Metropolis Healthcare", "METROPOLIS", true],
    ["Vijaya Diagnostic Q2 profit rises", "Vijaya Diagnostic Centre", "VIJAYA", true],
    ["Techno Electric bags data centre order", "Vijaya Diagnostic Centre", "VIJAYA", false],
    ["Pregnancy test: what hCG levels mean", "HealthCare Global Enterprises (HCG)", "HCG", false],
    ["HCG Q2 profit rises", "HealthCare Global Enterprises (HCG)", "HCG", true],
    ["ICICI Lombard Q2 net profit rises", "ICICI Lombard General Insurance", "ICICIGI", true],
    ["General insurance premiums grow 8%", "ICICI Lombard General Insurance", "ICICIGI", false],
    ["New India Assurance Q2 profit rises", "New India Assurance", "NIACL", true],
    ["Prime Minister's vision of a New India", "New India Assurance", "NIACL", false],
    ["Star Health Q2 profit falls", "Star Health and Allied Insurance", "STARHEALTH", true],
    ["Insurance penetration stays low", "Star Health and Allied Insurance", "STARHEALTH", false],
    ["Medi Assist bags insurer mandate", "Medi Assist Healthcare Services", "MEDIASSIST", true],
    ["AI to assist doctors in diagnosis", "Medi Assist Healthcare Services", "MEDIASSIST", false],
    ["Policybazaar parent PB Fintech Q2 profit triples", "PB Fintech (Policybazaar)", "POLICYBZR", true],
    ["Fintech funding falls 30%", "PB Fintech (Policybazaar)", "POLICYBZR", false],
  ]);
});

test("isAbout handles capital-market names: AMCs vs their group, exchanges in market wraps, quoted brokers and raters", () => {
  check([
    // The AMCs now covered; their life-insurance and banking siblings are not them.
    ["SBI Mutual Fund launches its second SIF", "SBI Funds Management (SBI Mutual Fund)", "SBIFUNDS", true],
    ["SBI Mutual Fund launches its second SIF", "State Bank of India", "SBIN", false],
    ["SBI cuts home loan rates", "SBI Funds Management (SBI Mutual Fund)", "SBIFUNDS", false],
    ["HDFC AMC shares hit record high", "HDFC Asset Management", "HDFCAMC", true],
    ["HDFC AMC shares hit record high", "HDFC Bank", "HDFCBANK", false],
    ["ICICI Prudential AMC shares surge on listing", "ICICI Prudential Asset Management", "ICICIAMC", true],
    ["ICICI Prudential Mutual Fund launches new fund", "ICICI Prudential Asset Management", "ICICIAMC", true],
    ["ICICI Prudential Life Q2 profit rises 12%", "ICICI Prudential Asset Management", "ICICIAMC", false],
    ["Prudential plc Q3 results", "ICICI Prudential Asset Management", "ICICIAMC", false],
    ["Asset management firms see record inflows", "HDFC Asset Management", "HDFCAMC", false],
    ["Nippon India Mutual Fund launches new fund", "Nippon Life India Asset Management", "NAM-INDIA", true],
    ["Nippon Steel to buy US Steel", "Nippon Life India Asset Management", "NAM-INDIA", false],
    ["Canara Robeco AMC shares list at premium", "Canara Robeco Asset Management", "CRAMC", true],
    ["Canara Bank Q2 profit rises", "Canara Robeco Asset Management", "CRAMC", false],
    ["Aditya Birla Sun Life AMC Q2 profit rises", "Aditya Birla Sun Life AMC", "ABSLAMC", true],
    ["Aditya Birla Capital Q2 profit rises", "Aditya Birla Sun Life AMC", "ABSLAMC", false],
    ["Aditya Birla Group to invest Rs 10,000 crore in Odisha", "Aditya Birla Sun Life AMC", "ABSLAMC", false],
    ["UTI AMC Q2 profit rises", "UTI Asset Management", "UTIAMC", true],
    ["Aditya Birla Capital Q2 profit rises", "5paisa Capital", "5PAISA", false],
    ["Capital expenditure rises in FY27", "IIFL Capital Services", "IIFLCAPS", false],
    ["PTC India Financial Services Q2 profit rises", "Jio Financial Services", "JIOFIN", false],
    ["Financial results season begins", "JM Financial", "JMFINANCIL", false],
    ["Prudent fiscal policy needed, says RBI", "Prudent Corporate Advisory Services", "PRUDENT", false],
    ["Prudent Corporate Q2 profit rises", "Prudent Corporate Advisory Services", "PRUDENT", true],
    ["Anand Rathi Wealth Q2 profit up 30%", "Anand Rathi Wealth", "ANANDRATHI", true],
    ["Anand Rathi Share and Stock Brokers IPO opens", "Anand Rathi Wealth", "ANANDRATHI", false],
    // The exchanges: their own news, not every market wrap that names them.
    ["NSE Q2 results: profit rises as options volumes recover", "National Stock Exchange of India (NSE)", "NSE", true],
    ["NSE IPO: SEBI clears draft papers", "National Stock Exchange of India (NSE)", "NSE", true],
    ["SEBI fines NSE over co-location lapse", "National Stock Exchange of India (NSE)", "NSE", true],
    ["Sensex, Nifty close higher on NSE as banks rally", "National Stock Exchange of India (NSE)", "NSE", false],
    ["Sensex, Nifty end higher; NSE advance-decline ratio positive", "National Stock Exchange of India (NSE)", "NSE", false],
    ["Vedanta Aluminium Metal shares debut on NSE after demerger", "National Stock Exchange of India (NSE)", "NSE", false],
    ["NSE: TCS shares rise 2%", "National Stock Exchange of India (NSE)", "NSE", false],
    ["TCS shares rise 2% on NSE, BSE", "BSE", "BSE", false],
    ["TCS shares rise 2% on NSE, BSE", "National Stock Exchange of India (NSE)", "NSE", false],
    ["MCX Q2 profit doubles", "Multi Commodity Exchange of India (MCX)", "MCX", true],
    ["MCX gold rises Rs 500 on firm global cues", "Multi Commodity Exchange of India (MCX)", "MCX", false],
    ["Gold prices on MCX hit record", "Multi Commodity Exchange of India (MCX)", "MCX", false],
    ["Commodity markets rally", "Multi Commodity Exchange of India (MCX)", "MCX", false],
    ["CDSL Q2 profit falls", "Central Depository Services (CDSL)", "CDSL", true],
    ["Central bank holds rates", "Central Depository Services (CDSL)", "CDSL", false],
    ["Securities market regulator tightens F&O rules", "National Securities Depository (NSDL)", "NSDL", false],
    ["CAMS Q2 profit rises 15%", "Computer Age Management Services (CAMS)", "CAMS", true],
    ["Speed cams and dash cams flood market", "Computer Age Management Services (CAMS)", "CAMS", false],
    // Research desks and rating agencies quoted on other companies.
    ["Motilal Oswal Q2 profit jumps 40%", "Motilal Oswal Financial Services", "MOTILALOFS", true],
    ["Motilal Oswal sees 25% upside in Dixon Technologies", "Motilal Oswal Financial Services", "MOTILALOFS", false],
    ["Buy Dixon, says Motilal Oswal", "Motilal Oswal Financial Services", "MOTILALOFS", false],
    ["Motilal Oswal's Siddhartha Khemka says markets to stay volatile", "Motilal Oswal Financial Services", "MOTILALOFS", false],
    ["Nuvama Wealth Q2 profit rises 30%", "Nuvama Wealth Management", "NUVAMA", true],
    ["Nuvama initiates coverage on Bajaj Finance with a buy", "Nuvama Wealth Management", "NUVAMA", false],
    ["Wealth management firms see inflows", "Nuvama Wealth Management", "NUVAMA", false],
    ["JM Financial Q2 profit doubles", "JM Financial", "JMFINANCIL", true],
    ["JM Financial recommends buy on Tata Power", "JM Financial", "JMFINANCIL", false],
    ["Anand Rathi's Jigar Patel recommends buy on SBI", "Anand Rathi Wealth", "ANANDRATHI", false],
    ["CRISIL Q3 results: net profit rises 14%", "CRISIL", "CRISIL", true],
    ["CRISIL sees GDP growth at 6.5% in FY27", "CRISIL", "CRISIL", false],
    ["FY27 GDP growth seen at 6.5%: CRISIL", "CRISIL", "CRISIL", false],
    ["ICRA shares rise after Q2 profit jumps", "ICRA", "ICRA", true],
    ["ICRA expects steel demand to grow 8% in FY27", "ICRA", "ICRA", false],
    ["CARE Ratings Q2 profit up 20%", "CARE Ratings", "CARERATING", true],
    ["CareEdge downgrades Vodafone Idea debt", "CARE Ratings", "CARERATING", false],
    ["CARE Hospitals opens 500-bed unit in Hyderabad", "CARE Ratings", "CARERATING", false],
    ["Credit ratings of PSU banks upgraded", "CARE Ratings", "CARERATING", false],
  ]);
});

test("isAbout handles transmission names: metal prices, foreign parents, InvITs and look-alike words", () => {
  check([
    ["Copper hits record high; Hindustan Copper shares surge", "Hindustan Copper", "HINDCOPPER", true],
    ["Copper prices hit record high as China demand surges", "Hindustan Copper", "HINDCOPPER", false],
    ["Aluminium prices rise on LME", "National Aluminium Company (NALCO)", "NATIONALUM", false],
    ["Aluminium prices rise on LME", "Vedanta Aluminium Metal", "VAML", false],
    ["NALCO-led KABIL gets Argentina nod for lithium drilling", "National Aluminium Company (NALCO)", "NATIONALUM", true],
    ["National Aluminium Q2 profit doubles", "National Aluminium Company (NALCO)", "NATIONALUM", true],
    ["GE Vernova T&D India bags 6 GW HVDC order from POWERGRID", "GE Vernova T&D India", "GVT&D", true],
    ["GE Vernova T&D shares surge on order win", "GE Vernova T&D India", "GVT&D", true],
    ["GE Vernova raises 2026 outlook on gas turbine demand", "GE Vernova T&D India", "GVT&D", false],
    ["GE Vernova Q3 profit beats estimates", "GE Vernova T&D India", "GVT&D", false],
    ["Hitachi Energy India shares hit record high", "Hitachi Energy India", "POWERINDIA", true],
    ["Hitachi Energy bags Rs 2,000 crore order from POWERGRID", "Hitachi Energy India", "POWERINDIA", true],
    ["Hitachi Energy to invest $1 billion in Sweden plant", "Hitachi Energy India", "POWERINDIA", false],
    ["Hitachi Q2 profit rises in Tokyo", "Hitachi Energy India", "POWERINDIA", false],
    ["Siemens shares fall after Q2 miss", "Siemens Energy India", "ENRIN", false],
    ["Siemens Energy India Q2 profit rises", "Siemens Energy India", "ENRIN", true],
    ["PowerGrid InvIT declares Rs 3 per unit distribution", "PowerGrid Infrastructure Investment Trust", "PGINVIT", true],
    ["PowerGrid InvIT declares Rs 3 per unit distribution", "Power Grid Corporation of India", "POWERGRID", false],
    ["Power Grid Q2 profit rises", "PowerGrid Infrastructure Investment Trust", "PGINVIT", false],
    ["POWERGRID bags transmission project", "PowerGrid Infrastructure Investment Trust", "PGINVIT", false],
    ["Power Grid Q2 profit rises", "Power Grid Corporation of India", "POWERGRID", true],
    ["Atlanta Electricals bags transformer order", "Atlanta Electricals", "ATLANTAELE", true],
    ["Atlanta Fed's Bostic says rates on hold", "Atlanta Electricals", "ATLANTAELE", false],
    ["Diamond Power Infrastructure wins cable order", "Diamond Power Infrastructure", "DIACABS", true],
    ["Diamond exports fall 20% in Q2", "Diamond Power Infrastructure", "DIACABS", false],
    ["Mangal Electrical shares list at premium", "Mangal Electrical Industries", "MEIL", true],
    ["Mangal Pandey biopic announced", "Mangal Electrical Industries", "MEIL", false],
    ["MEIL bags Rs 5,000 crore irrigation order", "Mangal Electrical Industries", "MEIL", false],
    ["PTC India Q2 profit rises", "PTC India", "PTC", true],
    ["PTC Industries wins BrahMos order", "PTC India", "PTC", false],
    ["PTC India Financial Services Q2 profit rises", "PTC India", "PTC", false],
    ["REC Q2 profit rises 10%", "REC", "RECLTD", true],
    ["REC trade volumes on IEX rise 30%", "REC", "RECLTD", false],
    ["Adani Transmission bags Rs 2,000 crore order", "Adani Energy Solutions", "ADANIENSOL", true],
    ["Adani Green Energy commissions Khavda capacity", "Adani Energy Solutions", "ADANIENSOL", false],
    ["Techno Electric bags data centre order", "Techno Electric & Engineering", "TECHNOE", true],
    ["Universal Music signs deal", "Universal Cables", "UNIVCABLES", false],
    ["Lighting demand rises during Diwali", "Transrail Lighting", "TRANSRAILL", false],
    ["L&T bags mega order from Saudi", "Larsen & Toubro", "LT", true],
    ["L&T Finance Q2 profit rises", "Larsen & Toubro", "LT", false],
  ]);
});

test("isAbout handles consumer-internet names: pilgrimages, routes and shared words", () => {
  check([
    ["Yatra Online Q2 profit rises", "Yatra Online", "YATRA", true],
    ["Amarnath Yatra 2026: registration opens for pilgrims", "Yatra Online", "YATRA", false],
    ["Bharat Jodo Yatra enters Maharashtra", "Yatra Online", "YATRA", false],
    ["Rath Yatra: Puri gears up, crores of devotees expected", "Yatra Online", "YATRA", false],
    ["Online sales boom", "Yatra Online", "YATRA", false],
    ["Route Mobile bags WhatsApp deal", "Route Mobile", "ROUTE", true],
    ["Airline adds Delhi-Goa route", "Route Mobile", "ROUTE", false],
    ["Mobile phone exports hit record", "Route Mobile", "ROUTE", false],
    ["Paytm parent One 97 Communications Q2 profit rises 10x", "One 97 Communications (Paytm)", "PAYTM", true],
    ["Paytm parent One 97 Communications Q2 profit rises 10x", "One MobiKwik Systems", "MOBIKWIK", false],
    ["MobiKwik shares jump", "One MobiKwik Systems", "MOBIKWIK", true],
    ["Blue Dart Q2 profit falls", "Blue Dart Express", "BLUEDART", true],
    ["Coromandel Express derails in Odisha", "Blue Dart Express", "BLUEDART", false],
    ["Swiggy Instamart to move to inventory model, shares slide", "Swiggy", "SWIGGY", true],
    ["Avenue Supermarts Q2 profit up", "Avenue Supermarts (DMart)", "DMART", true],
    ["DMart Q2 revenue rises 15%", "Avenue Supermarts (DMart)", "DMART", true],
    ["Fifth Avenue store opens", "Avenue Supermarts (DMart)", "DMART", false],
    ["Nykaa Q2 profit doubles", "FSN E-Commerce Ventures (Nykaa)", "NYKAA", true],
    ["Quick commerce ventures raise funds", "FSN E-Commerce Ventures (Nykaa)", "NYKAA", false],
    ["Travel demand surges during Diwali", "RateGain Travel Technologies", "RATEGAIN", false],
    ["EaseMyTrip shares fall", "Easy Trip Planners (EaseMyTrip)", "EASEMYTRIP", true],
    ["Info Edge Q2 profit rises", "Info Edge (India)", "NAUKRI", true],
  ]);
});

test("isAbout handles battery and hydrogen names: foreign namesakes, oil companies and word tickers", () => {
  check([
    ["Hyundai Motor India launches Creta EV", "Hyundai Motor India", "HYUNDAI", true],
    ["Hyundai Motor Company Q3 profit falls on US tariffs", "Hyundai Motor India", "HYUNDAI", false],
    ["Hyundai Mobis to build battery plant", "Hyundai Motor India", "HYUNDAI", false],
    ["Kia and Hyundai sales in Korea fall", "Hyundai Motor India", "HYUNDAI", false],
    ["Neogen Chemicals Q2 profit rises", "Neogen Chemicals", "NEOGEN", true],
    ["Neogen Corporation recalls food-safety test kits", "Neogen Chemicals", "NEOGEN", false],
    ["Exide Energy commissions 6 GWh lithium-ion cell plant", "Exide Industries", "EXIDEIND", true],
    ["Exide Life merged with HDFC Life", "Exide Industries", "EXIDEIND", false],
    ["Amara Raja to bid for 10 GWh grid-storage PLI tender", "Amara Raja Energy & Mobility", "ARE&M", true],
    ["These are M&M's best SUVs", "Amara Raja Energy & Mobility", "ARE&M", false],
    ["Rajesh Exports Q2 profit falls", "Rajesh Exports", "RAJESHEXPO", true],
    ["Exports rise 10% in October", "Rajesh Exports", "RAJESHEXPO", false],
    ["Rajesh Gopinathan joins board", "Rajesh Exports", "RAJESHEXPO", false],
    ["Chemical exports rise 5%", "PCBL Chemical", "PCBL", false],
    ["Speciality chemical demand recovers", "Himadri Speciality Chemical", "HSCL", false],
    ["Packaging costs rise", "TCPL Packaging", "TCPLPACK", false],
    ["IOCL awards Panipat green hydrogen plant to L&T Energy GreenTech", "Indian Oil Corporation", "IOC", true],
    ["IOCL awards Panipat green hydrogen plant to L&T Energy GreenTech", "Larsen & Toubro", "LT", true],
    ["IOCL awards Panipat green hydrogen plant to L&T Energy GreenTech", "Olectra Greentech", "OLECTRA", false],
    ["IOC president Kirsty Coventry visits India", "Indian Oil Corporation", "IOC", false],
    ["Indian Oil Adani Ventures commissions plant", "Indian Oil Corporation", "IOC", false],
    ["Indian Oil, Oil India sign pact for green hydrogen", "Oil India", "OIL", true],
    ["Oil prices rise on Middle East tensions", "Oil India", "OIL", false],
    ["HPCL Q2 profit rises", "Hindustan Petroleum", "HINDPETRO", true],
    ["HPCL-Mittal Energy commissions polypropylene unit", "Hindustan Petroleum", "HINDPETRO", false],
    ["Petroleum ministry raises LPG prices", "Bharat Petroleum", "BPCL", false],
    ["Hindustan Petroleum Q2 profit rises", "Bharat Petroleum", "BPCL", false],
    ["Bharat Petroleum Resources finds gas in Mozambique", "Bharat Petroleum", "BPCL", false],
    ["SAIL Q2 profit rises 20%", "Steel Authority of India (SAIL)", "SAIL", true],
    ["India's first hydrogen ship sets sail from Kochi", "Steel Authority of India (SAIL)", "SAIL", false],
    ["Paradeep Phosphates shares rise 5%", "Paradeep Phosphates", "PARADEEP", true],
    ["Paradeep port handles record cargo", "Paradeep Phosphates", "PARADEEP", false],
    ["Coromandel International Q2 profit rises", "Coromandel International", "COROMANDEL", true],
    ["Coromandel Express derails in Odisha", "Coromandel International", "COROMANDEL", false],
    ["Narmada dam water level rises", "Gujarat Narmada Valley Fertilizers & Chemicals", "GNFC", false],
    ["Silicon Valley startups raise funds", "Gujarat Narmada Valley Fertilizers & Chemicals", "GNFC", false],
    ["GNFC Q2 profit rises", "Gujarat Narmada Valley Fertilizers & Chemicals", "GNFC", true],
    ["Advait Energy bags green hydrogen order", "Advait Energy Transitions", "ADVAIT", true],
    ["Advait Kumar wins award", "Advait Energy Transitions", "ADVAIT", false],
    ["Ion Exchange bags Rs 300 crore order", "Ion Exchange (India)", "IONEXCHANG", true],
    ["Ion exchange resins demand grows", "Ion Exchange (India)", "IONEXCHANG", false],
    ["Inox India shares jump 6% on LNG order", "Inox India (INOXCVA)", "INOXINDIA", true],
    ["Inox Wind bags 200 MW order from Hero Future", "Inox India (INOXCVA)", "INOXINDIA", false],
  ]);
});

test("isAbout tells the Vedanta companies and the metal miners apart", () => {
  check([
    ["Vedanta Q2 profit rises 30%", "Vedanta", "VEDL", true],
    ["Vedanta Aluminium Metal shares debut on NSE after demerger", "Vedanta", "VEDL", false],
    ["Vedanta Aluminium Metal shares debut on NSE after demerger", "Vedanta Aluminium Metal", "VAML", true],
    ["Vedanta Resources bonds rally", "Vedanta", "VEDL", false],
    ["Vedanta Power IPO plan", "Vedanta", "VEDL", false],
    ["Hindustan Zinc wins tungsten block in critical mineral auction", "Hindustan Zinc", "HINDZINC", true],
    ["Hindustan Zinc wins tungsten block in critical mineral auction", "Vedanta", "VEDL", false],
    ["Hindustan Zinc wins tungsten block in critical mineral auction", "Gujarat Mineral Development Corporation (GMDC)", "GMDCLTD", false],
    ["Copper hits record high; Hindustan Copper shares surge", "Hindalco Industries", "HINDALCO", false],
    ["Zinc prices rise", "Hindustan Zinc", "HINDZINC", false],
    ["Gujarat Mineral Development Corporation Q2 results", "Gujarat Mineral Development Corporation (GMDC)", "GMDCLTD", true],
    ["Secures ultra-mega order for a strategic offshore development project", "Gujarat Mineral Development Corporation (GMDC)", "GMDCLTD", false],
    ["Oil India Q2 profit rises", "Oil India", "OIL", true],
  ]);
});
