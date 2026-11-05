# Factor backtest: which simple signals rank covered stocks? (5 Nov 2026)

**Question.** v2's Base ([PROJECTIONS.md](./PROJECTIONS.md)) gets its range right but does not rank
stocks (IC about 0 over three periods). Would a standard factor signal (momentum, value, quality, low
volatility) or a fixed combination of them do better, tested on many monthly snapshots instead of three
annual ones?

**Short answer.** Only momentum. Over 46 monthly snapshots (Oct 2022 – Jul 2026), the stock's past-year
return (12-1 momentum) ranked the next 3 months' returns with a mean IC of **+0.09 (t 3.3), positive in 78%
of months**, and it held inside industries (+0.08, t 4.1). Over the next 12 months it was +0.11 but not
reliably (t 1.7; negative for snapshots taken in 2024). Value, quality, growth and low volatility were flat
or the wrong way round in this universe and period, and adding them to momentum only diluted it. Beta,
which orders v2's Base, had IC ≈ 0: the doc's earlier conclusion stands.

Reproduce: `npx tsx scripts/validate-factors.ts [--json out.json]` (read-only; prices from the price store,
FY figures and market cap from the company table; about 75 seconds).

## 1. Method

- **Universe.** `listBasketUniverse()` today: 447 covered companies, 446 with prices. About 355–370 have
  enough history at each snapshot.
- **Snapshots.** Every month-end with a full year of prices behind it: 31 Oct 2022 onwards (the store
  starts 22 Oct 2021). 12-month horizon: 37 snapshots to Oct 2025. 3-month horizon: 46 to Jul 2026.
- **Signals, fixed in advance, nothing fitted.** Higher means expected to do better:

| Signal | Definition on the snapshot date |
|---|---|
| MOM12_1 | Close 1 month ago ÷ close 12 months ago − 1 |
| MOM12 | Past-year return (the v1 check's benchmark) |
| VALUE_EY / VALUE_SY | Last public FY net profit / revenue ÷ market cap then |
| QUAL_MARGIN | Last public FY net margin |
| QUAL_STABLE | Share of reported years profitable, ties broken by margin |
| GROWTH | Last public FY revenue growth |
| LOWVOL | Minus 1Y realised volatility |
| SMALL | Minus log market cap |
| BETA | Blume beta on up to 2Y of weekly returns vs Nifty 50 (what orders v2's Base) |
| C_MQ, C_MQV, C_MQVL | Equal-weight mean of cross-sectional percentiles of momentum + margin (+ earnings yield, + low vol) |

- **Point in time.** FY *y* (ending 31 Mar *y*) counts as public from 1 June *y*. Market cap then is
  today's × close then ÷ today's close (share-count changes ignored). A stock-month with a one-day move over
  60% (log) is dropped as a bad bar.
- **Scoring.** For each snapshot: Spearman IC of the signal with the forward return. Also IC on returns
  minus the home industry's median (industries with 5+ stocks), and the top-fifth-minus-bottom-fifth
  forward return. Mean IC across snapshots, with Newey-West t-statistics (lag = months of overlap: 11 for
  12M, 2 for 3M).

## 2. Results

### 3-month forward return (46 snapshots; Nifty mean +1.9% per window)

| Signal | Mean IC | t | IC > 0 | Within industry (t) | Top − bottom fifth |
|---|---|---|---|---|---|
| **MOM12_1** | **+0.090** | **3.3** | **78%** | **+0.081 (4.1)** | **+7.3 pts** |
| MOM12 | +0.088 | 3.0 | 72% | +0.078 (3.6) | +6.9 |
| C_MQ (mom + margin) | +0.042 | 2.0 | 63% | +0.021 (1.2) | +2.1 |
| SMALL | +0.038 | 0.8 | 59% | +0.027 (0.7) | +7.8 |
| C_MQV | +0.031 | 1.3 | 57% | +0.006 (0.3) | +0.3 |
| VALUE_SY | +0.025 | 1.2 | 61% | +0.022 (1.4) | +0.7 |
| C_MQVL | +0.011 | 0.3 | 59% | −0.009 (−0.4) | −4.1 |
| VALUE_EY, QUAL_STABLE, GROWTH, BETA | −0.002 … +0.000 | ~0 | 43–50% | | |
| QUAL_MARGIN | −0.028 | −1.3 | 33% | −0.047 (−2.7) | −3.9 |
| LOWVOL | −0.029 | −0.6 | 48% | −0.029 (−0.8) | −8.2 |

Momentum's top-minus-bottom spread was negative in 8 of 46 months.

### 12-month forward return (37 snapshots; Nifty mean +10.0%, range −10% … +33%)

| Signal | Mean IC | t | IC > 0 | Within industry (t) | Top − bottom fifth |
|---|---|---|---|---|---|
| MOM12 | +0.123 | 1.8 | 68% | +0.087 (2.2) | +34.7 pts |
| MOM12_1 | +0.113 | 1.7 | 65% | +0.079 (2.0) | +34.1 |
| SMALL | +0.101 | 1.1 | 65% | +0.066 (1.0) | +43.3 |
| VALUE_SY | +0.054 | 1.1 | 54% | +0.054 (1.7) | +10.4 |
| C_MQ | +0.036 | 1.1 | 59% | −0.014 (−0.5) | +5.3 |
| BETA | −0.006 | −0.1 | 43% | +0.012 (0.3) | +11.5 |
| VALUE_EY | −0.019 | −1.0 | 35% | −0.052 (−3.2) | −17.1 |
| QUAL_MARGIN | −0.067 | −2.1 | 16% | −0.105 (−6.3) | −22.5 |
| LOWVOL | −0.085 | −0.8 | 46% | −0.066 (−1.0) | −41.2 |

Mean 12M IC by snapshot year:

| Signal | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| MOM12_1 | +0.23 | +0.28 | **−0.05** | +0.08 |
| SMALL | +0.44 | +0.27 | −0.01 | −0.07 |
| LOWVOL | −0.32 | −0.33 | +0.12 | +0.03 |
| QUAL_MARGIN | −0.21 | −0.11 | −0.02 | −0.02 |
| BETA | +0.15 | +0.12 | −0.11 | −0.08 |

The 12M figures are three-and-a-bit independent years, so a t of 1.7 is weak. Small caps, high volatility
and low margins all paid in the 2023 rally (the median covered stock rose 50–75% over 12 months from early
2023 snapshots) and stopped paying from 2024. That is one regime, not a stable effect.

## 3. Caveats

- **Survivorship.** The universe is today's covered companies. Names chosen in 2025–26, partly because
  they are thriving thematic stocks, are scored back to 2022, and failures that left the market aren't
  there. This inflates levels and probably flatters SMALL, MOM and high-volatility names in 2022–23.
- **Quality is a thin proxy.** ROE/ROCE exist only as today's value, so they would look ahead; margin and
  profitable years are what's available point in time. FY figures are Screener's current (restated)
  numbers.
- **Market cap then** ignores share issuance since, which matters most for recent fund-raisers.
- **Overlap.** 12M windows overlap 11 of 12 months; the Newey-West t corrects for this, but some
  within-industry t values (−6 to −9) are larger than 37 overlapping dates can really support.

## 4. What this means for projections

1. **Don't add value, quality or a multi-factor composite to the tilt.** None worked here, and they diluted
   momentum.
2. **Momentum is the only candidate.** The honest size: IC about 0.05–0.09. Through v2's Grinold–Kahn
   tilt (IC × σ × z), a stock 1 SD above the median at σ 36% moves its 1Y Base by about +2 to +3 pts. That
   is real across a basket and small for one stock.
3. **Show it as its own labelled signal rather than folding it into Base.** For example "Trend: top fifth of
   covered stocks over 12 months", with this track record next to it. It is strongest at 3 months and
   unreliable at 12 months (2024's reversal), while Base is a 1-year figure.
4. **Base still shouldn't be read as a ranking.** Beta, what orders it, had IC ≈ 0 at both horizons.
