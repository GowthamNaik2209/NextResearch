# Projections v2: a research-aligned prototype, tested out of sample

**Question.** The one-period check ([PROJECTIONS-VALIDATION.md](./PROJECTIONS-VALIDATION.md)) found
the shipped Base ranked stocks backwards (IC −0.15), Bear–Bull held a third of outcomes, and Base
sat ~25 pts above the median outcome. Would a model built the way the published research builds
expected returns do better: a market-anchored (CAPM) Base, small Grinold–Kahn tilts from
fundamentals, and a volatility-based range?

**Short answer.** Partly. Over three 1-year periods:

- **The volatility range is the clear win.** Pooled, it held **78%** of outcomes against a target of
  80% (Kupiec p 0.16, so not rejected). The shipped Bear–Bull held **42%** (p < 0.001). It was closer
  to 80% than the shipped band in every period. With the spec's EWMA λ 0.94 it still swings, 86% /
  93% / 56%, because the short-memory EWMA follows recent turbulence. λ 0.97 barely helps (88 / 93 /
  60%). **1Y realised volatility** centred on the median held 90 / 89 / **80%**: calibrated in the
  falling year and a little wide in the other two (section 4).
- **Removing the multiple reversion removes the anti-momentum lean.** The fundamentals score with
  today's P/E held had IC +0.09 / +0.09 / +0.01. The shipped Base on the same stocks had +0.07 /
  +0.09 / −0.12. It was never negative, but it was never significant either.
- **The CAPM anchor fixes the framing, not the level.** Median Base is about +15% in v2 as well (rf
  ~6.5% + beta ~1.1 × ERP 7.46%). So the level error is unchanged: a median miss of −18 pts, which is
  the market's year. As a ranking, v2's Base is mostly beta, and beta's IC takes the sign of the
  market (−0.21 in the year Nifty fell 12%). That is what CAPM predicts. It is not skill.

Recommendation (section 6): ship the volatility range on 1Y realised volatility, centred on the
median, and drop the multiple reversion. Ship the CAPM anchor as the level, with the tilt shrunk at IC 0.05,
but never present v2's Base as a ranking signal. None of it changes this conclusion: the projection
is not a way to pick between stocks.

Reproduce: `npx tsx scripts/validate-projections-v2.ts [--json out.json] [--prices cache.json]`.
It reads the company table read-only from `DATABASE_URL` and fetches 5Y daily prices from Yahoo,
cached to the `--prices` file so reruns use the same prices. A first run takes about 40 seconds.
Figures here are from the run on 24 Oct 2026 (last close 23 Oct 2026). `src/lib/baskets/projection.ts`
and everything the site serves are unchanged; v2 exists only in the script.

## 1. Formulas (as tested)

For stock *i* at a start date, horizon *h* = 1 year:

| Piece | Formula | Inputs |
|---|---|---|
| Market anchor | rf + β*ᵢ* × ERP | rf = India 10Y G-sec yield on the start date; ERP = Damodaran's total ERP for India |
| Beta | β*ᵢ* = 0.67 × β̂*ᵢ* + 0.33 (Blume) | β̂ = OLS slope of 2 years of weekly returns (to the start date) on ^NSEI weekly returns; fewer than 52 weeks → β = 1 |
| Volatility | σ*ᵢ* = max(20%, √(250 × v)), v*ₜ* = 0.94 v*ₜ₋₁* + 0.06 r*ₜ*² | Daily log returns over the year to the start date (RiskMetrics EWMA, seeded with the first 20 returns' mean square) |
| Fundamentals score | F*ᵢ* = (1 + g*ᵢ*) × m₁/m₀ − 1, P/E held | g = shipped Base growth rule with fade 0.55 toward 10% (instead of 0.4); m₀ = latest net margin; m₁ = m₀ + (m* − m₀)/3, m* = ½(own median margin + home-industry median margin), m₁/m₀ within 1/1.15…1.15 |
| Standardised score | z*ᵢ* = (F*ᵢ* − median F) / sd F, winsorised at ±3 | Across the period's P/E-method stocks; loss-makers and P/S-method stocks z = 0 (market anchor and range only) |
| Tilt (Grinold–Kahn) | tilt*ᵢ* = IC × σ*ᵢ* × z*ᵢ* | IC = 0 (pure CAPM) and IC = 0.05 |
| **Base** | rf + β*ᵢ* × ERP + tilt*ᵢ* | |
| **Bear / Bull** | (1 + Base) × exp(∓1.2816 × σ*ᵢ* × √h) − 1 | Two-sided 80% |

Diagnostic variants of IC 0.05 are also reported. Each swaps in a standard alternative, not a fitted
one. The volatility can be the spec's EWMA λ 0.94, a **slower EWMA λ 0.97** (the same seeding and
window), or the **1Y realised** volatility: equal-weighted daily log returns over the same year,
√(250 × mean r²), with the same 20% floor. Each volatility is used in both the tilt and the band.
Each is shown with the band centred on the mean, as the spec has it, and **on the median**, where
the band is centred on the lognormal median (1 + Base)·e^(−σ²/2).

### Market inputs and sources

| Start date | rf (10Y G-sec) | Source |
|---|---|---|
| 24 Oct 2024 | 6.85% | Business Standard reported a close of 6.8495% for the session before 28 Oct 2024. Crisil Rateview (Nov 2024) gives the October close as 6.84% |
| 24 Apr 2025 | 6.37% | Aditya Birla Sun Life daily fixed-income tracker, 6.79% GS 2034 close on 24 Apr 2025 |
| 24 Oct 2025 | 6.53% | Trading Economics (mid-October 6.53%) and the month-end close of 6.53%. The 24 Oct close itself was not found; the yield traded in 6.50–6.59% through late October |

**ERP = 7.46%** for every period. This is Damodaran's July 2025 update ("Country Risk: The 2025
Edition", Musings on Markets, July 2025): India's total ERP is 7.46%, on a mature-market premium of
4.21% (4.48% less the US default spread of 0.27%). The page also lists his January 2026 figure,
7.08% (4.23% + India CRP 2.85%, Baa3). It postdates every start date, so it is not used. I could not
retrieve the India rows of his July 2024 and January 2025 tables without downloading his
spreadsheets, so the 2024 and early-2025 periods use the July 2025 figure too. A single ERP across
periods is the honest simplification here. The ERP is the same for every stock in a period, so it
moves every v2 Base by β × ΔERP and **cannot change any IC or the band's shape**. ±0.4 pt of ERP
moves the median Base by about ±0.5 pt.

Note: Damodaran prices the CRP in USD on top of a default-free rate. Adding it to an INR G-sec yield,
which already carries India's default spread, double-counts about 1.9 pts of default risk; strictly,
rf should be the G-sec yield less the default spread. The spec asks for the G-sec yield, so that is
what was tested. It only shifts the level.

## 2. Test design

The harness from the one-period check was extended to three start dates. Every input is rebuilt as
of the start date in the same way: fiscal years only up to the latest one reported then; price and
market cap on the day; own and industry multiples and the industry margin from as-of figures; and
`detectOutlier` on the as-of years. The actual return is the close at the end ÷ the close at the start
− 1, split-adjusted, with no dividends.

| Period | Start → end | Fundamentals | Tested | Nifty 50 | Median stock | p10 … p90 |
|---|---|---|---|---|---|---|
| P1 | 24 Oct 2024 → 24 Oct 2025 | FY22–FY24 | 241 | +5.7% | −1.6% | −32% … +46% |
| P2 | 24 Apr 2025 → 24 Apr 2026 | FY22–FY24 | 248 | −1.4% | +1.8% | −32% … +57% |
| P3 | 24 Oct 2025 → 23 Oct 2026 | FY22–FY25 | 259 | −12.4% | −10.0% | −43% … +52% |

- **P1 and P3 do not overlap.** P2 overlaps each by six months, so it is not independent evidence.
  The three-period means are shown, along with the mean of P1 and P3 alone.
- **The same stocks feed every model in a period.** Each tested stock is one the shipped model can
  project (3+ years of results) and that has 40+ daily returns before the start. Exclusions are
  printed by the script: mostly under 3 years of results (19, 20 and 12) and later listings (15, 9
  and 4).
- **P3 is the one-period check's year, on slightly fewer stocks.** It uses 259 instead of 262,
  because three recent listings lack 40 daily returns, and 5Y prices instead of 2Y. The shipped IC
  comes out −0.16 here against −0.15 there.
- **Beta and volatility come from the same Yahoo series** as the site's 5Y chart, fetched with daily
  bars (a copy of `yahoo.ts`, split handling included). One stock with a one-day fall over 40%
  inside the window (JAYKAY) was dropped from P1 and P2.
- **Nothing was tuned.** Every v2 parameter is the spec's value: Blume 0.67/0.33, λ 0.94, floor 20%,
  IC 0.05, fade 0.55 and z of 1.28. None was changed after seeing results. The two diagnostic
  variants are shown next to the spec version, not in place of it.

## 3. Results by period (1-year horizon)

The IC is the Spearman correlation of Base with the actual return, with a bootstrap 95% interval
and a permutation p-value. "Inside" is the share of outcomes between Bear and Bull. Kupiec is the
likelihood-ratio test of the miss rate against 20% (χ²₁). Errors are actual − Base. The top − bottom
column is the mean actual return of the top fifth by Base minus the bottom fifth.

### P1: 24 Oct 2024 → 24 Oct 2025 (Nifty +5.7%)

| Model | IC (95% CI) | p | Inside / below / above | Kupiec LR (p) | Err median / mean / abs | Top − bottom (mean / median) | Median Base | Median width |
|---|---|---|---|---|---|---|---|---|
| Shipped, own P/E exit | +0.05 (−0.09…+0.18) | 0.42 | 47 / 39 / 14% | 129 (<.001) | −15 / −9 / 29 | +3 / +3 | +11% | 43 pts |
| Shipped, industry P/E exit | +0.07 (−0.07…+0.19) | 0.30 | 47 / 41 / 12% | 129 (<.001) | −18 / −12 / 30 | +3 / +11 | +17% | 46 pts |
| v2, IC 0 | −0.02 (−0.15…+0.10) | 0.75 | 86 / 11 / 3% | 5.7 (0.017) | −17 / −11 / 29 | +2 / −5 | +14% | 115 pts |
| **v2, IC 0.05** | +0.03 (−0.10…+0.15) | 0.69 | **86 / 11 / 3%** | 5.7 (0.017) | −15 / −11 / 29 | +6 / +1 | +15% | 116 pts |
| v2, IC 0.05, EWMA 0.94, on median | +0.03 | 0.69 | 88 / 9 / 4% | 9.6 (0.002) | −15 / −11 / 29 | +6 / +1 | +15% | 108 pts |
| v2, IC 0.05, EWMA 0.97 | +0.03 | 0.71 | 88 / 10 / 2% | 9.6 (0.002) | −15 / −11 / 29 | +6 / +1 | +15% | 120 pts |
| v2, IC 0.05, EWMA 0.97, on median | +0.03 | 0.71 | 89 / 8 / 3% | 13.4 (<.001) | −15 / −11 / 29 | +6 / +1 | +15% | 111 pts |
| v2, IC 0.05, 1Y realised | +0.01 | 0.87 | 87 / 10 / 2% | 8.5 (0.004) | −16 / −11 / 29 | +7 / 0 | +15% | 124 pts |
| v2, IC 0.05, 1Y realised, on median | +0.01 | 0.87 | 90 / 7 / 3% | 17.8 (<.001) | −16 / −11 / 29 | +7 / 0 | +15% | 115 pts |

### P2: 24 Apr 2025 → 24 Apr 2026 (Nifty −1.4%)

| Model | IC (95% CI) | p | Inside / below / above | Kupiec LR (p) | Err median / mean / abs | Top − bottom | Median Base | Median width |
|---|---|---|---|---|---|---|---|---|
| Shipped, own P/E exit | +0.08 (−0.04…+0.22) | 0.19 | 48 / 38 / 15% | 128 (<.001) | −15 / −10 / 34 | +4 / +6 | +19% | 46 pts |
| Shipped, industry P/E exit | +0.03 (−0.09…+0.16) | 0.60 | 43 / 38 / 19% | 163 (<.001) | −14 / −6 / 34 | +11 / +8 | +17% | 45 pts |
| v2, IC 0 | −0.07 (−0.18…+0.05) | 0.26 | 93 / 5 / 2% | 31.5 (<.001) | −12 / −5 / 31 | +2 / −2 | +15% | 141 pts |
| **v2, IC 0.05** | −0.00 (−0.13…+0.12) | 0.94 | **93 / 4 / 2%** | 33.9 (<.001) | −13 / −5 / 31 | +10 / −2 | +15% | 141 pts |
| v2, IC 0.05, EWMA 0.94, on median | −0.00 | 0.94 | 92 / 2 / 6% | 27.1 (<.001) | −13 / −5 / 31 | +10 / −2 | +15% | 128 pts |
| v2, IC 0.05, EWMA 0.97 | −0.01 | 0.93 | 93 / 5 / 2% | 33.9 (<.001) | −13 / −5 / 31 | +11 / −2 | +15% | 146 pts |
| v2, IC 0.05, EWMA 0.97, on median | −0.01 | 0.93 | 93 / 2 / 6% | 31.5 (<.001) | −13 / −5 / 31 | +11 / −2 | +15% | 131 pts |
| v2, IC 0.05, 1Y realised | −0.01 | 0.91 | 91 / 7 / 2% | 21.3 (<.001) | −13 / −5 / 31 | +13 / 0 | +15% | 136 pts |
| v2, IC 0.05, 1Y realised, on median | −0.01 | 0.91 | 89 / 5 / 6% | 14.8 (<.001) | −13 / −5 / 31 | +13 / 0 | +15% | 124 pts |

The P2 start fell just after the April 2025 tariff sell-off, so the EWMA volatility was high
(median 45%, against 37% in P1 and 27% in P3). The band came out too wide.

### P3: 24 Oct 2025 → 23 Oct 2026 (Nifty −12.4%)

| Model | IC (95% CI) | p | Inside / below / above | Kupiec LR (p) | Err median / mean / abs | Top − bottom | Median Base | Median width |
|---|---|---|---|---|---|---|---|---|
| Shipped, own P/E exit | −0.16 (−0.29…−0.03) | 0.008 | 33 / 52 / 15% | 270 (<.001) | −24 / −15 / 42 | −35 / −23 | +15% | 47 pts |
| Shipped, industry P/E exit | −0.14 (−0.27…−0.02) | 0.026 | 31 / 53 / 17% | 292 (<.001) | −25 / −14 / 41 | −23 / −16 | +15% | 47 pts |
| v2, IC 0 | −0.21 (−0.33…−0.08) | 0.001 | 56 / 40 / 5% | 78.6 (<.001) | −25 / −14 / 39 | −20 / −17 | +16% | 80 pts |
| **v2, IC 0.05** | −0.16 (−0.28…−0.04) | 0.005 | **56 / 40 / 4%** | 76.3 (<.001) | −26 / −14 / 39 | −7 / −18 | +16% | 81 pts |
| v2, IC 0.05, EWMA 0.94, on median | −0.16 | 0.005 | 59 / 34 / 7% | 59.0 (<.001) | −26 / −14 / 39 | −7 / −18 | +16% | 78 pts |
| v2, IC 0.05, EWMA 0.97 | −0.16 | 0.007 | 60 / 36 / 4% | 53.0 (<.001) | −25 / −14 / 39 | −9 / −18 | +16% | 88 pts |
| v2, IC 0.05, EWMA 0.97, on median | −0.16 | 0.007 | 63 / 32 / 5% | 40.2 (<.001) | −25 / −14 / 39 | −9 / −18 | +16% | 85 pts |
| v2, IC 0.05, 1Y realised | −0.15 | 0.005 | 75 / 22 / 2% | 3.4 (0.065) | −25 / −14 / 39 | −5 / −18 | +16% | 122 pts |
| **v2, IC 0.05, 1Y realised, on median** | −0.15 | 0.005 | **80 / 17 / 3%** | **0.0 (0.90)** | −25 / −14 / 39 | −5 / −18 | +16% | 113 pts |

At the P3 start, volatility was calm (median 27%; 58 stocks at the 20% floor). Then the market fell
12%, so misses piled up below Bear. The standardised log errors had an sd of 1.37 (1.0 = calibrated)
with a median of −0.93. In P1 and P2 the sd was 0.81 and 0.73: too wide.

### Signals on their own (ranking only, IC by period P1 / P2 / P3)

| Signal | Raw return | Market-adjusted (actual − β̂ × Nifty) |
|---|---|---|
| **v2 fundamentals score z** (P/E held, fade 0.55) | **+0.09 / +0.09 / +0.01** (mean +0.06) | +0.08 / +0.09 / −0.00 |
| Shipped Base, same P/E-method stocks | +0.07 / +0.09 / −0.12 (mean +0.01) | +0.07 / +0.09 / −0.10 |
| Shipped Base, all stocks | +0.05 / +0.08 / −0.16 | +0.06 / +0.08 / −0.16 |
| v2 Base IC 0.05, all stocks | +0.03 / −0.00 / −0.16 | −0.04 / +0.01 / −0.00 |
| Beta (Blume) | −0.02 / −0.07 / **−0.21** | – |
| EWMA volatility | −0.12 / −0.09 / +0.07 | – |
| Past-year return (momentum) | −0.09 / −0.11 / **+0.21** | – |

No single-period signal IC is significant except beta and momentum in P3, and both flip sign
across periods. Momentum's +0.21 in the one-period check was a feature of that year, not a stable
premium in this sample.

## 4. Across periods

| Model | Mean IC (P1, P2, P3) | Mean IC, P1 & P3 | Inside, pooled (n 748) | Kupiec LR (p) | Median err (mean of periods) | Abs err | Top − bottom |
|---|---|---|---|---|---|---|---|
| Shipped, own P/E exit | −0.01 | −0.05 | 42% | 513 (<.001) | −18 | 35 | −9 |
| Shipped, industry P/E exit | −0.01 | −0.04 | 40% | 569 (<.001) | −19 | 35 | −3 |
| v2, IC 0 | −0.10 | −0.12 | 78% | 2.5 (0.12) | −18 | 33 | −5 |
| **v2, IC 0.05** | −0.05 | −0.07 | **78%** | **1.9 (0.16)** | −18 | 33 | +3 |
| v2, IC 0.05, EWMA 0.94, on median | −0.05 | −0.07 | 79% | 0.3 (0.56) | −18 | 33 | +3 |
| v2, IC 0.05, EWMA 0.97 | −0.05 | −0.07 | 80% | 0.0 (0.97) | −18 | 33 | +3 |
| v2, IC 0.05, EWMA 0.97, on median | −0.05 | −0.07 | 81% | 0.6 (0.43) | −18 | 33 | +3 |
| v2, IC 0.05, 1Y realised | −0.05 | −0.07 | 84% | 8.8 (0.003) | −18 | 33 | +5 |
| v2, IC 0.05, 1Y realised, on median | −0.05 | −0.07 | 86% | 20.8 (<.001) | −18 | 33 | +5 |

### Which volatility? (all IC 0.05; inside Bear–Bull by period P1 / P2 / P3)

| Volatility | Band centre | P1 | P2 | P3 | Range across periods | Pooled | Std. log error sd, P1 / P2 / P3 (1.0 = calibrated) | Stocks at the 20% floor, P3 |
|---|---|---|---|---|---|---|---|---|
| EWMA λ 0.94 (spec) | mean | 86% | 93% | 56% | 37 pts | 78% | 0.81 / 0.73 / 1.37 | 58 |
| EWMA λ 0.94 | median | 88% | 92% | 59% | 33 pts | 79% | | |
| EWMA λ 0.97 | mean | 88% | 93% | 60% | 33 pts | 80% | 0.78 / 0.72 / 1.26 | 40 |
| EWMA λ 0.97 | median | 89% | 93% | 63% | 30 pts | 81% | | |
| 1Y realised (equal weights) | mean | 87% | 91% | 75% | 16 pts | 84% | 0.73 / 0.78 / 0.96 | 5 |
| **1Y realised** | **median** | **90%** | **89%** | **80%** | **11 pts** | 86% | | |

Coverage by volatility third in P3 (low … high vol) was 52 / 51 / 64% for EWMA 0.94, 57 / 50 / 74%
for EWMA 0.97, and 74 / 77 / 75% for 1Y realised. The EWMA bands failed mostly on the calmest
stocks: their recent calm was read as low risk. The 1Y band was even across the volatility range.

**λ 0.97 is only a marginal fix.** Its half-life is about 23 trading days instead of 11, so it still
reads the quiet weeks before October 2025 as low risk (40 stocks at the floor, 60% coverage in P3).
Its pooled 80% is the average of two over-wide periods and one badly narrow one, not calibration.
**1Y realised volatility** is the only estimate that held up in the falling year: 75%, or 80%
centred on the median, with the standardised error sd at 0.96. It is also the steadiest across
periods (11–16 pts of spread against 30–37). Its cost is being too wide in the two calmer years
(87–91%, sd 0.73–0.78). That is why its pooled 84–86% is rejected by Kupiec as *too wide*. With two
independent years, and the one hard year calibrated, a band that is consistently a little wide is
the better error than one that swings from 93% to 56%. Narrowing it (a z below 1.28, or a lower
floor) would be fitting to these three periods, so it was not done.

**On the Kupiec test.** It assumes independent misses. Here they are not: misses within a period
share the market's move, which is why one period can sit at 56% and another at 93%. So the per-period
rejections overstate the evidence against the vol band. The pooled non-rejection is closer to the
truth, but it rests on only two independent years. The shipped band's 42% is far enough from 80% that
no correlation adjustment rescues it.

## 5. What the numbers say

1. **Range.** A band from each stock's own volatility gets the order of magnitude right. A typical
   stock needs 80–140 pts of 80% range over a year, not the ~45 pts of the scenario band. Its
   remaining error is timing. The EWMA with λ 0.94 has a half-life of about 11 trading days, so the
   band is set by the last few weeks: too wide after a sell-off (P2, 93%), too narrow before one
   (P3, 56%). A slower EWMA (λ 0.97) only softens this (60% in P3). The 1Y realised volatility
   held 80% in P3 when centred on the median, at the cost of 89–90% in P1 and P2. Centring on the
   lognormal median is the theoretically right centre for a quantile band, and it adds 2–5 pts of
   coverage in a falling year.
2. **Multiple reversion.** Holding today's P/E removed the period where the shipped Base turned
   negative (P3: −0.12 → +0.01 on the same stocks), and the score was positive in P1 and P2. The
   differences are within noise (CIs of ±0.13), so this is "no longer harmful", not "useful".
3. **CAPM anchor.** It gives the Base a defensible meaning: the return the market prices in for
   that beta, plus a small tilt. The level error is unchanged (median −18 pts across periods), since
   neither model can foresee the market's year. Abs error is slightly lower (33 vs 35 pts). Ranking
   by v2 Base is ranking by beta, so its IC follows the market's direction. Market-adjusted, it is
   ~0 in every period (−0.04 / +0.01 / −0.00), which is what a well-specified, low-skill model should
   show.
4. **IC 0.05 shrinkage.** With σ ~35% and z within ±3, the tilt is at most about ±5 pts, so beta
   still dominates the cross-section. That is the intended Grinold–Kahn behaviour: a weak signal
   should barely move the forecast. The mean top − bottom spread went from −5 (IC 0) to +3 pts
   (IC 0.05), consistent with a small positive signal, but not significantly.
5. **Loss-makers.** On the market anchor and vol range only, they are no longer ranked by a P/S
   reversion. The shipped P/S group had IC −0.48 in the one-period check.

## 6. Recommendation: what to ship

| Part | Ship? | Why |
|---|---|---|
| Volatility-based Bear/Bull, (1+Base)·exp(∓1.28σ√h) − 1, 20% floor | **Yes** | Pooled 78% vs 42%. Closer to 80% than the shipped band in every period |
| …on **1Y realised volatility** (not EWMA) | **Yes** | 90 / 89 / 80% by period against 86 / 93 / 56% for EWMA λ 0.94 and 88 / 93 / 60% for λ 0.97. It is the only estimate calibrated in the falling year, and the steadiest. It is a little wide in calm years (pooled 86%, Kupiec rejects as too wide); don't narrow it on three periods. Re-test as periods accrue |
| Band centred on the lognormal median | Yes | Correct for a quantile band. With 1Y vol it took P3 from 75% to 80% |
| Drop multiple reversion (hold today's P/E over 1 year) | **Yes** | Removes the anti-momentum tilt that drove the P3 failure. Never worse in any period |
| Growth fade 0.55 and margin toward ½(own + industry median) | Yes, as part of the score | Conservative toward long-run rates; not separately tested against fade 0.4 here |
| CAPM anchor rf + β·ERP (Blume β) | **Yes, as the level** | Puts every Base on a market-consistent footing (~rf + ERP for a beta-1 stock) instead of "the multiple goes back to X". Show the inputs (rf, ERP, β) |
| Grinold–Kahn tilt with IC 0.05 | **Yes** | Keeps fundamentals as a small adjustment, which is all the evidence (+0.06 mean IC, never significant) supports. Don't raise the IC without more periods |
| Loss-makers: market anchor + vol range only | **Yes** | Replaces the worst-performing branch (P/S reversion) |
| Presenting Base as a ranking / stock-picking signal | **No** | v2's cross-section is mostly beta; its market-adjusted IC is ~0 |

Wording: v2's Base can honestly be described as "the return the market's pricing implies for this
stock's risk, adjusted slightly for its fundamentals". Bear–Bull becomes "8 in 10 one-year outcomes
for a stock this volatile", using 1Y volatility. With EWMA volatility that sentence would not have held in
P3.

## 6b. The model as built (`src/lib/baskets/projection.ts`)

The site's v2 follows section 6: CAPM anchor with Blume beta, the IC 0.05 tilt on the P/E-held
fundamentals score, and the band on 1Y realised volatility, centred on the lognormal median. It also
**subtracts the dividend yield** from the market return (it projects price, section 7) and keeps the
site's later growth rule (a recent slowdown counts). The script's "Built v2" rows run that exact code
on the same as-of inputs, with each period's rf and ERP in place of today's and today's dividend
yield, which the table doesn't have for past dates:

| | P1 | P2 | P3 | Pooled |
|---|---|---|---|---|
| Inside Bear–Bull | 91% | 90% | 81% | 87% (Kupiec rejects as too wide, p < 0.001) |
| IC (Base vs actual) | +0.01 | +0.02 | −0.10 | mean −0.02 |
| Median error / abs error | −15 / 28 | −12 / 31 | −24 / 39 | |
| Top − bottom fifth (mean) | +7 | +18 | +3 | +9 |

## 7. Limitations

- **Three periods, two independent.** All three fall within one two-year stretch for Indian small
  and mid caps. Coverage and IC need more start dates. A monthly rolling test would multiply the
  periods, but they would overlap heavily.
- **Thin fundamentals in P1 and P2.** Only FY22–FY24: three years, so revenue growth rests on two
  year-on-year changes, and the own P/E target uses one past point. P/E on the start date is annual
  profit, not trailing twelve months.
- **ERP held at the July 2025 figure** for all start dates, and rf is the G-sec yield including
  India's default spread (section 1). Both affect only the level. The 24 Oct 2025 rf is a
  nearby-date figure.
- **Survivorship and look-ahead.** The universe is today's basket content, and restated figures are
  in the as-of years (as in the one-period check).
- **Price, not total return.** Dividends are excluded; CAPM's rf + β·ERP is a total-return
  expectation, so v2's Base overstates expected *price* return by the dividend yield (about 0.5–1.5
  pts for this universe). A shipped version should subtract trailing yield or say "total return".
- **1-year horizon only.** The √h scaling for 2 years is untested, and the 2Y Base would need the
  tilt to decay (a 1-year IC doesn't carry to year 2).

Sources: [Damodaran, Country Risk 2025 (Musings on Markets, July 2025)](https://aswathdamodaran.blogspot.com/2025/07/country-risk-2025-story-behind-numbers.html);
[Damodaran, country default spreads and risk premiums (Jan 2026)](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/ctryprem.html);
[Crisil Rateview, November 2024](https://www.crisil.com/en/home/our-analysis/views-and-commentaries/2024/11/rateview-november-2024.html);
[Aditya Birla Sun Life daily fixed income tracker, 28 Apr 2025](https://mutualfund.adityabirlacapital.com/-/media/knowledgecenter/pdf/all-about-market/daily-fixed-income-tracker-28-apr-2025.pdf);
[Trading Economics, India 10Y yield news](https://tradingeconomics.com/india/government-bond-yield/news/498482).
Method references: Blume (1971, 1975) beta adjustment; J.P. Morgan RiskMetrics (1996) EWMA λ 0.94;
Grinold & Kahn, *Active Portfolio Management* (2nd ed., 2000), forecast = IC × σ × score; Kupiec
(1995) proportion-of-failures test.
