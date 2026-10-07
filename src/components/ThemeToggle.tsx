"use client";

import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "nr-theme";

export function ThemeToggle() {
  // Starts null (matches server render, avoids hydration mismatch) and reads the
  // saved choice directly from localStorage on mount — not from the DOM attribute,
  // because React's Strict Mode remount in dev resets <html> to only the
  // attributes it manages from JSX (clearing what layout.tsx's inline script set),
  // so this doubles as the re-apply step the attribute needs in dev too (a no-op
  // in production, where the inline script's value already stuck).
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useLayoutEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const resolved = saved === "light" ? "light" : "dark";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="relative flex h-7 w-14 flex-none items-center rounded-full border border-line bg-panel-2 px-1 transition-colors"
    >
      <MoonIcon className="absolute left-1.5 h-3.5 w-3.5 text-ink-soft" />
      <SunIcon className="absolute right-1.5 h-3.5 w-3.5 text-ink-soft" />
      <span
        className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-bg shadow-sm transition-transform"
        style={{ transform: isLight ? "translateX(26px)" : "translateX(0)" }}
      >
        {isLight ? <SunIcon className="h-3 w-3" /> : <MoonIcon className="h-3 w-3" />}
      </span>
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none">
      <path d="M20.3 14.7A8.3 8.3 0 0 1 9.3 3.7a8.3 8.3 0 1 0 11 11z" />
    </svg>
  );
}
