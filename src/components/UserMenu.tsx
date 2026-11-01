"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, updateDisplayName } from "@/app/auth/actions";
import { ThemeToggle } from "./ThemeToggle";
import { ACCOUNT_MENU_EVENT, useShortcutHint, withHint } from "./KeyboardShortcuts";

type Props = {
  email: string | null;
  displayName: string | null;
};

export function UserMenu({ email, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // The name sits beside the avatar only on the landing page, and not on phones; everywhere else
  // the account button is the bare avatar (the name is still in the dropdown).
  const showName = usePathname() === "/";
  const hint = useShortcutHint("P");

  // ⌥P / Alt+P (KeyboardShortcuts) toggles the dropdown.
  useEffect(() => {
    const toggle = () => {
      setOpen((v) => !v);
      setEditing(false);
    };
    window.addEventListener(ACCOUNT_MENU_EVENT, toggle);
    return () => window.removeEventListener(ACCOUNT_MENU_EVENT, toggle);
  }, []);

  // Close on an outside click/tap, Escape, or page scroll (the dropdown hangs off a sticky
  // header, so scrolling the page under it left it floating over unrelated content).
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setEditing(false);
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Typing in the name field can scroll the page on phones (keyboard opening); keep it open then.
    const onScroll = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLInputElement && rootRef.current?.contains(el))) close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  if (!email) {
    return (
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap-target flex h-8 w-8 items-center sm:h-9 sm:w-9 justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-ink"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Account"
          title={withHint("Account", hint)}
        >
          <UserIcon />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-panel p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <span className="text-xs font-semibold text-ink-soft">Appearance</span>
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-lg bg-accent px-2 py-1.5 pointer-coarse:py-2.5 text-center text-xs font-semibold text-bg hover:opacity-90"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    );
  }

  const label = displayName || email.split("@")[0];

  return (
    <div className="relative" ref={rootRef}>
      {/* The name sits in a chip beside the avatar on the landing page from sm up. Phones and every
          other page get the bare avatar: a phone header has no room for the name. */}
      {showName && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="hidden items-center gap-2 rounded-full border border-line bg-panel-2 py-1 pl-1 pr-3 text-sm text-ink hover:border-accent sm:flex"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={`Account: ${label}`}
          title={withHint(label, hint)}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
            <UserIcon small />
          </span>
          <span className="max-w-[120px] truncate">{label}</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "tap-target flex h-8 w-8 items-center sm:h-9 sm:w-9 justify-center rounded-full border border-line bg-panel-2 text-accent hover:border-accent" + (showName ? " sm:hidden" : "")
        }
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Account: ${label}`}
        title={withHint(label, hint)}
      >
        <UserIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-panel p-3 shadow-lg">
          {editing ? (
            <form action={updateDisplayName} onSubmit={() => setEditing(false)} className="flex flex-col gap-2">
              <input
                name="name"
                autoComplete="name"
                aria-label="Display name"
                defaultValue={label}
                autoFocus
                className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 pointer-coarse:py-2.5 text-base text-ink outline-none focus:border-accent sm:text-sm"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-accent px-2 py-1.5 pointer-coarse:py-2.5 text-xs font-semibold text-bg hover:opacity-90">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-lg border border-line px-2 py-1.5 pointer-coarse:py-2.5 text-xs text-ink-soft hover:border-accent hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="px-1">
                <div className="truncate text-sm font-semibold text-ink">{label}</div>
                <div className="truncate text-xs text-ink-soft">{email}</div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-2 w-full rounded-lg border border-line px-2 py-1.5 pointer-coarse:py-2.5 text-left text-xs text-ink-soft hover:border-accent hover:text-ink"
              >
                Edit name
              </button>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5">
                <span className="text-xs text-ink-soft">Appearance</span>
                <ThemeToggle />
              </div>
              <Link
                href="/watchlist"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg border border-line px-2 py-1.5 pointer-coarse:py-2.5 text-xs text-ink-soft hover:border-accent hover:text-ink"
              >
                My watchlist
              </Link>
              <Link
                href="/baskets"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg border border-line px-2 py-1.5 pointer-coarse:py-2.5 text-xs text-ink-soft hover:border-accent hover:text-ink"
              >
                My baskets
              </Link>
              <Link
                href="/companies"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg border border-line px-2 py-1.5 pointer-coarse:py-2.5 text-xs text-ink-soft hover:border-accent hover:text-ink"
              >
                All companies
              </Link>
              <form action={logout} className="mt-1">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-line px-2 py-1.5 pointer-coarse:py-2.5 text-left text-xs text-ink-soft hover:border-danger hover:text-danger"
                >
                  Log out
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UserIcon({ small }: { small?: boolean }) {
  const size = small ? 14 : 16;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
