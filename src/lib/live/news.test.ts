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
  assert.equal(formatNewsDate(NOW - 5 * 3_600_000, NOW), "5h ago");
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

test("headline ages are recomputed on the viewer's clock, curated month-only dates are kept", () => {
  const ts = NOW - 30 * 60_000;
  assert.equal(newsAgeLabel("3h ago", ts, NOW), "Just now", "a stale cached label is replaced");
  assert.equal(newsAgeLabel("Just now", NOW - 5 * 3_600_000, NOW), "5h ago");
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
