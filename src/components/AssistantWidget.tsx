"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// "Ask NextResearch": a chat button in the bottom-right corner of every page. Opening it shows a
// few suggested questions about what the page is showing (lib/assistant decides which); answers
// come from /api/assistant - code-written from our data, or reworded by the AI layer when it is on.
// Mounted once in the root layout.

type Question = { id: string; q: string; a: string };
type Context = { key: string; title: string; asOf: string | null; ai: boolean; questions: Question[] };
type Turn = { id: string; q: string; a: string | null; ai: boolean };

// The 3D explorer fills the screen and keeps its own bottom sheet there; the auth forms are left
// uncluttered.
const HIDDEN = [/^\/sector\/[^/]+\/explore/, /^\/(login|signup|auth)(\/|$)/];
// Query params that change what a page is about (pop-up decks, the charts view); any others
// would only split the CDN cache.
const CONTEXT_PARAMS = ["ipo", "report", "view", "sector"];

export function AssistantWidget() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [failed, setFailed] = useState(false);
  // The conversation belongs to one context: moving to another page's questions starts afresh.
  const [log, setLog] = useState<{ key: string; turns: Turn[] }>({ key: "", turns: [] });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const qs = new URLSearchParams();
  for (const k of CONTEXT_PARAMS) {
    const v = params.get(k);
    if (v) qs.set(k, v);
  }
  const ctxUrl = `/api/assistant?path=${encodeURIComponent(pathname)}&qs=${encodeURIComponent(qs.toString())}`;
  const hidden = HIDDEN.some((re) => re.test(pathname));

  // Load the page's questions the first time the panel opens, and again when the reader moves to
  // another page with it open.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!open || loadedUrl === ctxUrl) return;
    let cancelled = false;
    fetch(ctxUrl)
      .then((r) => (r.ok ? (r.json() as Promise<Context>) : Promise.reject()))
      .then((c) => {
        if (cancelled) return;
        setCtx(c);
        setFailed(false);
        setLoadedUrl(ctxUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, ctxUrl, loadedUrl]);

  // Close on a tap outside the panel and button, or on Escape (focus back on the button).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const turns = ctx && log.key === ctx.key ? log.turns : [];
  // Keep the newest answer in view.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  if (hidden) return null;

  const ask = (c: Context, question: Question) => {
    const add = (turn: Turn) => setLog((l) => ({ key: c.key, turns: [...(l.key === c.key ? l.turns : []), turn] }));
    if (!c.ai) {
      add({ id: question.id, q: question.q, a: question.a, ai: false });
      return;
    }
    add({ id: question.id, q: question.q, a: null, ai: false });
    const settle = (a: string, ai: boolean) =>
      setLog((l) => (l.key === c.key ? { ...l, turns: l.turns.map((x) => (x.id === question.id ? { ...x, a, ai } : x)) } : l));
    fetch(`/api/assistant?ctx=${encodeURIComponent(c.key)}&q=${encodeURIComponent(question.id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ answer: string; ai: boolean }>) : Promise.reject()))
      .then((r) => settle(r.answer, r.ai))
      .catch(() => settle(question.a, false));
  };

  const asked = new Set(turns.map((t) => t.id));
  const left = ctx?.questions.filter((x) => !asked.has(x.id)) ?? [];

  return (
    <div ref={rootRef}>
      {open && (
        <div
          role="dialog"
          aria-label="Ask NextResearch"
          className="nr-pop-card fixed right-4 z-[150] flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))", maxHeight: "min(560px, calc(100dvh - 7rem))" }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-ink">Ask NextResearch</p>
              <p className="truncate text-xs text-ink-soft">{ctx ? `About ${ctx.title}` : "Loading questions…"}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="tap-target flex h-7 w-7 flex-none items-center justify-center rounded-full text-ink-soft hover:bg-panel-2 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div ref={logRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {failed && !ctx && <p className="text-sm text-ink-soft">Couldn&apos;t load questions. Check your connection and try again.</p>}
            {ctx && <p className="text-sm text-ink-soft">Pick a question about {ctx.title}.</p>}
            {turns.map((t) => (
              <div key={t.id} className="flex flex-col gap-2">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3 py-2 text-sm font-medium text-bg">{t.q}</p>
                <div className="mr-auto max-w-[92%] rounded-2xl rounded-bl-md bg-panel-2 px-3 py-2 text-sm leading-relaxed text-ink">
                  {t.a == null ? (
                    <span className="inline-flex gap-1 py-1" aria-label="Writing an answer">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft [animation-delay:300ms]" />
                    </span>
                  ) : (
                    <>
                      {t.a}
                      {t.ai && <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">AI-written from our data</span>}
                    </>
                  )}
                </div>
              </div>
            ))}
            {ctx && left.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {left.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => ask(ctx, x)}
                    className="rounded-full border border-line bg-panel px-3 py-1.5 text-left text-[13px] font-medium text-ink hover:border-accent hover:text-accent"
                  >
                    {x.q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="border-t border-line px-4 py-2 text-[11px] leading-snug text-ink-soft">
            Answers come from NextResearch data{ctx?.asOf ? ` as of ${ctx.asOf}` : ""}. Not investment advice.
          </p>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Ask NextResearch" : "Ask NextResearch"}
        aria-expanded={open}
        className="fixed right-4 z-[150] flex h-13 w-13 items-center justify-center rounded-full bg-accent text-bg shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" />
            <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.6" />
          </svg>
        )}
      </button>
    </div>
  );
}
