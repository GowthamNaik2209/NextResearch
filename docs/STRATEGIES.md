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
| **Weighting** | Built: equal, market cap, custom (each stock's % set by hand), layer-balanced. Ideas: inverse volatility, capped (max % per stock or per layer), exposure-weighted (by our exposure strength) |
| **Schedule** | Never (buy and hold, today), monthly, quarterly, on drift (when a stock moves > *x* points off its target weight) |
| **Exits & risk** | Stop-loss per stock, trailing stop, basket-level trend filter (to cash below the 200-day average), max drawdown circuit breaker, re-entry rule |

Every result shows the same panel as today (return, CAGR, drawdown, Sortino, beta, capture) plus
**turnover, number of trades, an estimate of costs** (brokerage, STT, stamp duty, GST, slippage)
and a **trade log**. Trades fill at the next bar's close (never the signal bar's), so a rule
can't trade on the price it just saw.

## Strategy ideas

### A. Rebalancing (built: the basket page's Weighting and Rebalancing controls)

Built in src/lib/baskets/rebalance.ts (pure, unit-tested) and src/lib/baskets/strategy.ts (the
query string that names a strategy: `w=equal|mcap|custom|layer`, `cw=TICKER:40,TICKER:60` for
custom weights, `rb=never|monthly|quarterly|drift`, `band`). The page's own URL writes the
weighting as `wt` so it can't clash with a host page's parameters. Calendar rebalances trade at
the close of the first bar of the new month or quarter; the drift rule trades the bar after the
drift is seen. Turnover and trade counts are reported (and each rebalance in the CSV); costs are
not yet taken off.

**Names on screen** (src/components/baskets/labels.ts): the controls are *Weighting* (Equal, M-cap,
Custom, Layers) and *Rebalancing* (Never, Monthly, Quarterly, Drift). Panel titles name the period and
the settings in words, built from the live strategy ("Backtest · past 1 year · equal weight, not
rebalanced"); the unrebalanced comparison line and card are "Not rebalanced". Baskets are called
*industry* (or *policy*) *baskets* (every listed stock on a map), *rule-based baskets* (the ideas,
picked by a fixed rule and re-ranked daily) and *your baskets* (saved).

**Custom weights** (each stock's target %, totalling 100) replaced the earlier *Capped* weighting.
Old links with `w=capped` still open, read as market cap; their `cap` and `lcap` parameters are
cleared from the URL. Adding a stock gives it an equal share (or back the % it had, if it was taken
off this visit) and shrinks the rest in proportion; removing one scales the rest back up to 100%.

**What a saved basket stores:** `Basket.weighting` (EQUAL or MCAP) plus `Basket.customWeighting`
(true when custom) and each `BasketItem.weight` (its custom %). The weights are kept when the
owner switches to Equal or M-cap, so switching back to Custom restores them. Layer-balanced and
every rebalancing rule still live only in the page URL until a `Strategy` model is migrated.


1. **Equal weight, rebalanced monthly / quarterly.** The simplest improvement over buy-and-hold:
   trims winners, tops up laggards. Compare side by side with the held version.
2. **Drift band.** Rebalance only when any stock is more than 5 points off target. Fewer trades
   than a calendar rebalance.
3. **Custom weights** (built). Each stock's % set by hand, saved with the basket. It replaced an
   earlier *capped market cap* weighting (no stock above 15%, no layer above 35%), which could
   come back as a preset that fills in custom weights.
4. **Layer-balanced** (built, URL only). Equal weight *per value-chain layer*, then equal within it. A balanced bet
   on the whole chain instead of whichever layer has the most listed names. Unique to us.

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
