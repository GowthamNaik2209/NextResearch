"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout, updateDisplayName } from "@/app/auth/actions";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  email: string | null;
  displayName: string | null;
};

export function UserMenu({ email, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!email) {
    return (
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-ink"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Account"
          title="Account"
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
              className="mt-2 block rounded-lg bg-accent px-2 py-1.5 text-center text-xs font-semibold text-bg hover:opacity-90"
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-panel-2 py-1 pl-1 pr-3 text-sm text-ink hover:border-accent"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
          <UserIcon small />
        </span>
        <span className="max-w-[70px] truncate sm:max-w-[120px]">{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-panel p-3 shadow-lg">
          {editing ? (
            <form action={updateDisplayName} onSubmit={() => setEditing(false)} className="flex flex-col gap-2">
              <input
                name="name"
                defaultValue={label}
                autoFocus
                className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-accent px-2 py-1.5 text-xs font-semibold text-bg hover:opacity-90">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-lg border border-line px-2 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-ink"
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
                className="mt-2 w-full rounded-lg border border-line px-2 py-1.5 text-left text-xs text-ink-soft hover:border-accent hover:text-ink"
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
                className="mt-1 block rounded-lg border border-line px-2 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-ink"
              >
                My watchlist
              </Link>
              <form action={logout} className="mt-1">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-line px-2 py-1.5 text-left text-xs text-ink-soft hover:border-danger hover:text-danger"
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
