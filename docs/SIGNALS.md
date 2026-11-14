# Signals: rule-based entry and exit backtests

A signed-in tool at `/signals`: the user builds entry and exit rules from technical indicators,
backtests them on one covered stock's past prices, and sees every indicator's reading on the last
close. Rules describe what happened ("closed above its 200-day average"); the tool never says buy or
sell. Mock-up: [mockups/signals-preview.html](mockups/signals-preview.html).

| Version | Scope | Database |
| --- | --- | --- |
| v1 | One stock: indicators, rule builder, backtest, readings now; the rules live in the URL | none (reads the price store) |
| **v2 (this)** | Baskets (an industry or the user's own); saved rules per stock or basket that reopen where left; nightly email alerts; the indicators guide; plain-English rules, verdict and badges, "why it traded" | `SignalStrategy`, `SignalEvent` |
| Later | A screen over a whole universe with a holdings cap; valuation and ownership metrics; comparing rule sets side by side | |

## 1. Data

- **Stock:** daily open, high, low, close and volume from the price store (`PriceBar`, about five
  years; `src/lib/prices/store.ts storedDailyBars`), demergers adjusted as on every other chart.
- **Nifty 50:** the store's `^NSEI` daily closes, for relative strength, beta and the benchmark line.
- **Covered stocks (the panel):** every covered company's daily closes, for the Trend percentile and
  relative strength against the industry (`src/lib/signals/data.ts`). Built only when a rule uses one
  of those two, once per server instance at a time, and kept for six hours. A request waits up to 25
  seconds for it; past that it answers "still loading, run again in a minute" while the build carries
  on. Until then the readings show those two as "When used". The default rules don't
  need it, so a first visit never waits on it.
- **Missing inputs:** a stock priced from Screener (two NSE SME listings) has closes and volume but no
  open, high or low; every indicator that needs them is marked unavailable for it, and a rule using
  one is refused with that reason.

## 2. Indicators

Every indicator is a daily series aligned to the stock's bars (`src/lib/signals/indicators.ts`,
`compute.ts`); a value needing more history than there is stays empty, and a rule on an empty value
is false. Catalogue: `src/lib/signals/metrics.ts`.

| Group | Indicators |
| --- | --- |
| Trend | Price; SMA 5/20/50/100/150 (30 weeks)/200/210 (10 months); EMA 9/13/21/26/50/65 (13 weeks); MACD 12,26,9 (line, signal, histogram); ADX 14 with +DI / −DI; Supertrend 10,3; Parabolic SAR 0.02/0.2; Ichimoku 9,26,52 (Tenkan, Kijun, cloud top and bottom); Aroon 25 up / down |
| Momentum | RSI 2, 4 and 14 (Wilder); Stochastic %K 14,3 and %D 3; Stochastic RSI 14; Williams %R 14; CCI 20; return over 1, 3, 6 and 12 months; momentum 12-1; Elder's Force Index (2- and 13-day EMA of change × volume) and Elder-ray bull and bear power (high or low less EMA 13) |
| Volatility | Bollinger 20,2 (upper, middle, lower, %B, width, and the width's 6-month low); ATR 14 as % of price; Keltner 20, 2×ATR 10; historical volatility 60 days |
| Volume | Volume vs its 20-day average; OBV and its 20-day average; Money Flow Index 14; Chaikin Money Flow 20; VWAP 20 days |
| Levels | 52-week high and low and the distance from each; 20- and 55-day highs, 10- and 20-day lows, 7-day closing high and low (all before the day, so a close above is a breakout); Darvas box top and bottom (a top not beaten for 3 days, the low after it not undercut for 3 days; known before the day, the bottom kept until the next box); gap at the open; classic pivot, R1 and S1 from the day before |
| Relative | Trend percentile (past-year return ranked among covered stocks that day); return minus the Nifty 50's over 3 and 12 months; return minus the industry median's over 3 months; Mansfield RS (52 weeks); beta 1 year |

## 3. Rules

- A **condition** is an indicator, a comparison and a number or another indicator of the same kind
  (a price level with a price level, %K with %D, +DI with −DI, MACD with its signal).
  Comparisons: is above, is below, crosses above, crosses below, higher than N days ago, lower than N
  days ago, within X% of.
- **Entry** and **exit** each hold conditions joined by *all* or *any*.
- **Exit controls**, checked on every close: trailing stop (% below the highest close since entry),
  stop loss (% below entry), ATR stop (Chandelier: highest close since entry less k × ATR 22), take
  profit (% above entry), time stop (trading days).
- **When rules are checked:** every close, the last close of each week, or the last of each month.
  Exit controls are checked every close whatever the rule check.
- **Execution:** a signal on a close trades at the **next** close, so a backtest never uses a price
  it could not have known. Costs (0.2% round trip by default) are taken half on entry, half on exit.
- Validation (`src/lib/signals/strategy.ts`): 1-8 entry conditions, 0-8 exit conditions, numbers
  clamped to sensible ranges; unknown indicators or mismatched kinds are refused.
- The strategy is written into the page's URL (`?s=`), so a strategy is kept by bookmarking or
  sharing the link. Saving to the account comes in v2.

## 4. Results

- Growth of ₹100: the rules, the stock bought and held, and the Nifty 50, over the chosen range
  (1, 2, 3 or 5 years; indicators use the history before it, so a 200-day average exists from day one
  when there is enough).
- CAGR, largest fall, Sharpe and Sortino (risk-free rate: the RBI repo rate, `MARKET.rf`), trades,
  win rate, average win and loss, payoff, average days held, share of time invested, and the open
  trade, if any.
- First 60% of the range against the last 40%: a rule that only works in the earlier part was
  probably fitted to it.
- Fewer than 5 closed trades: a note that the figures rest on too few trades to mean much.
- Price chart with the price-level indicators the rules use, entry and exit markers, and the first
  other indicator they use in a strip below. Trade list with each exit's reason.
- **Readings now:** every indicator's value on the last close with a plain state (above / below,
  overbought / oversold, trending), and a + that adds it to the entry rules.
- Trend percentile in the readings is the company table's, as every other page shows it. The
  backtest ranks each past day from the price store's closes, which can differ by a point or two.
- Rules that never enter a trade show "—" for Sharpe and Sortino: a line that stays in cash has no
  risk to measure against.

## 4b. Baskets

- A basket is an industry ("industry:<slug>", every listed stock mapped in it) or one of the user's
  own baskets (`src/lib/signals/targets.ts`). The same rules run on every stock, each in its own
  slot: in the stock while its rules hold it, in cash otherwise (`src/lib/signals/basket.ts`).
- Slots are sized by the basket's weighting (`src/lib/signals/weighting.ts`): equal, market cap, or
  the user's own %, always the basket's saved one (an own basket's as stored, an industry basket's
  equal), for the page and the nightly alerts alike; a line over the results says which. There is no
  weighting control on Signals. The basket's value is the
  weighted average of its slots; "held" is every stock bought on the first day in those weights and
  kept. The page's rebalancing doesn't apply: each stock gets in and out on its own rules. A stock
  listed after the range starts keeps its slot in cash until its first close.
- A stock that can't give an indicator the rules use (no high/low) sits the basket out and is named.
- Results: the tiles, growth of ₹100 with the number of stocks held each day, the split, a signal
  heatmap (each stock's key readings now and whether the rules hold it) and each stock's own figures.
  A click on a stock opens its own backtest with the same rules.

## 4c. Making it easy to read

- **Start from an idea:** the presets as cards with the idea behind each. A picker beside the title
  ("Rules from the books") swaps them for one trading book's rules (`src/lib/signals/books.ts`):
  Wilder, the Turtles (Faith), Connors and Alvarez (two books), Faber, Antonacci, Weinstein, Darvas, Minervini,
  Elder and Bollinger. Each card is our version of a rule the book is known for, built only from the
  catalogue; a book shows only the rules the tool can test (at most 8, never padded), with one line
  on where they differ from the book. Rules that open as a book's idea open with that book showing.
- **Rules in a sentence** above the builder ("Get in when … Get out when …"), from `describe.ts`.
- **Verdict line** over the results: what ₹1 lakh became under the rules and held, then badges: beat
  holding or not, too few trades (under 5), weaker in recent years (the later part ≥ 10 points a year
  below the earlier one).
- **Indicator picker** grouped by the question each answers, with search, showing each indicator's
  one-line note under its name. **One "i" per section**, never one per indicator: the Rules, Readings
  now and heatmap notes link to the **indicators guide** (`/signals/indicators`, content in
  `src/lib/signals/guide.ts`); a readings row or heatmap heading shows its note on hover.
- **Why it traded:** a click on a trade arrow or a trade row shows the close the rule was met on and
  the rules' indicators then.
- **Status strip:** whether the rules hold the stock (or how many of the basket) now, with Save and
  "Email me when they trigger".

## 5. Access and wording

- Signed-in only: the page sends a signed-out visitor to sign in, and `POST /api/signals` answers 401.
- Tablets and computers only for now: under 640 px the Signals button is hidden and the page shows a
  short note instead of the tool (`SignalsGate`), which isn't mounted, so no backtest runs.
- Every result carries: past prices only, no taxes, dividends not added, costs as set; a research
  tool, not investment advice. Words are "entry rule met" and "exit", never "buy" or "sell" calls.

## 6. Saved rules and alerts

- One saved set of rules per user and stock or basket (`SignalStrategy`, `src/lib/signals/saved.ts`),
  at most 50. Opening that stock or basket again loads them; `/signals` with no stock in the link
  reopens the most recently saved one. Saving, the email switch and delete are in "My signals".
- The nightly check (`/api/signals/alerts`, 8:30 pm IST on weekdays, after the evening price
  top-up) runs every saved signal with its email on against the newest close and logs each entry or
  exit met (`SignalEvent`, unique per close, so a second run adds nothing). Each user then gets one
  email listing them (`alert-email.ts`), with a one-click unsubscribe that turns all their alerts off.
- Emails go out only with `SIGNAL_ALERTS_SEND=1` (and the brief's Resend keys); otherwise the check
  logs and sends nothing. `POST /api/signals/alerts/test-send?email=` (local dev only) sends a preview
  built from that user's saved signals and writes nothing.

## 7. Checks

- Unit tests: `src/lib/signals/*.test.ts` (indicator values against hand-worked figures, next-close
  execution, costs, each exit control, weekly checks, validation).
- Before release: phone 360-390, tablet 768, desktop 1280-1920, light and dark, by a fresh reviewer.
