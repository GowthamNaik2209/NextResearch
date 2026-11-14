// Technical indicators as daily series (docs/SIGNALS.md section 2). Each takes arrays aligned to the
// stock's trading days and returns one of the same length; a day without enough history before it
// (or with a missing input) is null. Standard definitions: Wilder's smoothing for RSI, ATR and ADX;
// EMAs seeded with the simple average of their first `n` values. Pure, so they are unit-tested.

export type Series = (number | null)[];

const isNum = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

/** Simple moving average over `n` days; null until `n` values in a row are present. */
export function sma(x: Series, n: number): Series {
  const out: Series = new Array(x.length).fill(null);
  let sum = 0;
  let run = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (!isNum(v)) {
      sum = 0;
      run = 0;
      continue;
    }
    sum += v;
    run++;
    if (run > n) sum -= x[i - n] as number;
    if (run >= n) out[i] = sum / n;
  }
  return out;
}

/** Exponential average with smoothing `alpha`, seeded with the simple average of the first `n` values in a row. */
function smoothed(x: Series, n: number, alpha: number): Series {
  const out: Series = new Array(x.length).fill(null);
  let prev: number | null = null;
  let seed = 0;
  let run = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (!isNum(v)) {
      prev = null;
      seed = 0;
      run = 0;
      continue;
    }
    if (prev == null) {
      seed += v;
      run++;
      if (run === n) prev = seed / n;
    } else prev = prev + alpha * (v - prev);
    out[i] = prev;
  }
  return out;
}

export const ema = (x: Series, n: number) => smoothed(x, n, 2 / (n + 1));
/** Wilder's running average (RSI, ATR, ADX). */
export const wilder = (x: Series, n: number) => smoothed(x, n, 1 / n);

/** Highest value over the `n` days ending today (`before`: the `n` days before today). */
export function highest(x: Series, n: number, before = false): Series {
  return rolling(x, n, before, (a, b) => Math.max(a, b));
}
export function lowest(x: Series, n: number, before = false): Series {
  return rolling(x, n, before, (a, b) => Math.min(a, b));
}
function rolling(x: Series, n: number, before: boolean, pick: (a: number, b: number) => number): Series {
  const out: Series = new Array(x.length).fill(null);
  for (let i = 0; i < x.length; i++) {
    const end = before ? i - 1 : i;
    const start = end - n + 1;
    if (start < 0) continue;
    let best: number | null = null;
    for (let j = start; j <= end; j++) {
      const v = x[j];
      if (!isNum(v)) {
        best = null;
        break;
      }
      best = best == null ? v : pick(best, v);
    }
    out[i] = best;
  }
  return out;
}

/** Population standard deviation over `n` days. */
export function stdev(x: Series, n: number): Series {
  const mean = sma(x, n);
  return x.map((_, i) => {
    const m = mean[i];
    if (m == null) return null;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += ((x[j] as number) - m) ** 2;
    return Math.sqrt(s / n);
  });
}

const zip = (a: Series, b: Series, f: (x: number, y: number) => number | null): Series => a.map((x, i) => (isNum(x) && isNum(b[i]) ? f(x, b[i] as number) : null));

/** Change over `n` days, %. */
export const roc = (c: Series, n: number): Series => c.map((v, i) => (i >= n && isNum(v) && isNum(c[i - n]) && (c[i - n] as number) > 0 ? (v / (c[i - n] as number) - 1) * 100 : null));

/** Return from `from` days ago to `to` days ago, % (momentum 12-1: 252 to 21). */
export const lagReturn = (c: Series, from: number, to: number): Series =>
  c.map((_, i) => {
    const a = c[i - from];
    const b = c[i - to];
    return i >= from && isNum(a) && isNum(b) && a > 0 ? (b / a - 1) * 100 : null;
  });

/** Wilder's RSI. */
export function rsi(c: Series, n = 14): Series {
  const gain: Series = c.map((v, i) => (i > 0 && isNum(v) && isNum(c[i - 1]) ? Math.max(0, v - (c[i - 1] as number)) : null));
  const loss: Series = c.map((v, i) => (i > 0 && isNum(v) && isNum(c[i - 1]) ? Math.max(0, (c[i - 1] as number) - v) : null));
  const g = wilder(gain, n);
  const l = wilder(loss, n);
  return zip(g, l, (a, b) => (b === 0 ? (a === 0 ? 50 : 100) : 100 - 100 / (1 + a / b)));
}

export function macd(c: Series, fast = 12, slow = 26, sig = 9): { line: Series; signal: Series; hist: Series } {
  const line = zip(ema(c, fast), ema(c, slow), (a, b) => a - b);
  const signal = ema(line, sig);
  return { line, signal, hist: zip(line, signal, (a, b) => a - b) };
}

export function trueRange(h: Series, l: Series, c: Series): Series {
  return h.map((hi, i) => {
    const lo = l[i];
    if (!isNum(hi) || !isNum(lo)) return null;
    const pc = c[i - 1];
    return i > 0 && isNum(pc) ? Math.max(hi - lo, Math.abs(hi - pc), Math.abs(lo - pc)) : hi - lo;
  });
}

export const atr = (h: Series, l: Series, c: Series, n = 14) => wilder(trueRange(h, l, c), n);

export function adx(h: Series, l: Series, c: Series, n = 14): { adx: Series; pdi: Series; mdi: Series } {
  const plus: Series = h.map((hi, i) => {
    if (i === 0 || !isNum(hi) || !isNum(h[i - 1]) || !isNum(l[i]) || !isNum(l[i - 1])) return null;
    const up = hi - (h[i - 1] as number);
    const down = (l[i - 1] as number) - (l[i] as number);
    return up > down && up > 0 ? up : 0;
  });
  const minus: Series = h.map((hi, i) => {
    if (i === 0 || !isNum(hi) || !isNum(h[i - 1]) || !isNum(l[i]) || !isNum(l[i - 1])) return null;
    const up = hi - (h[i - 1] as number);
    const down = (l[i - 1] as number) - (l[i] as number);
    return down > up && down > 0 ? down : 0;
  });
  const tr = trueRange(h, l, c).map((v, i) => (i === 0 ? null : v));
  const str = wilder(tr, n);
  const pdi = zip(wilder(plus, n), str, (a, b) => (b > 0 ? (100 * a) / b : 0));
  const mdi = zip(wilder(minus, n), str, (a, b) => (b > 0 ? (100 * a) / b : 0));
  const dx = zip(pdi, mdi, (a, b) => (a + b > 0 ? (100 * Math.abs(a - b)) / (a + b) : 0));
  return { adx: wilder(dx, n), pdi, mdi };
}

/** Supertrend line (ATR `n`, multiplier `k`): below the price in an up trend, above it in a down trend. */
export function supertrend(h: Series, l: Series, c: Series, n = 10, k = 3): Series {
  const a = atr(h, l, c, n);
  const out: Series = new Array(c.length).fill(null);
  let fu: number | null = null;
  let fl: number | null = null;
  let up = true;
  for (let i = 0; i < c.length; i++) {
    const hi = h[i], lo = l[i], cl = c[i], at = a[i];
    if (!isNum(hi) || !isNum(lo) || !isNum(cl) || !isNum(at)) {
      fu = fl = null;
      continue;
    }
    const mid = (hi + lo) / 2;
    const bu = mid + k * at;
    const bl = mid - k * at;
    const pc = c[i - 1] as number;
    if (fu == null || fl == null) {
      fu = bu;
      fl = bl;
      up = cl >= mid;
    } else {
      fu = bu < fu || pc > fu ? bu : fu;
      fl = bl > fl || pc < fl ? bl : fl;
      if (up && cl < fl) up = false;
      else if (!up && cl > fu) up = true;
    }
    out[i] = up ? fl : fu;
  }
  return out;
}

/** Parabolic SAR (step 0.02, at most 0.2). */
export function psar(h: Series, l: Series, step = 0.02, max = 0.2): Series {
  const out: Series = new Array(h.length).fill(null);
  if (h.length < 2 || !h.every(isNum) || !l.every(isNum)) return out;
  const H = h as number[], L = l as number[];
  let up = H[1] >= H[0];
  let sar = up ? L[0] : H[0];
  let ep = up ? H[1] : L[1];
  let af = step;
  out[1] = sar;
  for (let i = 2; i < H.length; i++) {
    sar = sar + af * (ep - sar);
    if (up) {
      sar = Math.min(sar, L[i - 1], L[i - 2]);
      if (L[i] < sar) {
        up = false;
        sar = ep;
        ep = L[i];
        af = step;
      } else if (H[i] > ep) {
        ep = H[i];
        af = Math.min(af + step, max);
      }
    } else {
      sar = Math.max(sar, H[i - 1], H[i - 2]);
      if (H[i] > sar) {
        up = true;
        sar = ep;
        ep = H[i];
        af = step;
      } else if (L[i] < ep) {
        ep = L[i];
        af = Math.min(af + step, max);
      }
    }
    out[i] = sar;
  }
  return out;
}

/** Ichimoku lines; the cloud edges are those plotted for each day (worked out `shift` days earlier). */
export function ichimoku(h: Series, l: Series, conv = 9, base = 26, spanB = 52, shift = 26) {
  const mid = (n: number) => zip(highest(h, n), lowest(l, n), (a, b) => (a + b) / 2);
  const tenkan = mid(conv);
  const kijun = mid(base);
  const a = zip(tenkan, kijun, (x, y) => (x + y) / 2);
  const b = mid(spanB);
  const lag = (x: Series): Series => x.map((_, i) => (i >= shift ? x[i - shift] : null));
  const la = lag(a), lb = lag(b);
  return { tenkan, kijun, cloudTop: zip(la, lb, Math.max), cloudBottom: zip(la, lb, Math.min) };
}

export function aroon(h: Series, l: Series, n = 25): { up: Series; down: Series } {
  const since = (x: Series, better: (a: number, b: number) => boolean): Series =>
    x.map((_, i) => {
      if (i < n) return null;
      let best = i - n;
      for (let j = i - n; j <= i; j++) {
        const v = x[j];
        if (!isNum(v)) return null;
        if (!better(x[best] as number, v)) best = j;
      }
      return (100 * (n - (i - best))) / n;
    });
  // A tie moves to the later day, as most charting packages count it.
  return { up: since(h, (a, b) => a > b), down: since(l, (a, b) => a < b) };
}

export function stochastic(h: Series, l: Series, c: Series, n = 14, smoothK = 3, d = 3): { k: Series; d: Series } {
  const hh = highest(h, n), ll = lowest(l, n);
  const raw = c.map((v, i) => (isNum(v) && isNum(hh[i]) && isNum(ll[i]) ? (hh[i]! - ll[i]! > 0 ? (100 * (v - ll[i]!)) / (hh[i]! - ll[i]!) : 50) : null));
  const k = sma(raw, smoothK);
  return { k, d: sma(k, d) };
}

export function stochRsi(c: Series, n = 14): Series {
  const r = rsi(c, n);
  const hi = highest(r, n), lo = lowest(r, n);
  return r.map((v, i) => (isNum(v) && isNum(hi[i]) && isNum(lo[i]) ? (hi[i]! - lo[i]! > 0 ? (100 * (v - lo[i]!)) / (hi[i]! - lo[i]!) : 50) : null));
}

export function williamsR(h: Series, l: Series, c: Series, n = 14): Series {
  const hh = highest(h, n), ll = lowest(l, n);
  return c.map((v, i) => (isNum(v) && isNum(hh[i]) && isNum(ll[i]) ? (hh[i]! - ll[i]! > 0 ? (-100 * (hh[i]! - v)) / (hh[i]! - ll[i]!) : -50) : null));
}

const typical = (h: Series, l: Series, c: Series): Series => c.map((v, i) => (isNum(v) && isNum(h[i]) && isNum(l[i]) ? (h[i]! + l[i]! + v) / 3 : null));

export function cci(h: Series, l: Series, c: Series, n = 20): Series {
  const tp = typical(h, l, c);
  const m = sma(tp, n);
  return tp.map((v, i) => {
    const avg = m[i];
    if (!isNum(v) || avg == null) return null;
    let dev = 0;
    for (let j = i - n + 1; j <= i; j++) dev += Math.abs((tp[j] as number) - avg);
    dev /= n;
    return dev > 0 ? (v - avg) / (0.015 * dev) : 0;
  });
}

export function bollinger(c: Series, n = 20, k = 2) {
  const mid = sma(c, n);
  const sd = stdev(c, n);
  const upper = zip(mid, sd, (m, s) => m + k * s);
  const lower = zip(mid, sd, (m, s) => m - k * s);
  const pctB = c.map((v, i) => (isNum(v) && isNum(upper[i]) && isNum(lower[i]) ? (upper[i]! - lower[i]! > 0 ? (v - lower[i]!) / (upper[i]! - lower[i]!) : 0.5) : null));
  const width = mid.map((m, i) => (isNum(m) && m > 0 && isNum(upper[i]) && isNum(lower[i]) ? ((upper[i]! - lower[i]!) / m) * 100 : null));
  return { upper, mid, lower, pctB, width };
}

export function keltner(h: Series, l: Series, c: Series, n = 20, atrN = 10, k = 2) {
  const mid = ema(c, n);
  const a = atr(h, l, c, atrN);
  return { upper: zip(mid, a, (m, x) => m + k * x), lower: zip(mid, a, (m, x) => m - k * x) };
}

/** Daily log returns. */
export const logReturns = (c: Series): Series => c.map((v, i) => (i > 0 && isNum(v) && isNum(c[i - 1]) && v > 0 && (c[i - 1] as number) > 0 ? Math.log(v / (c[i - 1] as number)) : null));

/** Volatility of daily returns over `n` days, annualised (× √252), %. */
export const histVol = (c: Series, n = 60): Series => stdev(logReturns(c), n).map((s) => (s == null ? null : s * Math.sqrt(252) * 100));

export function obv(c: Series, v: Series): Series {
  const out: Series = new Array(c.length).fill(null);
  let total = 0;
  let started = false;
  for (let i = 0; i < c.length; i++) {
    const cl = c[i], vol = v[i];
    if (!isNum(cl) || !isNum(vol)) {
      if (started) out[i] = total;
      continue;
    }
    if (started && isNum(c[i - 1])) total += cl > (c[i - 1] as number) ? vol : cl < (c[i - 1] as number) ? -vol : 0;
    started = true;
    out[i] = total;
  }
  return out;
}

export function mfi(h: Series, l: Series, c: Series, v: Series, n = 14): Series {
  const tp = typical(h, l, c);
  return tp.map((_, i) => {
    if (i < n) return null;
    let pos = 0, neg = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const t = tp[j], p = tp[j - 1], vol = v[j];
      if (!isNum(t) || !isNum(p) || !isNum(vol)) return null;
      if (t > p) pos += t * vol;
      else if (t < p) neg += t * vol;
    }
    return neg === 0 ? (pos === 0 ? 50 : 100) : 100 - 100 / (1 + pos / neg);
  });
}

export function cmf(h: Series, l: Series, c: Series, v: Series, n = 20): Series {
  const mfv: Series = c.map((cl, i) => {
    const hi = h[i], lo = l[i], vol = v[i];
    if (!isNum(cl) || !isNum(hi) || !isNum(lo) || !isNum(vol)) return null;
    return hi > lo ? (((cl - lo) - (hi - cl)) / (hi - lo)) * vol : 0;
  });
  const a = sma(mfv, n), b = sma(v, n);
  return zip(a, b, (x, y) => (y > 0 ? x / y : 0));
}

export function vwap(h: Series, l: Series, c: Series, v: Series, n = 20): Series {
  const tp = typical(h, l, c);
  const pv = zip(tp, v, (a, b) => a * b);
  return zip(sma(pv, n), sma(v, n), (a, b) => (b > 0 ? a / b : null));
}

/** Elder's Force Index: the day's change × its volume, smoothed by an EMA of `n` days. */
export function forceIndex(c: Series, v: Series, n: number): Series {
  const raw: Series = c.map((cl, i) => (i > 0 && isNum(cl) && isNum(c[i - 1]) && isNum(v[i]) ? (cl - (c[i - 1] as number)) * (v[i] as number) : null));
  return ema(raw, n);
}

/**
 * Darvas boxes. A top is a high not beaten for `n` days after it; a bottom is the lowest low since
 * that top, not undercut for `n` days. Once both hold, the box stands until a close goes through
 * either side, and a new one forms. Each day's values are the boxes known before that day, so a
 * close above `top` is a breakout. `bottom` stays at the latest box's bottom until the next box
 * forms (it moves up with each box: the stop Darvas raised).
 */
export function darvas(h: Series, l: Series, c: Series, n = 3): { top: Series; bottom: Series } {
  const top: Series = new Array(c.length).fill(null);
  const bottom: Series = new Array(c.length).fill(null);
  let hi: number | null = null, hiAge = 0;
  let lo: number | null = null, loAge = 0;
  let boxTop: number | null = null, boxBot: number | null = null, lastBot: number | null = null;
  for (let i = 0; i < c.length; i++) {
    top[i] = boxTop;
    bottom[i] = lastBot;
    const H = h[i], L = l[i], C = c[i];
    if (!isNum(H) || !isNum(L) || !isNum(C)) continue;
    if (boxTop != null && boxBot != null) {
      if (C <= boxTop && C >= boxBot) continue;
      // Broken either way: start looking for the next box from this day.
      boxTop = boxBot = null;
      hi = lo = null;
    }
    if (hi == null || H > hi) {
      hi = H;
      hiAge = 0;
      lo = L;
      loAge = 0;
      continue;
    }
    hiAge++;
    if (lo == null || L < lo) {
      lo = L;
      loAge = 0;
    } else loAge++;
    if (hiAge >= n && loAge >= n) {
      boxTop = hi;
      boxBot = lastBot = lo;
    }
  }
  return { top, bottom };
}

/** Rolling beta of daily returns against the benchmark's over `n` days. */
export function beta(c: Series, bench: Series, n = 252): Series {
  const r = logReturns(c), m = logReturns(bench);
  return r.map((_, i) => {
    if (i < n) return null;
    let sx = 0, sy = 0, sxy = 0, sxx = 0, k = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const x = m[j], y = r[j];
      if (!isNum(x) || !isNum(y)) continue;
      sx += x;
      sy += y;
      sxy += x * y;
      sxx += x * x;
      k++;
    }
    if (k < n * 0.8) return null;
    const cov = sxy / k - (sx / k) * (sy / k);
    const v = sxx / k - (sx / k) ** 2;
    return v > 0 ? cov / v : null;
  });
}

/** True when `a` crosses above `b` on day `i` (at or below the day before, above now). */
export function crossesAbove(a: Series, b: Series | number, i: number): boolean {
  const at = (s: Series | number, j: number) => (typeof s === "number" ? s : s[j]);
  const a0 = a[i - 1], a1 = a[i], b0 = at(b, i - 1), b1 = at(b, i);
  return i > 0 && isNum(a0) && isNum(a1) && isNum(b0) && isNum(b1) && a0 <= b0 && a1 > b1;
}

export function crossesBelow(a: Series, b: Series | number, i: number): boolean {
  const at = (s: Series | number, j: number) => (typeof s === "number" ? s : s[j]);
  const a0 = a[i - 1], a1 = a[i], b0 = at(b, i - 1), b1 = at(b, i);
  return i > 0 && isNum(a0) && isNum(a1) && isNum(b0) && isNum(b1) && a0 >= b0 && a1 < b1;
}
