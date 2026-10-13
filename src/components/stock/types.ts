import type { Fundamentals } from "@/lib/live/screener-company";
import type { Quote } from "@/lib/live/yahoo";

export type StockNews = { headline: string; source: string; url: string; date: string };
export type StockApi = { ticker: string; quote: Quote | null; fundamentals: Fundamentals | null; news: StockNews[] };
export type StockTab = "summary" | "chart" | "news" | "fundamentals";

// Shape of a supplier's static seed figures (SectorSupplier.f is loosely typed).
export type StaticFin = {
  rev?: number[];
  np?: number[];
  mcap?: string;
  price?: string;
  note?: string | null;
  cagr?: (number | null)[] | null;
  range?: (number | null)[] | null;
  tl?: [number, string] | null;
  kpi?: (number | null)[] | null; // [pe, bookValue, divYield, roce, roe, faceValue]
};
