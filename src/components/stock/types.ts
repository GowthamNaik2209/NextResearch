import type { Fundamentals } from "@/lib/live/screener-company";
import type { Quote } from "@/lib/live/yahoo";
import type { CompanyFootprint } from "@/lib/sector-content/exposure";

// `date` is the server's label (fallback); `ts` (epoch ms) lets the browser render the age itself.
export type StockNews = { headline: string; source: string; url: string; date: string; ts?: number };
export type StockApi = {
  ticker: string;
  quote: Quote | null;
  fundamentals: Fundamentals | null;
  news: StockNews[];
  /** true = headlines are live (Google News); false = the curated fallback set. */
  newsLive: boolean;
  /** Every supply chain this company appears in (null when it is in just one is handled by the UI). */
  footprint: CompanyFootprint | null;
  /** Date of the seed snapshot the UI falls back to ("25 Sep 2026"). */
  seedAsOf?: string;
};
export type StockTab = "summary" | "chart" | "news" | "fundamentals";
