# Projections: an out-of-sample check (one period)

**Question.** If the projection model (`src/lib/baskets/projection.ts`, design in
[PROJECTIONS.md](./PROJECTIONS.md)) had been run a year ago, would its 1-year Base case have ranked
stocks better than chance, and would actual returns have landed between Bear and Bull?

**Short answer.** No, not in this period. Over 24 Oct 2025 → 23 Oct 2026 the Base case ranked the
262 testable stocks slightly *backwards* (rank correlation −0.15, outside what chance gives), the
Bear–Bull band held only a third of actual outcomes, and the misses were mostly on the downside. A
plain "last year's winners keep winning" ranking did clearly better (+0.21). No parameter in the
sensitivity check changes the picture. This is one year in a falling market, so it is evidence, not
a verdict; but it is the only evidence we have and it does not support reading Base as a ranking
signal or Bear–Bull as a likely range.

Reproduce: `npx tsx scripts/validate-projections.ts [--json rows.json]` (reads the company table
read-only from `DATABASE_URL`, prices from Yahoo; runs in about 30 seconds). Figures below are from
the run on 24 Oct 2026 (last close 23 Oct 2026). The model and everything the site serves are
unchanged.

## 1. Method

For every listed company the baskets cover (`listBasketUniverse`, 280 stocks), the script rebuilds
the model's input as it would have looked on **24 Oct 2025**, runs the shipped `projectStock`, and
compares the 1-year case returns with what the price actually did.

| Input | Live model (today) | As-of rebuild (24 Oct 2025) |
|---|---|---|
| Revenue, net profit | FY22–FY26 | FY22–FY25 (FY26 set to null: not yet reported). So at most 4 years, not 5 |
| One-off year | `detectOutlier` on FY22–FY26 (+ hand flag) | `detectOutlier` on FY22–FY25 only; the hand flag (`screenOut`, about FY26) is dropped |
| Price | Today's | Close on 24 Oct 2025 (last close on or before, within 7 days) |
| Market cap | Today's | Today's (company table) × close on 24 Oct 2025 ÷ close on the table's date |
| P/E | Today's, on trailing (TTM) earnings | Market cap then ÷ FY25 net profit (null for a loss) |
| Price CAGRs [1Y, 3Y, 5Y] | From the table | [1Y measured back to 24 Oct 2024 from Yahoo, null, null] |
| Own P/E target | Median of P/E today, 1 and 3 years ago | Median of P/E then and 1 year before (the 3-year point needs a 3Y CAGR, which a 2Y price history can't give, so it is null and the model skips it, exactly as it does for a stock with under 3 years of trading) |
| Industry medians | Over each industry's listed companies, today's figures | Recomputed from the same as-of figures: P/E = mcap then ÷ FY25 profit, P/S = mcap then ÷ FY25 revenue |
| Data date (`asOf`) | Table's date | "24 Oct 2025" (so revenue is moved up from FY25 by the same ~7 months as today's run moves it from FY26) |

**Actual return** = last close (23 Oct 2026) ÷ close on 24 Oct 2025 − 1, split-adjusted, without
dividends (the model projects price, not total return). A stock whose price history has a one-day
fall of over 40% would have been dropped as a likely unadjusted split or demerger; none was.

The script also checks that a parameterised copy of `projection.ts` reproduces the shipped
`projectStock` exactly on every stock before using copies for the sensitivity runs.

## 2. Coverage

| | Stocks |
|---|---|
| Basket universe | 280 |
| **Tested** | **262** |
| Left out: fewer than 3 years of results as of FY25 | 12 (AADHARHFC, ADOR, BAJAJHFL, BOROSCI, HIRECT, KRT, LINDEINDIA, NXST, ROSSTECH, SUYOG, TECHERA, TIMKEN) |
| Left out: listed after 24 Oct 2025 | 4 (AEQUS, APSISAERO, BAGMANE, DIGILOGIC) |
| Left out: no price history from Yahoo or Screener | 2 (DIGIFIBRE, STONEINDIA) |

Of the 262, 234 use the P/E method and 28 price to sales (loss-makers).

The period: Nifty 50 **−12.4%**; the median stock **−10.3%**, mean +1.5% (a few large winners),
10th percentile −43%, 90th +52%.

## 3. Results (1-year horizon)

### Ranking: does a higher Base mean a higher actual return?

| | Own P/E exit | Industry P/E exit |
|---|---|---|
| Rank correlation (Spearman IC), Base vs actual | **−0.15** | **−0.15** |
| 95% bootstrap interval | −0.28 … −0.02 | −0.27 … −0.02 |
| Permutation p-value (chance gives this or stronger) | 0.019 | 0.023 |
| IC within industries (ranks inside each home industry, pooled) | −0.15 | – |
| IC, P/E-method stocks (n 234) / P/S-method (n 28) | −0.10 / −0.48 | −0.13 / −0.33 |

Fifths by Base (own P/E exit), average actual return:

| Fifth by Base | Median Base | Avg actual | n |
|---|---|---|---|
| Bottom | +1% | **+24%** | 52 |
| 2 | +9% | −9% | 52 |
| 3 | +15% | 0% | 53 |
| 4 | +22% | +3% | 52 |
| Top | +38% | **−11%** | 53 |
| **Top minus bottom** | | **−35 pts** (median −23 pts) | |

With the industry P/E exit the top-minus-bottom spread is −23 pts (median −18).

### By home industry (own P/E exit, industries with 10+ stocks)

| Industry | n | IC | Inside Bear–Bull | Median actual | Median Base |
|---|---|---|---|---|---|
| Real Estate | 50 | −0.11 | 34% | −15% | +14% |
| Pharmaceuticals | 45 | −0.19 | 42% | 0% | +14% |
| 5G/6G Telecom Buildout | 26 | −0.34 | 31% | −11% | +13% |
| Railways / Vande Bharat & Metro Rolling Stock | 23 | −0.06 | 30% | −24% | +14% |
| Electric 4-Wheeler | 21 | +0.02 | 24% | −21% | +16% |
| Aerospace Component Manufacturing & MRO | 21 | −0.06 | 24% | +35% | +11% |
| Data Center / AI Infrastructure | 13 | −0.12 | 38% | +33% | +18% |
| Energy Generation | 11 | +0.15 | 18% | −16% | +18% |
| Naval Shipbuilding & Defence Shipyards | 10 | −0.32 | 40% | −16% | +8% |

7 of 9 industries are negative; at these sizes no single industry figure is meaningful on its own,
but the sign is consistent.

### Level and band: where did actual returns land?

| | Own P/E exit | Industry P/E exit |
|---|---|---|
| Median projected Bear / Base / Bull | −10% / +15% / +40% | −9% / +15% / +40% |
| Median Bear–Bull width | 47 pts | 47 pts |
| **Actual inside [Bear, Bull]** | **33%** | **31%** |
| Above Bull | 15% | 16% |
| Below Bear | 52% | 53% |
| Inside after taking out the period's common move (median error) | 50% | 53% |
| Error, actual − Base: median / mean / mean absolute | −25 / −16 / 42 pts | −25 / −14 / 41 pts |
| Width needed to hold 8 in 10 (× today's half-width each side) | ×2.4 (×2.0 without the common move) | ×2.4 (×2.0) |

### Benchmarks (same 262 stocks)

| Predictor | n | IC with actual | 95% interval | p |
|---|---|---|---|---|
| **Model Base (own P/E exit)** | 262 | **−0.15** | −0.28 … −0.02 | 0.02 |
| Past-year price return (momentum) | 253 | **+0.21** | +0.08 … +0.35 | 0.003 |
| Earnings yield, 1 ÷ P/E then | 242 | −0.11 | −0.23 … +0.02 | 0.08 |
| Model's Base revenue growth alone | 262 | −0.09 | −0.22 … +0.03 | 0.14 |
| Size (log market cap) | 262 | +0.05 | −0.08 … +0.16 | 0.46 |

| Point forecast | Median error | Mean absolute error |
|---|---|---|
| Model Base | −25 pts | 42 pts |
| Every stock at the median Base (+15%) | −26 pts | 39 pts |
| Every stock at its own past-year return | −11 pts | 36 pts |

A band of each stock's own Bear–Bull width, centred on the period's actual median return instead of
its Base, would have held 60%.

The model's Base is negatively correlated with past-year return (IC −0.29): it projects the most for
stocks that had fallen. The top of the Base list was INOXWIND, KERNEX, TEJASNET, KPIGREEN, OLAELEC,
ZENTEC, SERVOTECH, BONDADA (Base +52% to +59%); six of those eight fell 24–62%.

## 4. Sensitivity

Each row reruns the whole test with one parameter changed (a copy of the model; shipped defaults
untouched).

| Variant | IC own | Inside own | IC ind | Inside ind | Median Base | Median width | Top − bottom fifth (own) |
|---|---|---|---|---|---|---|---|
| **Shipped** (fade 0.4, revert 3y, target 0.7–1.4×) | −0.15 | 33% | −0.15 | 31% | +15% | 47 pts | −35 pts |
| GROWTH_FADE 0.2 | −0.14 | 35% | −0.15 | 32% | +15% | 50 pts | −33 pts |
| GROWTH_FADE 0.6 | −0.17 | 31% | −0.13 | 31% | +14% | 46 pts | −31 pts |
| REVERT_YEARS 2 | −0.16 | 36% | −0.13 | 34% | +16% | 50 pts | −30 pts |
| REVERT_YEARS 5 | −0.14 | 32% | −0.16 | 31% | +14% | 45 pts | −32 pts |
| Target band 0.8–1.25× | −0.13 | 35% | −0.16 | 33% | +14% | 47 pts | −39 pts |
| Target band 0.6–1.6× | −0.16 | 33% | −0.14 | 31% | +16% | 47 pts | −38 pts |

IC stays between −0.13 and −0.17 and the band's hit rate between 31% and 36% in every variant: the
result is not an artefact of one tuning choice, and no tuning within these ranges fixes it.

## 5. Limitations

- **One period.** One year, one start date, in a year when the market fell 12% and last year's
  winners kept winning. A momentum-driven year is exactly the one that punishes a model leaning
  towards de-rated stocks; in a reversal year the sign could flip. A one-period IC of −0.15 is
  significant against pure chance but says little about the long-run average.
- **Approximated past P/E.** P/E then uses FY25 annual profit, not the trailing twelve months the live
  model uses (in Oct 2025 TTM would have included Apr–Jun 2025). Market cap then is today's scaled by
  price, so share issues or buybacks in the year are ignored.
- **Thinner history than live.** 4 fiscal years instead of 5, and the own-P/E target has two points
  (then, 1 year before) instead of three, because Yahoo's 2Y daily history can't give a 3-year CAGR.
- **Survivorship.** The universe is today's content: companies added because they did well (e.g.
  recent themes) or removed because they did badly are not a random sample of what an analyst
  would have held a year ago. 4 later listings and 2 with no price history are excluded.
- **Scraped data.** Revenue and profit come from the company table (scraped from Screener), prices
  from Yahoo with Screener as fallback; restatements since 2025 are in the FY22–FY25 figures the
  test uses, which is a mild look-ahead.
- **Price, not total return.** Dividends are excluded on both sides; for high-yield stocks the
  actual return is understated by a few points.
- **2-year horizon untested.** Only one year has passed.

## 6. Conclusions

1. **Ranking.** In this period the Base case did not rank stocks better than chance; it ranked them
   somewhat worse (IC −0.15, top fifth by Base 35 points behind the bottom fifth). The likely cause is
   structural rather than a parameter: the exit multiple reverts toward a past or peer level (own P/E
   a year earlier, or the industry median), so a stock that has de-rated gets a target above today's
   multiple and the highest Base goes to stocks whose prices had already fallen (Base vs past-year
   return: −0.29). In this year those kept falling while past winners kept rising. Both exits give
   the same IC, and growth alone (−0.09) and cheapness alone (−0.11) lean the same way, so no single
   input is to blame. The loss-maker
   (P/S) group was the worst (IC −0.48 on 28 stocks).
2. **Level.** Base sat about 25 points above the median outcome. Most of that is the market (Nifty
   −12%): the model has no market term, so every Base carries an implicit "the market re-rates
   nowhere" assumption, while the typical Base of +15% a year is above long-run Indian equity returns
   to begin with.
3. **Band.** Bear–Bull is **too narrow** to read as a likely range: it held 33% of outcomes, with
   misses skewed below Bear (52%) rather than above Bull (15%). Even after removing the common market
   move it holds only half, and it would need to be about twice as wide (≈ ±50 pts around Base for a
   typical stock) to hold 8 in 10. The band is a set of scenarios on fundamentals; actual one-year
   dispersion in this universe (10th–90th percentile −43% to +52%) is mostly price movement the
   fundamentals don't explain.
4. **What this supports saying on the page.** The current wording ("model projection from reported
   financials and past prices, not a forecast or a recommendation") is the right frame. The test
   gives no basis to present Base as an expected return, Bear–Bull as a probable range, or the
   projection as a way to pick between stocks. The simulated "likely range" (8 in 10 paths at the
   basket's past volatility) is the more honest uncertainty figure, and this test suggests it, not
   Bear–Bull, is what users should read as the range.

Possible follow-ups (not done here; the model is unchanged): repeat the test as more history
accrues (or with a 5Y price history so the 3-year own-P/E point and earlier start dates can be
tested), test a market-neutral Base (rank only, no level claim), and test a version that drops or
softens the multiple reversion, the most likely source of the tilt toward de-rated stocks.
