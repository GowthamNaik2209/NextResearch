// GA4 events for the conversions the reports are built around. A no-op where the tag is not loaded
// (staging, local dev, or before NEXT_PUBLIC_GA_ID is set), so callers never check for it.
// Names follow GA4's recommended events where one fits (sign_up, add_to_wishlist).
type EventName = "sign_up" | "add_to_wishlist" | "create_basket";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(name: EventName, params: Record<string, string | number> = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
  } catch {}
}
