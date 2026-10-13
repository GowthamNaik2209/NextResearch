import type { Fundamentals } from "@/lib/live/screener-company";
import type { Quote } from "@/lib/live/yahoo";

export type StockNews = { headline: string; source: string; url: string; date: string };
export type StockApi = {
  ticker: string;
  quote: Quote | null;
  fundamentals: Fundamentals | null;
  news: StockNews[];
  /** true = headlines are live (Google News); false = the curated fallback set. */
  newsLive: boolean;
};
export type StockTab = "summary" | "chart" | "news" | "fundamentals";
