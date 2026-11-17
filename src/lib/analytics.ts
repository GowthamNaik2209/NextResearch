// GA4 events for the conversions and the research funnel the reports are built around. A no-op
// where the tag is not loaded (staging, local dev, or before NEXT_PUBLIC_GA_ID is set), so callers
// never check for it. Names follow GA4's recommended events where one fits (sign_up,
// add_to_wishlist, search); the rest are ours, snake_case and under GA's 40-character limit.
//
// Where a visitor came from (Instagram post, LinkedIn, the brief email) is not a parameter here:
// GA4 reads the link's utm_* tags into the session's source/medium/campaign/content by itself, so
// every event below can be split by post as long as the post's link carries its UTM tags.
//
// The funnel, in order: arrive -> search / open_map / open_report / open_ipo_deck ->
// select_zone / run_scenario / open_industry_view -> view_stock -> add_to_wishlist /
// create_basket / save_signal -> signup_click -> sign_up.
export type EventParams = {
  // Conversions
  sign_up: { method: string };
  add_to_wishlist: { ticker: string };
  create_basket: { stocks: number };
  save_signal: { scope: string; target: string; alerts: "on" | "off" };
  /** "Follow industry" (or policy / index) on its page, and its undo there or on /watchlist. */
  follow_industry: { sector: string };
  unfollow_industry: { sector: string };
  /** A "Sign up" / "Create an account" link pressed; `from` says which one. */
  signup_click: { from: string };
  // Research funnel
  /** The search box's result picked. `result_type`: sector, ipo or company. The typed text itself is
   * not sent (anyone can type a name or an email into a box); the result it led to says what was sought. */
  search: { result_type: string; result: string; term_length: number };
  /** The 3D map (or heatmap map) opened. `entry`: what the link opened it on. */
  open_map: { sector: string; entry: "zone" | "company" | "scenario" | "none" };
  select_zone: { sector: string; zone: string };
  /** One what-if picked, or several (comma-joined) on the heatmap's grouped list. */
  run_scenario: { sector: string; scenario: string };
  /** An industry's full-screen Stock heatmap or Industry pools. */
  open_industry_view: { view: "heatmap" | "pools"; sector: string };
  open_report: { sector: string };
  open_ipo_deck: { ipo: string };
  /** The stock pop-up opened (any page). */
  view_stock: { ticker: string };
  /** A tab inside the stock pop-up other than the one it opened on. */
  view_stock_tab: { ticker: string; tab: string };
};

export type EventName = keyof EventParams;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// GA4 drops parameter values past 100 characters; a long search term or scenario list is cut instead.
const MAX_VALUE = 100;

export function track<N extends EventName>(name: N, params: EventParams[N]): void {
  if (typeof window === "undefined") return;
  const clean: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params as Record<string, string | number>)) {
    clean[k] = typeof v === "string" ? v.slice(0, MAX_VALUE) : v;
  }
  try {
    window.gtag?.("event", name, clean);
  } catch {}
}
