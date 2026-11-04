import { test } from "node:test";
import assert from "node:assert/strict";
import { isQuotePage, isStaleOrGreyMarket, presentableNews, tidyHeadline } from "./news-display";

test("tidyHeadline marks a headline cut mid-word or after a dangling word", () => {
  assert.equal(tidyHeadline("Defence stocks fall 5%: Where are p"), "Defence stocks fall 5%: Where are p…");
  assert.equal(tidyHeadline("Shares rise as brokerages raise the"), "Shares rise as brokerages raise the…");
  assert.equal(tidyHeadline("NTPC Earnings Call Highlights: Strong Profit Growth, 91. ..."), "NTPC Earnings Call Highlights: Strong Profit Growth, 91…");
  assert.equal(tidyHeadline("Order book grows..."), "Order book grows…");
});

test("tidyHeadline leaves whole headlines alone", () => {
  for (const h of [
    "ideaForge Q2 profit turns positive as revenue rises 124%",
    "Power Grid shares saw a sharp fall; what's next?",
    "Solar Industries reports 70% revenue growth H1 FY27",
    "Why Tata Steel shares are going up",
    "BEL bags orders worth Rs 500 cr",
  ])
    assert.equal(tidyHeadline(h), h);
});

test("grey-market premium stories are always dropped", () => {
  assert.ok(isStaleOrGreyMarket("NTPC Green IPO GMP today: grey market premium falls", false));
  assert.ok(isStaleOrGreyMarket("Grey-market signals weak listing for issue", true));
  assert.ok(!isStaleOrGreyMarket("NTPC Green Energy shares rise 5% after Q2", true));
});

test("IPO run-up stories are dropped only once the company has listed", () => {
  const band = "Manipal Health's IPO Price Band Set at Rs 410-432";
  assert.ok(isStaleOrGreyMarket(band, true));
  assert.ok(!isStaleOrGreyMarket(band, false));
  assert.ok(isStaleOrGreyMarket("Lenskart IPO subscribed 28 times on final day", true));
  assert.ok(isStaleOrGreyMarket("Swiggy IPO allotment status: how to check", true));
  assert.ok(!isStaleOrGreyMarket("Lenskart shares list at 3% premium over IPO price", true));
});

test("presentableNews filters and tidies, keeping the other fields", () => {
  const items = [
    { ticker: "A", headline: "A IPO GMP today", x: 1 },
    { ticker: "B", headline: "B IPO price band fixed", x: 2 },
    { ticker: "C", headline: "C IPO price band fixed", x: 3 },
    { ticker: "D", headline: "D wins order; Where are p", x: 4 },
  ];
  const out = presentableNews(items, (t) => t !== "C");
  assert.deepEqual(out, [
    { ticker: "C", headline: "C IPO price band fixed", x: 3 },
    { ticker: "D", headline: "D wins order; Where are p…", x: 4 },
  ]);
});

test("stock-quote and broker product pages are dropped, real share-price stories kept", () => {
  for (const h of [
    "Max Healthcare Share Price - Live NSE: MAXHEALTH Stock Price & Chart",
    "BPCL Share Price",
    "SBI FUNDS MANAGEMENT LTD Share Price",
    "Groww Nifty 50 ETF - Share Price, NAV, Returns",
    "Groww Gold ETF Share Price Today - Live NSE/BSE",
    "Invest in US Stocks on Groww | 10,000+ Stocks & ETFs",
  ])
    assert.ok(isQuotePage(h), h);
  for (const h of [
    "Tata Motors share price: stock jumps 5% after Q2 results",
    "BPCL share price falls 3% as Russian crude loses appeal",
    "Max Healthcare Share Price Live Updates: stock rises after Q2",
    "Groww opens US stock investing to all: What it costs to buy Apple",
    "IOC, BPCL, HPCL clock ₹30,106 cr Q2 profit",
  ])
    assert.ok(!isQuotePage(h), h);
  const out = presentableNews([{ ticker: "BPCL", headline: "BPCL Share Price" }, { ticker: "BPCL", headline: "BPCL Q2 profit rises" }], () => true);
  assert.deepEqual(out.map((n) => n.headline), ["BPCL Q2 profit rises"]);
});
