# Basket projections

A **Projections** switch on every basket page (industry, rule-based, saved, a draft). With it on,
every line on the chart starts at 0% today and runs 1 or 2 years ahead under a Bear, Base or Bull
case; the cards, the stock table, the Breakdown, the statistics and the analysis all describe that
projection instead of the backtest. With it off, the page is exactly the backtest it is today.

This note is the design: what the page does today (so the projection keeps its rules), the model,
and how each panel behaves. Built in `src/lib/baskets/projection.ts` (the per-stock model),
`src/lib/baskets/projection-basket.ts` (combining stocks, paths, simulation), and the basket
components named below.

## 1. What the page does today (the rules projections keep)

**One selection** (`selection.ts`): stocks, custom weights as typed, chart lines (up to 18, colour
slot per stock, never reused while taken), picked-from, Undo. Projections read it and never change
it: ticking a box, Select all / Clear all, the Stocks menu, Your picks, removing with Undo and
custom weights all work the same with the switch on, and the projection follows at once.

**Weights.** Equal, M-cap, Custom (typed in Target %, total 100%, Reset to equal / market cap, Done).
The backtest uses the last valid set (`strategy.weights`); so does the projection. Compared industry
baskets run at equal weight when this basket is custom; so do their projections.

**Picks.** "Your picks" (card and table scope) is the picked stocks as their own basket at the
same weighting (custom: the whole basket's %s scaled up within the picks).

**Chart.** Basket (thick accent), Not rebalanced (when rebalanced), up to 3 industry baskets,
industry indices and the market (Nifty 50, Sensex), up to 18 stocks. Each line is rebased to 0% at
its own first point; one shared date grid; crosshair shows every line's value at a date in the
rows under the chart (rows keep a fixed order); zoom with pinch / Ctrl+scroll / + −.

**Panels.** Return cards (always four: basket, Your picks, Not rebalanced, Nifty 50), the chart, the
Stocks panel (Table: Target %, Now %, Return, Pts added, P/E, M-cap, Since added; Breakdown: Pts
added, Returns, Weights, By industry), Backtest analysis (Drawdown, Monthly, Rolling 1Y, Capture)
and Backtest statistics (14 cells).

## 2. What changes with the switch on

| Part | Backtest (off) | Projection (on) |
|---|---|---|
| Period control | 1M 6M 1Y 2Y 3Y 5Y | **Next 1Y · 2Y**, plus **Bear · Base · Bull** and **Exit at: Own P/E · Industry P/E** |
| Rebalancing | Never / Monthly / Quarterly / Drift | Kept, greyed: a projection is bought today and held |
| Chart | Past range, each line from 0% at its start | Today → +1Y/+2Y, **every line from 0% today**: basket, compared industry baskets, each picked stock; the basket's likely range (8 in 10 simulated paths) as two thin lines |
| Indices (Nifty, Sensex, industry index) | Drawn | Listed, "not projected" (we have no forecast for an index) |
| Return cards | Basket · Your picks · Not rebalanced · Nifty 50 | Basket · Your picks · Bear to Bull · Likely range |
| Stock table | Target % · Now % · Return · Pts added | Target % (after left-out stocks' share is spread) · End % · Projected return · Pts added; a left-out stock says why |
| Breakdown | Past range | The same four charts for the projection ("over the next 1 year") |
| Analysis | Drawdown, Monthly, Rolling 1Y, Capture | **Drawdown** (typical and bad 1-in-10 path), **Paths** (bear / base / bull and the likely range), **Assumptions** (each stock's growth, margin, exit multiple, method and years of data) |
| Statistics | 14 backtest cells | Projected return, per year, bear, bull, likely range, chance of a loss, volatility, typical and bad-case max drawdown, return per unit of risk, top and bottom contributor, stocks projected, Nifty "not projected" |

Settings live in the page URL (`proj=1`, `ph=1|2`, `ps=bear|base|bull`, `pe=own|ind`) like the
weighting, so a link reopens the same projection.

## 3. Which stocks are projected

A stock is projected only with **at least 3 consecutive fiscal years of revenue and net profit**
(ending at its latest reported year) **and** a price and market cap in our last data update.
Anything else is **left out**:

- its share of the basket (or of your picks) is spread across the projected stocks **in proportion
  to their own weights**, so the projected weights still total 100%;
- the first time the switch goes on with such a stock in the basket, a short note says which stocks
  were left out, why, and how their share was spread (it can be opened again from the "N left out"
  chip);
- its row says "Left out: N years of results (needs 3)"; a chart line it has is listed, not drawn.

When every stock (or every pick) is left out, the projection says so instead of showing 0%.

## 4. The per-stock model (`projection.ts`, pure, unit-tested)

Inputs, all from the company table (the same figures shown everywhere): five fiscal years of revenue
and net profit, today's price, market cap and P/E (on trailing earnings), the price CAGRs (1, 3, 5
years) and the date of the data. Industry medians (P/E, price to sales) come from the stock's home
industry in the same table.

1. **Growth.** Revenue growth in each year of the run. History is the median year (or the CAGR if
   lower: FY22 was a low post-Covid base for many companies). Every case then fades 40% of the way
   toward 10% a year (about India's nominal GDP growth), since fast growth rarely lasts. Bear and
   Bull sit the same distance either side of Base: a quarter of the range of its years, at least 3
   points. Bounded to −25% … +40% a year.
2. **Margin.** Net margin each year (a one-off year flagged by `outliers.ts` is left out when two or
   more remain). Bear aims at the lowest, Bull at the highest, Base halfway between today's margin
   and the median. The margin moves a third of the way a year toward its aim, and by no more than 15%
   of today's margin a year (a thin margin can't double in the model).
3. **Exit multiple.** *Own P/E*: the median of today's P/E and its P/E 1 and 3 years ago (price then,
   from the price CAGRs, over that year's profit). *Industry P/E*: the home industry's median. Either
   target is held within 0.7× and 1.4× today's P/E, and today's P/E moves a third of the way a year
   toward it (fully over 3 years). Bear takes 10% off the exit multiple, Bull adds 10%.
4. **Price.** Return = (exit P/E ÷ today's P/E) × (1 + growth)^years × (margin then ÷ margin today) − 1.
   Earnings grow from today's trailing earnings, so the share count drops out and dilution data
   isn't needed.
5. **Loss-makers** (no positive P/E, a loss in the latest year, or no positive usual margin): the
   same with **price to sales** in place of P/E and revenue in place of earnings (revenue moved up
   from the fiscal year's to today's at the Base rate), exit ±20% for Bear and Bull. Marked "P/S".
6. **Bounds.** A case's return is kept within −60% … +80% a year; a stock at a bound is marked
   "capped" in Assumptions.

Across the 273 stocks projected on 24 Oct 2026 (7 left out), the median one-year return is Bear −10%,
Base +16%, Bull +43% (own P/E); 10 stocks have a capped case.

Every figure is rounded for display only; the sums use full precision, so the points added always
total the basket's projected return.

## 5. Basket, picks, compared baskets (`projection-basket.ts`)

- **Basket path.** Bought today at the target weights (after spreading left-out shares) and held:
  value(t) = Σ wᵢ (1 + Rᵢ)^(t/h). Points added = wᵢ Rᵢ; end weight = wᵢ (1 + Rᵢ) ÷ (1 + R).
- **Stock lines.** (1 + Rᵢ)^(t/h) − 1 from 0% today.
- **Compared industry baskets.** Worked out on the server for each weighting, horizon, case and exit
  (`compareProps`), so the chart needn't load their stocks.
- **Dates.** One point a week from today's last close for 52 or 104 weeks (`Week of …` on the
  crosshair, like the 3Y and 5Y backtests).
- **Likely range, drawdown, chance of a loss.** 1,000 simulated weekly paths (seeded, so the same
  settings always give the same figures) with the case's return as the median and the basket's own
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
line: "Model projection from reported financials and past prices, not a forecast or a
recommendation." The research-analyst disclosure (registration number, link) goes in the footnote
once the owner supplies the number.
