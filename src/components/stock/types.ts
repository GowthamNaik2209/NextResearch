import type { Fundamentals } from "@/lib/live/screener-company";
import type { Quote } from "@/lib/live/yahoo";

export type StockNews = { headline: string; source: string; url: string; date: string };
export type StockApi = { ticker: string; quote: Quote | null; fundamentals: Fundamentals | null; news: StockNews[] };
export type StockTab = "summary" | "chart" | "news" | "fundamentals";
