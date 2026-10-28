"use client";

import { useEffect, useSyncExternalStore, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { setTheme } from "./ThemeToggle";

// Top-bar shortcuts: Option + letter on a Mac, Alt + letter on Windows/Linux. ⌘/Ctrl combos
// were ruled out - the browser keeps ⌘W/⌘N/⌘L (and macOS ⌘H), and ⌘A/⌘C/⌘P would break
// select-all, copy and print. Matched on e.code (the physical key) because Option + a letter
// types a symbol on a Mac (⌥A gives "å"), so e.key is useless there.
const ROUTES: Record<string, string> = {
  KeyH: "/",
  KeyA: "/docs",
  KeyB: "/baskets",
  KeyC: "/connections",
  KeyU: "/updates",
  Slash: "/#how",
  KeyW: "/watchlist",
};

// UserMenu listens for this to open/close the account dropdown (⌥P).
export const ACCOUNT_MENU_EVENT = "nr:toggle-account-menu";

// Inputs you don't type into (checkbox, radio, range slider, button) keep the shortcuts on.
const NON_TEXT_INPUTS = ["checkbox", "radio", "range", "button", "submit", "reset", "color", "file", "image"];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.includes(target.type);
  return target.isContentEditable || ["TEXTAREA", "SELECT"].includes(target.tagName);
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || e.repeat || isTyping(e.target)) return;
      const route = ROUTES[e.code];
      // Already on the landing page: scroll directly, since pushing the same "/#how" again
      // (after scrolling back up) is a no-op.
      if (e.code === "Slash" && pathname === "/") document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
      else if (route) router.push(route);
      else if (e.code === "KeyN") setTheme("dark");
      else if (e.code === "KeyL") setTheme("light");
      else if (e.code === "KeyP") window.dispatchEvent(new Event(ACCOUNT_MENU_EVENT));
      else return;
      // Also stops Firefox on Windows/Linux opening its own Alt+letter menus.
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, pathname]);

  return null;
}

const noSubscribe = () => () => {};
const getModifier = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌥" : "Alt+");

// The hint for a tooltip, e.g. "⌥B" on a Mac or "Alt+B" elsewhere. null on the server / first
// hydration pass (the platform is unknown there), so callers fall back to the bare label.
export function useShortcutHint(key: string) {
  const modifier = useSyncExternalStore(noSubscribe, getModifier, () => null);
  return modifier && modifier + key;
}

export function withHint(label: string, hint: string | null) {
  return hint ? `${label} (${hint})` : label;
}

// A header link whose tooltip names its shortcut ("Baskets (⌥B)").
export function ShortcutLink({ shortcut, label, children, ...props }: ComponentProps<typeof Link> & { shortcut: string; label: string }) {
  const hint = useShortcutHint(shortcut);
  return (
    <Link {...props} title={withHint(label, hint)}>
      {children ?? label}
    </Link>
  );
}
