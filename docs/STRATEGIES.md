# Basket strategies: what users could build

Today a basket backtest is **bought once and held** (src/lib/baskets/backtest.ts). A strategy adds
rules on top of a basket: *when* to rebalance, *which* stocks to hold, *how much* of each, and
*when* to step out. This note lists the ideas, the building blocks they share, and what each
one needs from data, so they can be built in order.

The angle that sets NextResearch apart from generic rule builders (Streak, Tradetron, Smallcase)
is that the universe and many rules come from **our own value-chain data**: layers, exposure,
bottlenecks, policies. Generic price rules are table stakes; chain-aware rules are the reason to
pick us.

## The building blocks

Every strategy is the same five parts, chosen from menus (no code). Stored as JSON, so a strategy
can be saved, shared by link, versioned and re-run.

| Part | Choices |
|---|---|
| **Universe** | A basket (yours, an industry's, an idea), an industry layer ("EV battery cells"), a policy's beneficiaries, your watchlist |
| **Selection** | All; top / bottom *N* by a ranking; those passing a filter |
| **Weighting** | Built: equal, market cap, custom (each stock's % set by hand). Ideas: inverse volatility, capped (max % per stock or per layer), exposure-weighted (by our exposure strength) |
| **Schedule** | Never (buy and hold, today), monthly, quarterly, on drift (when a stock moves > *x* points off its target weight) |
| **Exits & risk** | Stop-loss per stock, trailing stop, basket-level trend filter (to cash below the 200-day average), max drawdown circuit breaker, re-entry rule |

Every result shows the same panel as today (return, CAGR, drawdown, Sortino, beta, capture) plus
**turnover, number of trades, an estimate of costs** (brokerage, STT, stamp duty, GST, slippage)
and a **trade log**. Trades fill at the next bar's close (never the signal bar's), so a rule
can't trade on the price it just saw.

## Strategy ideas

### A. Rebalancing (built: the basket page's Weighting and Rebalancing controls)

Built in src/lib/baskets/rebalance.ts (pure, unit-tested) and src/lib/baskets/strategy.ts (the
query string that names a strategy: `w=equal|mcap|custom`, `cw=TICKER:40,TICKER:60` for
custom weights, `rb=never|monthly|quarterly|drift`, `band`). The page's own URL writes the
weighting as `wt` so it can't clash with a host page's parameters. Calendar rebalances trade at
the close of the first bar of the new month or quarter; the drift rule trades the bar after the
drift is seen. Turnover and trade counts are reported (and each rebalance in the Excel export); costs are
not yet taken off.

**Names on screen** (src/components/baskets/labels.ts): the controls are *Weighting* (Equal, M-cap,
Custom) and *Rebalancing* (Never, Monthly, Quarterly, Drift). Panel titles name the period and
the settings in words, built from the live strategy ("Backtest · past 1 year · equal weight, not
rebalanced"); the unrebalanced comparison line and card are "Not rebalanced". Baskets are called
*industry* (or *policy*) *baskets* (every listed stock on a map), *rule-based baskets* (the ideas,
picked by a fixed rule and re-ranked daily) and *your baskets* (saved).

**Custom weights** (each stock's target %, totalling 100) replaced the earlier *Capped* weighting.
Old links with `w=capped` still open, read as market cap; their `cap` and `lcap` parameters are
cleared from the URL. Adding a stock gives it an equal share (or back the % it had, if it was taken
off this visit) and shrinks the rest in proportion; removing one scales the rest back up to 100%.

**One selection per basket page** (`src/lib/baskets/selection.ts`, unit-tested): the stocks, their
custom weights, the chart's lines, where each stock was picked from and what was just taken off all
change together through one reducer, so the picker, the stock table and the chart's Stocks menu
never disagree. The stock table is the one list of the basket's stocks: each row's box draws its
chart line (the same action as its switch in the Stocks menu, up to 18 lines; Select all and Clear
all in both places), Custom weights are typed in its Target % column (total, Reset to equal / to
market cap and Done above the rows), and its × hides a line in *Your picks* or, while editing your
basket or a draft, takes the stock out of the basket in *All stocks*. Removing is soft: the row
becomes a "Removed X · Undo" placeholder of the same height in its place (also in the header's
status line) while the offer is open, and Undo restores its place, weight and line; a removed
stock's line is dropped, never handed to another stock; a save that fails reloads the basket and
its weights and lines with it.

**What the chart opens on** (changed Oct 2026, owner's call): a basket of up to 24 stocks (each its own
line style: every rule-based basket, most of your own, small industries) opens with every stock's line
on; a bigger one opens on the basket alone. Every kind of basket can draw every one of its stocks (up to
75 lines); past 24 the line styles repeat, so hovering a row under the chart previews its line and
tapping its swatch pins it. A basket from an industry (its page, or a saved basket or draft copied from
one) opens compared with the Nifty 50, its index and that industry's basket; any other (rule-based, your
own mix) with the Nifty 50 alone. The table and the Stocks menu list the stocks in one order (the table's
sort), and Select all in either place draws them in that order. The statistics have their own All /
Picks switch (picks measured as their own basket, in the backtest and the projection).

**What a saved basket stores:** `Basket.weighting` (EQUAL or MCAP) plus `Basket.customWeighting`
(true when custom) and each `BasketItem.weight` (its custom %). The weights are kept when the
owner switches to Equal or M-cap, so switching back to Custom restores them. Every rebalancing rule
still lives only in the page URL until a `Strategy` model is migrated. Each `BasketItem.pickedFrom`
keeps the industry slug the stock was picked from in the stock picker (checked against the content's
industry and policy slugs by `src/lib/baskets/picked-from.ts`), so its layer label stays the one it
was picked in after a reload (Bharat Forge picked from EV reads "Electric motor & e-axle"). With none,
a stock reads in the basket's `sourceSector`, else its home industry.

**Projections** (built Oct 2026; design and model in docs/PROJECTIONS.md): a switch beside Weighting
and Rebalancing turns every panel from the past backtest to a 1- or 2-year projection from today (Bear,
Base, Bull; exit at own or industry P/E). It reads the same selection, weights and picks, so ticking
lines, Your picks and custom weights work the same with it on; stocks with under 3 years of results
are left out and their share spread over the rest. Settings live in the URL (`proj`, `ph`, `ps`, `pe`).

**Layer-balanced weighting was removed** (owner's call, Oct 2026): the Weighting control is Equal ·
M-cap · Custom. It only ever lived in the URL (saved baskets store EQUAL, MCAP or custom, so no data
changed); an old link with `w=layer` (or `wt=layer`) opens at equal weight.

**Stocks joining on their own start date** (`src/lib/baskets/walk.ts`, `JoinOptions` in backtest.ts,
`join=listing` on the backtest API). A stock may carry a start date (`from`), or with `joinLate` a
stock whose history starts after the basket's first day (listed during the period) joins on its first
bar instead of being left out. The method (changed 2026-10 from "bought at 1/k, the others trimmed",
whose targets added up to more than 100% and whose points could have the opposite sign to a stock's
return): every stock's target share is set aside on the first day; a stock not yet listed has its
share wait in cash (earning nothing) until its first bar, when that money buys it at the close.
Nothing else is traded, so the targets total 100%, each stock's return runs from the day it joined
(its "since listing" return), and in a basket that is never rebalanced each stock adds exactly its
target share times that return (they sum to the basket's return). On a rebalanced basket a waiting
share is rebalanced as cash; the purchase on listing counts as one trade. With `joinLate` the walk
also runs over the range's trading days (the Nifty 50's, `calendar`), so the basket starts on the
range's first day like every line beside it: the chart, the return cards, the statistics and the
drawdown all measure the Nifty over the same dates. The Recent listings rule-based basket uses it:
its chart opens on the shortest range reaching back to the earliest listing (up to 2Y), its card
says "since listing", and each row shows the stock's own return since listing. The early part of
that backtest is mostly cash, which the comparison with the fully invested Nifty should be read
with. A saved copy doesn't keep this (it backtests every stock from the period's first day).

**CAGR** is shown only for periods longer than about a year (1.1 years): over 1 year it would only
re-scale the return by the period's exact calendar-day count.

**Custom weights at an even split** (each within a rounding step, 0.1 points, of 100/n, as "Reset to
equal" sets them) are treated as exactly equal, so they give the Equal weighting's figure; "Reset to
market cap" sends the exact market-cap shares, not the one-decimal ones shown.


1. **Equal weight, rebalanced monthly / quarterly.** The simplest improvement over buy-and-hold:
   trims winners, tops up laggards. Compare side by side with the held version.
2. **Drift band.** Rebalance only when any stock is more than 5 points off target. Fewer trades
   than a calendar rebalance.
3. **Custom weights** (built). Each stock's % set by hand, saved with the basket. It replaced an
   earlier *capped market cap* weighting (no stock above 15%, no layer above 35%), which could
   come back as a preset that fills in custom weights.
4. ~~**Layer-balanced**~~ (built, then removed in Oct 2026; old links open at equal weight). Equal
   weight *per value-chain layer*, then equal within it.

### B. Rotation and ranking (price only; needs stored daily history)

5. **Momentum rotation.** Each month hold the top 5 of the basket by 6-month return (skipping the
   last month), equal weight.
6. **Low-volatility tilt.** Hold the 10 calmest stocks of the basket, inverse-volatility weighted.
7. **Relative strength vs the industry index.** Hold stocks beating their own sector index over 3
   months; drop them when they fall behind.
8. **Mean reversion within a layer.** Buy the layer's laggards after a sharp 1-month fall,
   hold for a month. Contrarian, high turnover: shows why costs matter.

### C. Risk rules (price only)

9. **Trend filter.** Move the basket to cash when it closes below its 200-day average; come back
   above it. Shows what happens to the drawdown and the return together.
10. **Stop-loss with re-entry.** Exit a stock 20% below its high since entry; re-enter once it
    recovers above its 50-day average. Trade log shows each exit and re-entry.
11. **Drawdown circuit breaker.** Halve the basket when it is 15% off its high; restore at a new
    high.

### D. Fundamentals (needs point-in-time financials)

Built as **rule-based baskets** on today's company-table snapshot (`src/lib/baskets/kpi-screens.ts`,
unit-tested): today's list, backtested over the past year, so the result is "how today's list did",
not a point-in-time strategy. Each keeps out companies under ₹1,000 Cr, companies with a one-off
year (below) and REITs/InvITs, caps the list at 12, ranks by the one figure shown beside each stock and states its
rule in the card's "i". Each rule-based basket's page shows that figure in a "Picked on" column:

- *Consistent compounders*: revenue and net profit up every year FY22→FY26 (FY22 profit ₹25 Cr+),
  ROCE 15%+; fastest 4-year profit growth first.
- *Growth at a reasonable price*: P/E ÷ FY23→FY26 profit growth (PEG 1.5 or less), lowest first;
  profit growth 15%+ a year from ₹25 Cr+ with no loss since FY22, revenue growth 10%+, ROCE 12%+.
- *Turnarounds*: a net loss in at least one of FY22, FY23 or FY24, then profits in FY25 and FY26 (FY26 higher)
  without shrinking sales; biggest FY26 profit first.
- *Widening margins*: net margin up most from FY23 to FY26, profitable each year, revenue growing
  and ₹500 Cr+.

They avoid the landing page's "Stock screens" (highest ROCE, latest-year revenue growth, lowest P/E
with ROCE above 15%, furthest below the 52-week high, highest dividend yield), so no dividend or
52-week screen is duplicated here. The point-in-time versions below are still to build:


12. **Quality within the chain.** Hold the layer's stocks with ROCE above 15% and debt to equity
    below 1, rebalanced after each results season.
13. **Value within the chain.** Cheapest third of each layer by P/E, re-ranked quarterly.
14. **Growth at a reasonable price.** Revenue growth above the layer's median and P/E below it.

### E. Value-chain and policy rules (our differentiator; needs history of our own data)

15. **Bottleneck plays.** Hold only companies in the layers we flag as bottlenecks for an
    industry (scarce suppliers), equal weight.
16. **Exposure-weighted.** Weight each stock by how directly it is tied to the theme (direct
    supplier > enabler > side exposure), so pure plays count more than conglomerates.
17. **Policy event.** Buy a policy's beneficiaries (PLI, ALMM) on the announcement date, hold
    12 months; compare against the sector index.
18. **Upstream vs downstream.** Two baskets from one industry, raw materials and components
    against assemblers, to show where in the chain returns accrued.
19. **IPO anchor.** Hold an IPO's listed peers from its prospectus deck from listing day.

### F. Comparisons that come free with the engine

20. Same basket, two strategies on one chart (held vs rebalanced vs trend-filtered).
21. "What if I'd started a year earlier/later" start-date slider, so a lucky start date can't
    pass for skill.

## What each group needs

| Group | Data needed | Effort (after the data exists) |
|---|---|---|
| A. Rebalancing | Closing prices we already fetch (1M-2Y daily; 3Y/5Y weekly) | Days |
| B, C. Rotation, risk | Stored daily history (the price-data foundation), so 5Y rules use daily bars | 1-2 weeks |
| D. Fundamentals | Financials **as reported, with the date they became public** (not today's snapshot) | 2-3 weeks plus data |
| E. Value chain | A dated history of our own maps (when a company entered a layer, exposure changes) | 2-3 weeks plus content work |

The engine, cost model and trade log are built once and serve every group.

## One-off years (outliers)

Owner's rule: remove outliers, and let users add them with a note. `src/lib/baskets/outliers.ts`
(unit-tested in `outliers.test.ts`) flags a company whose recent figures are distorted by a one-off
(impairment, write-down, asset or voucher sale, demerger gain, mark-to-market loss) when the company
table marks it `screenOut`, or its FY23-FY26 revenue and net profit show:

1. a single loss year between profitable ones, the drop into it 3%+ of that year's revenue
   (Tata Steel FY24, Info Edge FY23); or
2. a year where net profit moved by more rupees than revenue did, by 8%+ of revenue, with a profit on
   at least one side; a middle year must also reverse by half or more the next year (JSW Steel FY26).

Both need the swing to be at least 1.25x the company's usual profit (median of its other years), so
operating leverage and high-margin wobble don't count. Flagged companies are left out of every
rule-based basket (Biggest gainers, Highest ROCE, Scarce suppliers, In 3+ industries, Recent
listings and the four screens above) and the landing page's Stock screens; each rule's "i" says
"One-off years left out." Users can still add them to their own baskets, where the stock picker and
the Stocks table mark them "one-off" with the reason in a small "i".

**Highest ROCE needs a meaningful ROCE** (`roceMeaningful` in ideas.ts): a positive P/E, a profit in
the latest year and a book value that isn't negative. On a loss or negative equity the ratio can read
50%+ while the business loses money (Tata Teleservices (Maharashtra) did).

## Guarding against flattering results

Show these on every strategy result, not in a footnote:

- **Survivorship:** baskets are today's lists. Mark it, and once the security master exists,
  include stocks that were delisted or merged.
- **Look-ahead:** fundamentals and value-chain rules only use data dated before each trade.
- **Overfitting:** show how many variants the user tried and an out-of-sample split (e.g. build
  on 2019-2023, test on 2024-2026). Flag results that only work in one window.
- **Costs and turnover:** always on by default; the "no costs" figure is the comparison, not the
  headline.
- **Regulation:** research and simulation only. No "signals" to trade, no order placement, no
  return claims in marketing. Get a SEBI check before strategies are sold as a paid tier.

## Suggested order

1. ~~Rebalancing (A1-A4) on the current backtest, side by side with buy-and-hold.~~ Done.
2. Price-data foundation (stored, adjusted daily bars behind a swappable provider).
3. Engine with schedule, selection, weighting, exits, costs and trade log (B, C).
4. Saved, shareable strategies (a `Strategy` model next to `Basket`), Pro gating.
5. Point-in-time fundamentals and dated value-chain history (D, E).
