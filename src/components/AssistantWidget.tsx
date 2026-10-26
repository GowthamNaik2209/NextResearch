"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// "Ask NextResearch": a chat button in the bottom-right corner of every page. Opening it (a click,
// or hovering it with a mouse) shows a few suggested questions about what the page is showing
// (lib/assistant decides which); answers come from /api/assistant - code-written from our data, or
// reworded by the AI layer when it is on. Signed-in readers can also type their own question
// (/api/assistant/ask), and the landing page's search box sends questions here ("nr:ask" event).
// Mounted once in the root layout.

type Question = { id: string; q: string; a: string };
type Context = { key: string; title: string; asOf: string | null; ai: boolean; questions: Question[] };
type Source = { key: string; title: string; href: string };
type Turn = { id: string; q: string; a: string | null; ai: boolean; sources?: Source[]; note?: string | null; error?: boolean };
type AskState = { signedIn: boolean; ai: boolean };

/** Fired by HeroSearch (and anything else) to ask the assistant a typed question. */
export const ASK_EVENT = "nr:ask";
export function askAssistant(q: string) {
  window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: { q } }));
}

// Hover opens the panel only where there is a real hover (mouse, trackpad); touch screens tap.
const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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
  // Opened by hover and not touched since: leaving the panel closes it again. A click, a
  // question or typing pins it open until the reader closes it.
  const [pinned, setPinned] = useState(false);
  const [askState, setAskState] = useState<AskState | null>(null);
  const [draft, setDraft] = useState("");
  const [typed, setTyped] = useState<{ turns: Turn[] }>({ turns: [] });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAsk = useRef<string | null>(null);

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

  // Whether the reader can type questions (signed in, AI on): asked each time the panel opens
  // (a session can start or end in another tab), never cached.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/assistant/ask", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AskState>) : Promise.reject()))
      .then((s) => !cancelled && setAskState(s))
      .catch(() => !cancelled && setAskState({ signedIn: false, ai: false }));
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Close on a tap outside the panel and button, or on Escape (focus back on the button).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
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
  }, [log, typed]);

  const askTyped = (question: string) => {
    const q = question.trim();
    if (q.length < 3) return;
    const id = `typed-${Date.now()}`;
    setPinned(true);
    setDraft("");
    setTyped((t) => ({ turns: [...t.turns, { id, q, a: null, ai: false }] }));
    const settle = (patch: Partial<Turn>) => setTyped((t) => ({ turns: t.turns.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    const qs = new URLSearchParams();
    for (const k of CONTEXT_PARAMS) {
      const v = params.get(k);
      if (v) qs.set(k, v);
    }
    fetch("/api/assistant/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, path: pathname, qs: qs.toString() }),
    })
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { answer?: string; ai?: boolean; sources?: Source[]; note?: string | null; error?: string; signIn?: boolean };
        if (r.status === 401) setAskState((s) => ({ ai: s?.ai ?? false, signedIn: false }));
        if (!r.ok || !body.answer) return settle({ a: body.error ?? "Couldn't answer that right now. Try again in a moment.", error: true });
        settle({ a: body.answer, ai: !!body.ai, sources: body.sources ?? [], note: body.note ?? null });
      })
      .catch(() => settle({ a: "Couldn't reach NextResearch. Check your connection and try again.", error: true }));
  };

  // A question sent from elsewhere on the page (the landing search box): open, pin, and ask it
  // once we know the reader may; otherwise leave it in the box above the sign-in link.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<{ q?: string }>).detail?.q?.trim();
      if (!q) return;
      setOpen(true);
      setPinned(true);
      pendingAsk.current = q;
      setDraft(q);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);
  useEffect(() => {
    if (!askState || !pendingAsk.current) return;
    const q = pendingAsk.current;
    pendingAsk.current = null;
    if (askState.signedIn && askState.ai) askTyped(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askState]);

  if (hidden) return null;

  function close() {
    setOpen(false);
    setPinned(false);
  }
  const hoverOpen = () => {
    if (!canHover()) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 120);
  };
  const hoverLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!canHover() || pinned) return;
    hoverTimer.current = setTimeout(() => {
      // Still typing (focus in the box) counts as being there.
      if (!rootRef.current?.contains(document.activeElement)) setOpen(false);
    }, 450);
  };

  const ask = (c: Context, question: Question) => {
    setPinned(true);
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
    <div ref={rootRef} onMouseLeave={hoverLeave} onMouseEnter={() => hoverTimer.current && open && clearTimeout(hoverTimer.current)}>
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
              onClick={close}
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
            {typed.turns.map((t) => (
              <div key={t.id} className="flex flex-col gap-2">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3 py-2 text-sm font-medium text-bg">{t.q}</p>
                <div className={"mr-auto max-w-[92%] rounded-2xl rounded-bl-md px-3 py-2 text-sm leading-relaxed " + (t.error ? "bg-danger/10 text-ink" : "bg-panel-2 text-ink")}>
                  {t.a == null ? (
                    <span className="inline-flex gap-1 py-1" aria-label="Writing an answer">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft [animation-delay:300ms]" />
                    </span>
                  ) : (
                    <>
                      {t.note && <span className="mb-1 block text-xs text-ink-soft">{t.note}</span>}
                      <span className="whitespace-pre-line">{t.a}</span>
                      {!!t.sources?.length && (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {t.sources.map((s) => (
                            <Link
                              key={s.key}
                              href={s.href}
                              onClick={close}
                              className="tap-y rounded-full border border-line bg-panel px-2.5 py-0.5 text-xs font-semibold text-accent hover:border-accent"
                            >
                              {s.title} &rarr;
                            </Link>
                          ))}
                        </span>
                      )}
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

          {askState?.ai && askState.signedIn && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                askTyped(draft);
              }}
              className="flex items-center gap-2 border-t border-line px-3 py-2"
            >
              {/* 16px so iOS Safari doesn't zoom the page when the box takes focus. */}
              <input
                ref={inputRef}
                id="assistant-question"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setPinned(true);
                }}
                maxLength={300}
                enterKeyHint="send"
                autoComplete="off"
                placeholder="Ask anything about our data"
                aria-label="Ask your own question"
                className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-base text-ink outline-none placeholder:text-ink-soft focus:border-accent sm:text-sm"
              />
              <button
                type="submit"
                disabled={draft.trim().length < 3}
                aria-label="Send question"
                className="tap-target flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent text-bg disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          )}
          {askState?.ai && !askState.signedIn && (
            <p className="border-t border-line px-4 py-2.5 text-xs text-ink">
              {draft ? <span className="mb-1 block truncate text-ink-soft">&ldquo;{draft}&rdquo;</span> : null}
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="font-semibold text-accent hover:underline">
                Sign in
              </Link>{" "}
              to ask your own questions. It&apos;s free.
            </p>
          )}
          <p className="border-t border-line px-4 py-2 text-[11px] leading-snug text-ink-soft">
            Answers come from NextResearch data{ctx?.asOf ? ` as of ${ctx.asOf}` : ""}. Not investment advice.
          </p>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          // A click pins the panel open (or closes it), whether or not hover opened it first.
          if (open && pinned) close();
          else {
            setOpen(true);
            setPinned(true);
          }
        }}
        onMouseEnter={hoverOpen}
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
