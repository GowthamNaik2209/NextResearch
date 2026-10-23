"use client";

import { useSyncExternalStore } from "react";

// One reader for the site's light/dark theme (data-theme on <html>, set before paint by the inline
// script in layout.tsx and flipped by ThemeToggle). Charts and the 3D engine need it in JS because
// their colours are drawn, not styled.

export type SiteTheme = "light" | "dark";

export const readTheme = (): SiteTheme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

/** A CSS custom property's current value on <html>, or the fallback when it is unset. */
export const cssVar = (name: string, fallback = "") =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** The current theme, following the toggle live. The server render assumes light. */
export function useSiteTheme(): SiteTheme {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}
