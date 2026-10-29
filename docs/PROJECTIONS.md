# Basket projections

A **Projections** switch on every basket page (industry, rule-based, saved, a draft). With it on,
every line on the chart starts at 0% today and runs 1 or 2 years ahead under a Bear, Base or Bull
case; the cards, the stock table, the Breakdown, the statistics and the analysis all describe that
projection instead of the backtest. With it off, the page is exactly the backtest it is today.

This note is the design: what the page does today (so the projection keeps its rules), the model,
and how each panel behaves. Built in `src/lib/baskets/projection.ts` (the per-stock model, v2 since
25 Oct 2026), `src/lib/baskets/projection-risk.ts` and `projection-risk-data.ts` (each stock's beta
and volatility from its prices), `src/lib/baskets/projection-basket.ts` (combining stocks, paths,
simulation), and the basket components named below. Why the model is built this way, and how it
did out of sample: [PROJECTIONS-V2-PROTOTYPE.md](./PROJECTIONS-V2-PROTOTYPE.md) (the first model's
test: [PROJECTIONS-VALIDATION.md](./PROJECTIONS-VALIDATION.md)).

## 1. What the page does today (the rules projections keep)

**One selection** (`selection.ts`): stocks, custom weights as typed, chart lines (every stock, colour
slot per stock, never reused while taken), picked-from, Undo. Projections read it and never change
it: ticking a box, Select all / Clear all, the Stocks menu, Your picks, removing with Undo and
custom weights all work the same with the switch on, and the projection follows at once.

**Weights.** Equal, M-cap, Custom (typed in Target %, total 100%, Reset to equal / market cap, Done).
The backtest uses the last valid set (`strategy.weights`); so does the projection. Compared industry
baskets run at equal weight when this basket is custom; so do their projections.

**Picks.** "Your picks" (card and table scope) is the picked stocks as their own basket at the
same weighting (custom: the whole basket's %s scaled up within the picks).

**Chart.** Basket (thick accent), Not rebalanced (when rebalanced), up to 3 industry baskets,
industry indices and the market (Nifty 50, Sensex), every stock in the basket. Each line is rebased to 0% at
its own first point; one shared date grid; crosshair shows every line's value at a date in the
rows under the chart (rows keep a fixed order); zoom with pinch / Ctrl+scroll / + −.

**Panels.** Return cards (always four: basket, Your picks, Not rebalanced, Nifty 50), the chart, the
Stocks panel (Table: Target %, Now %, Return, Pts added, P/E, M-cap, Since added; Breakdown: Pts
added, Returns, Weights, By industry), Backtest analysis (Drawdown, Monthly, Rolling 1Y, Capture)
and Backtest statistics (14 cells).

## 2. What changes with the switch on

| Part | Backtest (off) | Projection (on) |
|---|---|---|
| Period control | 1M 6M 1Y 2Y 3Y 5Y | **Next 1Y · 2Y**, plus **Bear · Base · Bull** |
| Rebalancing | Never / Monthly / Quarterly / Drift | Kept, greyed: a projection is bought today and held |
| Chart | Past range, each line from 0% at its start | Today → +1Y/+2Y, **every line from 0% today**: basket, compared industry baskets, each picked stock; the basket's likely range (8 in 10 simulated paths) as two thin lines |
| Indices (Nifty, Sensex, industry index) | Drawn | Listed, "not projected" (we have no forecast for an index) |
| Return cards | Basket · Your picks · Not rebalanced · Nifty 50 | Basket · Your picks · Bear to Bull · Likely range |
| Stock table | Target % · Now % · Return · Pts added | Target % (after left-out stocks' share is spread) · End % · Projected return · Pts added; a left-out stock says why |
| Breakdown | Past range | The same four charts for the projection ("over the next 1 year") |
| Analysis | Drawdown, Monthly, Rolling 1Y, Capture | **Drawdown** (typical and bad 1-in-10 path), **Paths** (bear / base / bull and the likely range), **Assumptions** (each stock's beta, volatility, market return, fundamentals tilt, method and years of data) |
| Statistics | 14 backtest cells | Projected return, per year, bear, bull, likely range, chance of a loss, volatility, typical and bad-case max drawdown, return per unit of risk, top and bottom contributor, stocks projected, Nifty "not projected" |

Settings live in the page URL (`proj=1`, `ph=1|2`, `ps=bear|base|bull`) like the weighting, so a
link reopens the same projection. (`pe=own|ind`, the first model's exit choice, is ignored.)

## 3. Which stocks are projected

A stock is projected only with **at least 3 consecutive fiscal years of revenue and net profit**
(ending at its latest reported year), **at least 3 years of trading** (no 3-year price change means it
listed under 3 years ago: its earlier results are from before it listed) **and** a price and market cap
in our last data update.
Anything else is **left out**:

- its share of the basket (or of your picks) is spread across the projected stocks **in proportion
  to their own weights**, so the projected weights still total 100%;
- the first time the switch goes on with such a stock in the basket, a short note says which stocks
  were left out, why, and how their share was spread (it can be opened again from the "N left out"
  chip);
- its row says "Left out: N years of results (needs 3)"; a chart line it has is listed, not drawn.

When every stock (or every pick) is left out, the projection says so instead of showing 0%.

## 4. The per-stock model (`projection.ts`, pure, unit-tested)

**Base is the return the market prices in for the stock's risk, adjusted slightly for its
fundamentals. Bear and Bull are the range 8 in 10 one-year outcomes fall in for a stock this
volatile.** It is a model projection: not a forecast, a target price or a ranking of stocks.

Inputs: from the company table (the same figures shown everywhere), five fiscal years of revenue
and net profit, today's price, market cap, P/E (trailing), dividend yield, 52-week range and price
CAGRs; from the stock's prices (`projection-risk.ts`, Yahoo, 2 years of daily closes, kept in Next's
shared data cache for a day), its beta and volatility; from its home industry in the same table, the
median net margin; and two market inputs set by hand in `MARKET`:

| Input | Value | Source |
|---|---|---|
| rf, India 10-year G-sec yield | 7.47% (23 Oct 2026) | Trading Economics, India 10Y benchmark close 23 Oct 2026 |
| ERP, India's equity risk premium | 7.08% (Jan 2026) | Damodaran, country default spreads and risk premiums (Jan 2026 update): mature market 4.23% + India's country premium 2.85% (Moody's Baa3). His July 2026 India row wasn't retrievable without downloading the spreadsheet; his July mature premium was 4.20%, so the total is very likely within a few tenths |

Update both by hand (a code change) when they move materially: rf after a big move in the G-sec
yield, ERP after each of Damodaran's January and July updates. Strictly, Damodaran adds his country
premium to a default-free rate, and the G-sec yield already carries India's default spread (about
1.9 points), so rf + ERP counts that spread twice; the spec chose the G-sec yield. It moves every
stock's Base by the same amount, never the order of stocks or the width of the range.

1. **Beta.** The slope of the stock's weekly returns on the Nifty 50's over the last 2 years
   (52+ weeks needed), pulled a third of the way to 1 (Blume: 0.67 β + 0.33), since measured betas
   overshoot. No price history: 1.
2. **Volatility σ.** Realised over the last year: √(250 × mean squared daily log return), never
   below 20% a year. Until a stock's price statistics are loaded (the first visits after the cache
   is cleared), σ is estimated from the 52-week range, ln(high ÷ low) ÷ √(8/π), and beta is 1; the
   Assumptions table says so. While a server instance has no statistics at all yet, basket pages
   show a one-line note and refresh themselves every few seconds until they are in
   (`ProjectionStatsPending`), so a first visit doesn't show figures the next visit changes.
3. **Market return** = rf + beta × ERP − dividend yield (a price projection; CAPM gives the total
   return including dividends).
4. **Fundamentals score** (P/E method only: a positive P/E, a profit in the latest year, a positive
   usual margin). One year's return on the business with **today's P/E held** (no move toward a
   past or industry multiple: that reversion made the first model lean toward stocks that had just
   fallen, and it failed out of sample):
   - growth: the lowest of the median year, the CAGR and the average of the median and the latest
     year (so a recent slowdown counts), faded **55%** of the way toward 10% a year (about India's
     nominal GDP growth), within −25% … +40%;
   - margin: a third of the way from today's toward the average of its own median margin (a one-off
     year flagged by `outliers.ts` left out) and its home industry's median, by no more than 15% of
     today's margin a year;
   - score = (1 + growth) × (margin a year on ÷ margin today) − 1.
5. **Tilt** (Grinold–Kahn) = IC × σ × z, with IC = 0.05 and z = (score − median) ÷ standard
   deviation over every listed company we cover, within ±3. A weak signal should barely move the
   forecast: with σ ~35% the tilt is at most about ±5 points. Loss-makers (and stocks without a
   usable P/E or margin) have no tilt: "market" method.
6. **Base** = market return + tilt, a year. Two years: (1 + market) × (1 + market + tilt) − 1 (a one-year
   signal isn't carried into the second year).
7. **Bear and Bull** = the 10th and 90th percentiles of a lognormal outcome with mean Base:
   (1 + Base) × e^(−σ²h/2 ∓ 1.28 σ √h) − 1 for h = 1 or 2 years. Their middle (the median outcome)
   sits below Base: a volatile stock's typical year is below its average one. The return has no cap
   (only the inputs have limits: growth, margins, z, the volatility floor).

Rules for which stocks are projected are as in section 3. Out of sample over three 1-year periods
(Oct 2024 – Oct 2026; [PROJECTIONS-V2-PROTOTYPE.md](./PROJECTIONS-V2-PROTOTYPE.md), "Built v2" rows of
`scripts/validate-projections-v2.ts`), this model's Bear–Bull held 91%, 90% and 81% of actual
outcomes (the first model's: 47%, 48%, 33%); Base's rank correlation with outcomes was +0.01, +0.01
and −0.11: it describes risk and the market's pricing, it does not pick stocks. Today (24 Oct 2026, `scripts/projections-today.ts`): 248 of
280 companies projected; median beta 1.22, volatility 36%, dividend yield 0.4%; median one-year Bear
−31%, Base +15%, Bull +72% (two years: −39% / +34% / +127%); Base ranges from +5% to +25%, the
highest being the highest-beta stocks; 29 on the market method (no fundamentals tilt), 9 at the
volatility floor. The full method,
with a worked example for any stock run through the same code, is on the site at
/baskets/projections.

Every figure is rounded for display only; the sums use full precision, so the points added always
total the basket's projected return.

## 5. Basket, picks, compared baskets (`projection-basket.ts`)

- **Basket path.** Bought today at the target weights (after spreading left-out shares) and held:
  value(t) = Σ wᵢ (1 + Rᵢ)^(t/h). Points added = wᵢ Rᵢ; end weight = wᵢ (1 + Rᵢ) ÷ (1 + R).
- **Stock lines.** (1 + Rᵢ)^(t/h) − 1 from 0% today.
- **Basket Bear and Bull** are the weighted average of each stock's Bear and Bull: every stock at its
  own 10th (or 90th) percentile at once. Stocks don't all have a bad year together, so this is wider
  than the basket's own range; the **likely range** below, from the basket's own volatility, is the
  basket-level range.
- **Compared industry baskets.** Worked out on the server for each weighting, horizon and case
  (`compareProps`), so the chart needn't load their stocks.
- **Dates.** One point a week from today's last close for 52 or 104 weeks (`Week of …` on the
  crosshair, like the 3Y and 5Y backtests).
- **Likely range, drawdown, chance of a loss.** 1,000 simulated weekly paths (seeded, so the same
  settings always give the same figures) with the **Base** case's return as the average whichever case is chosen (Bear and Bull are already the extremes; simulating around Bear would stack a bad year on a bad year; the median path ends a little below Base) and the basket's own
  volatility over the past year (its 1Y backtest). The likely range is the 10th to 90th percentile
  path; drawdowns are each path's worst fall from a high (typical = median path, bad = 1 in 10).
  Without a past-year backtest (it failed to load) those cells say so; the projection itself still shows.

## 6. Edge cases

- Empty basket: the switch is shown but off-limits ("add stocks to see"), as the backtest's panels do.
- All stocks left out, or all picks left out: a sentence in place of the figures.
- A 0% custom weight: not held, as in the backtest ("Set to 0%").
- Custom weights not totalling 100%: the projection keeps the last valid weights, as the backtest does.
- A stock added while the switch is on: projected at once if it has the data; its weight follows the
  usual custom-weight rules.
- Unlisted (no longer mapped) stocks: listed as today, left out of both.
- Rebalanced strategy: the projection ignores it (bought and held) and says so in the panel title.
- Rule-based "since listing" baskets: projections run from today for every stock, so joining dates
  don't apply.
- Phones: the same controls in the header strip; Stocks / Chart switch unchanged.

## 7. Wording and disclosure

Titles say "Projection · next 1 year · base case · equal weight". Every projected panel carries the
line: "Model projection from market pricing, past prices and reported financials, not a forecast or
a recommendation." The research-analyst disclosure (registration number, link) goes in the footnote
once the owner supplies the number.
