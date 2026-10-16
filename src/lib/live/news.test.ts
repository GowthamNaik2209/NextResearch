import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { formatNewsDate, getCompanyNews, getLatestNews, isAbout, parseGoogleNewsRss } from "./news";

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
