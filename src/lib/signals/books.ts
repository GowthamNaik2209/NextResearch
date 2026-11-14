// "Start from an idea" sets: the site's own ready-made rules, and rules from well-known trading books
// (docs/SIGNALS.md section 4c). Each book's cards are our versions of the rules it is known for, built
// only from this tool's indicators; `adapted` says in one line where they differ from the book. A
// book shows as many cards as it has rules the tool can test, never padded. Pure.
import { MARKET } from "@/lib/baskets/projection";
import { PRESETS, type Check, type SignalRange, type Strategy } from "./strategy";

export type IdeaCard = { id: string; idea: string; label: string; note: string; strategy: Strategy };
export type IdeaSet = { id: string; title: string; author?: string; year?: number; adapted?: string; ideas: IdeaCard[] };

const base = { check: "d" as Check, cost: 0.2, range: "5Y" as SignalRange };
// The 12-month return to beat for absolute momentum: the RBI repo rate, as everywhere on the site.
const RF = Math.round(MARKET.rf * 1000) / 10;

const IDEA: Record<string, string> = {
  "trend-200": "Ride the long trend",
  "golden-cross": "Ride the long trend",
  supertrend: "Ride the trend",
  "trend-top-fifth": "Follow the strongest stocks",
  "rsi-pullback": "Dips within an uptrend",
  "breakout-20": "Catch breakouts",
  "bb-squeeze": "Catch breakouts",
  "macd-adx": "Momentum turning up",
};

export const CLASSIC: IdeaSet = { id: "classic", title: "Popular ideas", ideas: PRESETS.map((p) => ({ ...p, idea: IDEA[p.id] ?? "Idea" })) };

export const BOOKS: IdeaSet[] = [
  {
    id: "wilder",
    title: "New Concepts in Technical Trading Systems",
    author: "J. Welles Wilder Jr.",
    year: 1978,
    adapted: "Long side only; Wilder also traded the short side.",
    ideas: [
      {
        id: "wilder-rsi",
        idea: "Bounce from oversold",
        label: "RSI back above 30",
        note: "In when RSI 14 climbs back above 30 from oversold; out once it reaches 70.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "rsi14", op: "crossAbove", v: 30 }] }, exit: { all: false, conds: [{ m: "rsi14", op: "above", v: 70 }] }, stops: {} },
      },
      {
        id: "wilder-sar",
        idea: "Ride the trend",
        label: "Parabolic SAR",
        note: "In when the price closes above the SAR line; out when it closes back below it.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "psar" }] }, exit: { all: false, conds: [{ m: "close", op: "below", r: "psar" }] }, stops: {} },
      },
      {
        id: "wilder-dmi",
        idea: "Ride the trend",
        label: "+DI crosses −DI",
        note: "In when upward movement (+DI) crosses above downward (−DI); out on the cross back.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "pdi", op: "crossAbove", r: "mdi" }] }, exit: { all: false, conds: [{ m: "pdi", op: "crossBelow", r: "mdi" }] }, stops: {} },
      },
      {
        id: "wilder-adx",
        idea: "Strong trends only",
        label: "Directional movement with ADX",
        note: "In when +DI leads and ADX is above 25 and rising; out when −DI takes the lead.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "pdi", op: "above", r: "mdi" }, { m: "adx", op: "above", v: 25 }, { m: "adx", op: "rising", n: 5 }] },
          exit: { all: false, conds: [{ m: "pdi", op: "crossBelow", r: "mdi" }] },
          stops: {},
        },
      },
    ],
  },
  {
    id: "turtles",
    title: "Way of the Turtle",
    author: "Curtis Faith",
    year: 2007,
    adapted: "Breakouts on the close; the book's 2 × ATR stop (20-day ATR, from entry) is a 2 × ATR 22 stop trailing from the highest close here, and the skip-after-a-win filter is left out.",
    ideas: [
      {
        id: "turtle-s1",
        idea: "Catch breakouts",
        label: "Turtle System 1",
        note: "A close above the 20-day high; out on a close below the 10-day low or 2 × ATR off the high.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "dch20" }] }, exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "dcl10" }] }, stops: { atr: 2 } },
      },
      {
        id: "turtle-s2",
        idea: "Catch breakouts",
        label: "Turtle System 2",
        note: "A close above the 55-day high; out on a close below the 20-day low or 2 × ATR off the high.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "dch55" }] }, exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "dcl20" }] }, stops: { atr: 2 } },
      },
    ],
  },
  {
    id: "connors",
    title: "Short Term Trading Strategies That Work",
    author: "Larry Connors and Cesar Alvarez",
    year: 2008,
    adapted: "Rules on daily closes, as in the book.",
    ideas: [
      {
        id: "connors-rsi2",
        idea: "Dips within an uptrend",
        label: "RSI 2 under 5",
        note: "Price above its 200-day average and 2-day RSI under 5; out on a close above the 5-day average.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "above", r: "sma200" }, { m: "rsi2", op: "below", v: 5 }] }, exit: { all: false, conds: [{ m: "close", op: "above", r: "sma5" }] }, stops: {} },
      },
      {
        id: "connors-double7",
        idea: "Dips within an uptrend",
        label: "Double 7s",
        note: "A new 7-day closing low while above the 200-day average; out at a new 7-day closing high.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "above", r: "sma200" }, { m: "close", op: "below", r: "lc7" }] }, exit: { all: false, conds: [{ m: "close", op: "above", r: "hc7" }] }, stops: {} },
      },
    ],
  },
  {
    id: "connors-etf",
    title: "High Probability ETF Trading",
    author: "Larry Connors and Cesar Alvarez",
    year: 2009,
    adapted: "Written for ETFs; here on one stock or basket. The book's \"several days in a row\" conditions are simplified to one check.",
    ideas: [
      {
        id: "connors-r3",
        idea: "Dips within an uptrend",
        label: "R3: RSI 2 falling",
        note: "Above the 200-day average, 2-day RSI lower than 3 days ago and under 10; out when it tops 70.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "close", op: "above", r: "sma200" }, { m: "rsi2", op: "falling", n: 3 }, { m: "rsi2", op: "below", v: 10 }] },
          exit: { all: false, conds: [{ m: "rsi2", op: "above", v: 70 }] },
          stops: {},
        },
      },
      {
        id: "connors-rsi4",
        idea: "Dips within an uptrend",
        label: "RSI 4 under 25",
        note: "Above the 200-day average with 4-day RSI under 25; out when it climbs above 55.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "above", r: "sma200" }, { m: "rsi4", op: "below", v: 25 }] }, exit: { all: false, conds: [{ m: "rsi4", op: "above", v: 55 }] }, stops: {} },
      },
      {
        id: "connors-pctb",
        idea: "Dips within an uptrend",
        label: "%B under 0.2",
        note: "Above the 200-day average with Bollinger %B under 0.2; out when %B tops 0.8.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "above", r: "sma200" }, { m: "bbPctB", op: "below", v: 0.2 }] }, exit: { all: false, conds: [{ m: "bbPctB", op: "above", v: 0.8 }] }, stops: {} },
      },
    ],
  },
  {
    id: "faber",
    title: "The Ivy Portfolio",
    author: "Mebane Faber and Eric Richardson",
    year: 2009,
    adapted: "Built for whole asset classes; here the same rule on one stock or basket.",
    ideas: [
      {
        id: "faber-10m",
        idea: "Ride the long trend",
        label: "10-month average timing",
        note: "At each month's end: in while the price is above its 10-month average; out on a month's close below it.",
        strategy: { ...base, check: "m", entry: { all: true, conds: [{ m: "close", op: "above", r: "sma210" }] }, exit: { all: false, conds: [{ m: "close", op: "below", r: "sma210" }] }, stops: {} },
      },
    ],
  },
  {
    id: "antonacci",
    title: "Dual Momentum Investing",
    author: "Gary Antonacci",
    year: 2014,
    adapted: "Built for choosing between markets; here the Nifty 50 is the other market and the RBI repo rate stands in for T-bills.",
    ideas: [
      {
        id: "antonacci-dual",
        idea: "Follow the strongest",
        label: "Dual momentum",
        note: `At each month's end: in while the 12-month return beats both the repo rate (${RF}%) and the Nifty 50; out when either fails.`,
        strategy: {
          ...base,
          check: "m",
          entry: { all: true, conds: [{ m: "roc252", op: "above", v: RF }, { m: "rsNifty252", op: "above", v: 0 }] },
          exit: { all: false, conds: [{ m: "roc252", op: "below", v: RF }, { m: "rsNifty252", op: "below", v: 0 }] },
          stops: {},
        },
      },
      {
        id: "antonacci-abs",
        idea: "Follow the strongest",
        label: "Absolute momentum",
        note: `At each month's end: in while the 12-month return beats the repo rate (${RF}%); out when it falls below.`,
        strategy: { ...base, check: "m", entry: { all: true, conds: [{ m: "roc252", op: "above", v: RF }] }, exit: { all: false, conds: [{ m: "roc252", op: "below", v: RF }] }, stops: {} },
      },
    ],
  },
  {
    id: "weinstein",
    title: "Secrets for Profiting in Bull and Bear Markets",
    author: "Stan Weinstein",
    year: 1988,
    adapted: "His weekly 30-week average is the 150-day average here; volume is the day's against its 20-day average.",
    ideas: [
      {
        id: "weinstein-stage2",
        idea: "Catch breakouts",
        label: "Stage 2 breakout",
        note: "A close above a rising 30-week average on 2× normal volume, beating the Nifty; out on a close below it.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "sma150" }, { m: "sma150", op: "rising", n: 20 }, { m: "volRatio", op: "above", v: 2 }, { m: "mansfield", op: "above", v: 0 }] },
          exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "sma150" }] },
          stops: {},
        },
      },
      {
        id: "weinstein-stay",
        idea: "Ride the long trend",
        label: "Stay in Stage 2",
        note: "At each week's end: in while the price is above a rising 30-week average; out on a week's close below it.",
        strategy: { ...base, check: "w", entry: { all: true, conds: [{ m: "close", op: "above", r: "sma150" }, { m: "sma150", op: "rising", n: 20 }] }, exit: { all: false, conds: [{ m: "close", op: "below", r: "sma150" }] }, stops: {} },
      },
      {
        id: "weinstein-rs",
        idea: "Beating the market",
        label: "Relative strength turns up",
        note: "Mansfield RS crossing above zero while above a rising 30-week average; out on a close below it.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "mansfield", op: "crossAbove", v: 0 }, { m: "close", op: "above", r: "sma150" }, { m: "sma150", op: "rising", n: 20 }] },
          exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "sma150" }] },
          stops: {},
        },
      },
    ],
  },
  {
    id: "darvas",
    title: "How I Made $2,000,000 in the Stock Market",
    author: "Nicolas Darvas",
    year: 1960,
    adapted: "Boxes worked out from daily highs and lows: a top or bottom holds once 3 days pass without it being broken.",
    ideas: [
      {
        id: "darvas-box",
        idea: "Catch breakouts",
        label: "Darvas box breakout",
        note: "A close above the box top on 1.5× normal volume; out on a close below the latest box bottom.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "above", r: "darvasTop" }, { m: "volRatio", op: "above", v: 1.5 }] }, exit: { all: false, conds: [{ m: "close", op: "below", r: "darvasBottom" }] }, stops: {} },
      },
      {
        id: "darvas-high",
        idea: "Leaders only",
        label: "Boxes near new highs",
        note: "A box breakout within 5% of the 52-week high, as Darvas favoured stocks making new highs; out below the box.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "close", op: "above", r: "darvasTop" }, { m: "fromHigh52", op: "below", v: 5 }] }, exit: { all: false, conds: [{ m: "close", op: "below", r: "darvasBottom" }] }, stops: {} },
      },
    ],
  },
  {
    id: "minervini",
    title: "Trade Like a Stock Market Wizard",
    author: "Mark Minervini",
    year: 2013,
    adapted: "Relative strength is the Trend percentile among covered stocks; the tight-range card is a rough stand-in for his VCP, which he reads by eye.",
    ideas: [
      {
        id: "minervini-template",
        idea: "Leaders only",
        label: "Trend Template",
        note: "Averages stacked 50 > 150 > 200, the 200-day rising, 30% off the low, within 25% of the high, Trend 70+; out under the 50-day or 8% down.",
        strategy: {
          ...base,
          entry: {
            all: true,
            conds: [
              { m: "close", op: "above", r: "sma50" },
              { m: "sma50", op: "above", r: "sma150" },
              { m: "sma150", op: "above", r: "sma200" },
              { m: "sma200", op: "rising", n: 21 },
              { m: "fromLow52", op: "above", v: 30 },
              { m: "fromHigh52", op: "below", v: 25 },
              { m: "trendPct", op: "above", v: 70 },
            ],
          },
          exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "sma50" }] },
          stops: { loss: 8 },
        },
      },
      {
        id: "minervini-vcp",
        idea: "Catch breakouts",
        label: "Tight-range breakout",
        note: "In an uptrend, a close above the 20-day high after the range tightened, on 1.5× volume; out under the 50-day or 8% down.",
        strategy: {
          ...base,
          entry: {
            all: true,
            conds: [
              { m: "sma50", op: "above", r: "sma150" },
              { m: "sma150", op: "above", r: "sma200" },
              { m: "close", op: "crossAbove", r: "dch20" },
              { m: "volRatio", op: "above", v: 1.5 },
              { m: "bbWidth", op: "within", r: "bbWidthLow126", v: 50 },
            ],
          },
          exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "sma50" }] },
          stops: { loss: 8 },
        },
      },
    ],
  },
  {
    id: "elder",
    title: "Trading for a Living",
    author: "Alexander Elder",
    year: 1993,
    adapted: "His weekly screen is a 65-day EMA (13 weeks) on daily prices; his price channel is the Keltner channel here.",
    ideas: [
      {
        id: "elder-impulse",
        idea: "Momentum turning up",
        label: "Impulse system",
        note: "In when the 13-day EMA and the MACD histogram both rise (green); out when both fall (red).",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "ema13", op: "rising", n: 1 }, { m: "macdHist", op: "rising", n: 1 }] },
          exit: { all: true, conds: [{ m: "ema13", op: "falling", n: 1 }, { m: "macdHist", op: "falling", n: 1 }] },
          stops: {},
        },
      },
      {
        id: "elder-triple",
        idea: "Dips within an uptrend",
        label: "Triple Screen",
        note: "Long-term tide up (13-week EMA rising) and a pullback (2-day Force Index under 0); out at the upper channel or when the tide turns.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "ema65", op: "rising", n: 5 }, { m: "force2", op: "below", v: 0 }] },
          exit: { all: false, conds: [{ m: "close", op: "above", r: "kcUpper" }, { m: "ema65", op: "falling", n: 5 }] },
          stops: {},
        },
      },
      {
        id: "elder-force",
        idea: "Momentum turning up",
        label: "Force Index turns up",
        note: "13-day Force Index crossing above 0 with the price above its 26-day EMA; out when it crosses below 0.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "force13", op: "crossAbove", v: 0 }, { m: "close", op: "above", r: "ema26" }] }, exit: { all: false, conds: [{ m: "force13", op: "crossBelow", v: 0 }] }, stops: {} },
      },
      {
        id: "elder-ray",
        idea: "Dips within an uptrend",
        label: "Elder-ray",
        note: "13-day EMA rising and Bear power below 0 but rising; out when Bull power turns negative.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "ema13", op: "rising", n: 1 }, { m: "bearPower", op: "below", v: 0 }, { m: "bearPower", op: "rising", n: 1 }] },
          exit: { all: false, conds: [{ m: "bullPower", op: "below", v: 0 }] },
          stops: {},
        },
      },
    ],
  },
  {
    id: "bollinger",
    title: "Bollinger on Bollinger Bands",
    author: "John Bollinger",
    year: 2001,
    adapted: "Method III is simplified from his W-bottom pattern to a close back inside the lower band.",
    ideas: [
      {
        id: "bollinger-squeeze",
        idea: "Catch breakouts",
        label: "Method I: squeeze breakout",
        note: "Band width near its 6-month low, then a close above the upper band; out on a close below the Parabolic SAR.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "bbUpper" }, { m: "bbWidth", op: "within", r: "bbWidthLow126", v: 25 }] },
          exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "psar" }] },
          stops: {},
        },
      },
      {
        id: "bollinger-trend",
        idea: "Ride the trend",
        label: "Method II: trend following",
        note: "In when %B is above 0.8 and money flow (MFI) above 80; out when %B is under 0.2 and MFI under 20.",
        strategy: {
          ...base,
          entry: { all: true, conds: [{ m: "bbPctB", op: "above", v: 0.8 }, { m: "mfi14", op: "above", v: 80 }] },
          exit: { all: true, conds: [{ m: "bbPctB", op: "below", v: 0.2 }, { m: "mfi14", op: "below", v: 20 }] },
          stops: {},
        },
      },
      {
        id: "bollinger-reversal",
        idea: "Bounce from oversold",
        label: "Method III: lower-band reversal",
        note: "A close back above the lower band (%B crossing above 0); out at the upper band or 8% down.",
        strategy: { ...base, entry: { all: true, conds: [{ m: "bbPctB", op: "crossAbove", v: 0 }] }, exit: { all: false, conds: [{ m: "bbPctB", op: "above", v: 1 }] }, stops: { loss: 8 } },
      },
    ],
  },
];

export const IDEA_SETS: IdeaSet[] = [CLASSIC, ...BOOKS];
