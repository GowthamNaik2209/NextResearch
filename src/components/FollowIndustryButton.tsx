"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { actionClass } from "@/components/charts/action-class";

// "Follow industry" on an industry / policy / index page, and the unfollow on /watchlist. A follow
// brings the module's headlines into /watchlist's news. The state is shared the way the watchlist
// hearts share theirs: one GET /api/follows per page load, and every button and chip on the page
// follows a change made by any one of them.

type Word = "industry" | "policy" | "index";

let slugsCache: Set<string> | null = null;
// From the same GET: false = signed out (a tap shows the sign-up prompt without a request bound to
// 401); null = not known (the load failed), then a tap just tries.
let signedIn: boolean | null = null;
let inFlight: Promise<Set<string> | null> | null = null;
// The last load failed: the button stops waiting and a tap tries again.
let loadFailed = false;
const listeners = new Set<() => void>();
const notifyAll = () => listeners.forEach((n) => n());

function loadFollows(): Promise<Set<string> | null> {
  if (slugsCache) return Promise.resolve(slugsCache);
  if (!inFlight) {
    inFlight = fetch("/api/follows")
      .then((r) => {
        if (!r.ok) throw new Error(`follows ${r.status}`);
        return r.json();
      })
      .then((d: { slugs?: string[]; signedIn?: boolean }) => {
        loadFailed = false;
        slugsCache = new Set(d.slugs ?? []);
        signedIn = typeof d.signedIn === "boolean" ? d.signedIn : null;
        return slugsCache;
      })
      .catch(() => {
        // Not remembered: a blip would otherwise show "Follow" on a followed industry all visit.
        inFlight = null;
        signedIn = null;
        loadFailed = true;
        notifyAll();
        return null;
      });
  }
  return inFlight;
}

/** Forget the cached list so the next load asks again (after a login finished by client navigation). */
function reset() {
  slugsCache = null;
  inFlight = null;
  loadFailed = false;
}

/** Log-out (a client-side redirect keeps this module's state): drop the last user's follows. */
export function forgetFollows() {
  reset();
  signedIn = null;
  notifyAll();
}

/** Not known yet (and not failed): the button can't say which way a tap would go. */
const loadingFollows = () => slugsCache === null && !loadFailed;

function setFollowed(slug: string, on: boolean) {
  if (!slugsCache) return;
  if (on) slugsCache.add(slug);
  else slugsCache.delete(slug);
  notifyAll();
}

/** For /watchlist: re-render when any follow changes. */
export function subscribeFollows(onChange: () => void): () => void {
  listeners.add(onChange);
  void loadFollows().then(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
/** null until the list loads. */
export const isFollowed = (slug: string): boolean | null => (slugsCache ? slugsCache.has(slug) : null);

/** Follow or unfollow; true when saved. Optimistic, and put back on any failure. */
async function save(slug: string, on: boolean): Promise<{ ok: boolean; status?: number }> {
  // With no list (its load failed), the optimistic change would have nothing to show on: load first.
  if (!slugsCache) await loadFollows();
  if (!slugsCache) return { ok: false };
  setFollowed(slug, on);
  const res = await (on
    ? fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) })
    : fetch(`/api/follows?slug=${encodeURIComponent(slug)}`, { method: "DELETE" })
  ).catch(() => null);
  if (res?.ok) {
    track(on ? "follow_industry" : "unfollow_industry", { sector: slug });
    return { ok: true };
  }
  setFollowed(slug, !on);
  if (res?.status === 401) signedIn = false;
  return { ok: false, status: res?.status };
}

export async function unfollowIndustry(slug: string): Promise<boolean> {
  return (await save(slug, false)).ok;
}
export async function refollowIndustry(slug: string): Promise<boolean> {
  return (await save(slug, true)).ok;
}

// A signed-out tap remembers the slug here before sending them to sign up / log in; back on the
// page signed in, the button finishes the follow. localStorage, not the URL, so a shared link can
// never make anyone follow anything. Kept an hour, and only cleared once the follow is saved, so
// landing back still signed out (Back from the login page) doesn't use it up.
const PENDING_KEY = "nr-pending-follow";
const PENDING_TTL_MS = 60 * 60 * 1000;

function rememberPending(slug: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ slug, at: Date.now() }));
  } catch {}
}
function pendingFor(slug: string): boolean {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw) as { slug?: string; at?: number };
    if (typeof p.at !== "number" || Date.now() - p.at >= PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_KEY);
      return false;
    }
    return p.slug === slug;
  } catch {
    return false;
  }
}
function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}

const LABEL: Record<Word, string> = { industry: "Follow industry", policy: "Follow policy", index: "Follow index" };

export function FollowIndustryButton({ slug, name, word }: { slug: string; name: string; word: Word }) {
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [toast, setToast] = useState(0);
  const hideToast = useCallback(() => setToast(0), []);
  const on = slugsCache?.has(slug) ?? false;

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    listeners.add(rerender);
    let live = true;
    // Back from log in / sign up: those end in a client-side redirect, so the signed-out list from
    // before is still cached here. Ask again, or the follow the prompt promised is never made.
    if (signedIn !== true && pendingFor(slug)) reset();
    void loadFollows().then(async (list) => {
      rerender();
      // Back from sign-up / log in with this follow still to do.
      if (!live || !list || signedIn !== true || !pendingFor(slug)) return;
      if (list.has(slug) || (await save(slug, true)).ok) {
        clearPending();
        if (live) setToast((n) => n + 1);
      }
    });
    return () => {
      live = false;
      listeners.delete(rerender);
    };
  }, [slug]);

  const loading = loadingFollows();
  const toggle = async () => {
    // Not while saving, nor before the list says which way the tap goes (it could undo a follow).
    if (busy || loading) return;
    setBusy(true);
    try {
      // A cached "signed out" may predate a login finished by client-side navigation: ask again.
      if (signedIn !== true) reset();
      const list = await loadFollows();
      notifyAll();
      if (signedIn === false) return setNeedsAuth(true);
      // The list couldn't be read, so a follow can't be told from an unfollow: leave it for a retry.
      if (!list) return;
      const was = list.has(slug);
      const r = await save(slug, !was);
      if (r.ok && !was) setToast((n) => n + 1);
      if (r.status === 401) setNeedsAuth(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-busy={busy || loading || undefined}
        aria-disabled={loading || undefined}
        title={on ? `Stop following ${name}` : `Show ${name} news on your watchlist`}
        className={actionClass(false, on) + " flex-none gap-1.5" + (busy || loading ? " cursor-wait opacity-60" : "")}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-none">
          {on ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
        </svg>
        <span>{on ? "Following" : LABEL[word]}</span>
      </button>
      {needsAuth && <FollowPrompt slug={slug} name={name} word={word} onClose={() => setNeedsAuth(false)} />}
      {toast > 0 && <FollowedToast key={toast} name={name} onDone={hideToast} />}
    </>
  );
}

function FollowedToast({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return createPortal(
    <div role="status" className="nr-toast fixed inset-x-4 bottom-4 z-[300] mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink shadow-2xl">
      <span className="min-w-0 flex-1">Following {name}: its news now shows on your watchlist</span>
      <Link href="/watchlist" className="tap-target flex-none font-semibold text-accent hover:underline">
        View
      </Link>
    </div>,
    document.body
  );
}

// A signed-out tap: the moment they want an account. Sign up / log in bring them back to this page,
// where the button finishes the follow.
function FollowPrompt({ slug, name, word, onClose }: { slug: string; name: string; word: Word; onClose: () => void }) {
  const [q] = useState(() => `?next=${encodeURIComponent(window.location.pathname)}`);
  const firstRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const go = (from: string) => () => {
    rememberPending(slug);
    track("signup_click", { from });
  };
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="follow-prompt-title" className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 text-ink shadow-2xl">
        <h2 id="follow-prompt-title" className="font-display text-base font-bold">
          Follow {name}
        </h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Create a free account and this {word}&rsquo;s news shows on your watchlist, beside the companies you save. We&rsquo;ll bring you straight back here.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link ref={firstRef} href={`/signup${q}`} onClick={go("follow_prompt")} className="rounded-lg border border-accent bg-accent px-3 py-2.5 text-center text-sm font-semibold text-bg hover:opacity-90">
            Create free account
          </Link>
          <Link href={`/login${q}`} onClick={() => rememberPending(slug)} className="rounded-lg border border-btn bg-panel-2 px-3 py-2.5 text-center text-sm font-semibold text-ink hover:bg-accent/10">
            I already have an account
          </Link>
          <button type="button" onClick={onClose} className="rounded-lg border border-btn px-3 py-2 text-sm text-ink-soft hover:bg-accent/10">
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
