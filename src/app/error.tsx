"use client";

// Any page that fails while rendering (a client crash, a data read that threw) lands here, in the
// site's own frame, instead of the framework's bare "This page couldn't load" screen.
import Link from "next/link";
import { useEffect } from "react";

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
      <p className="font-mono text-sm font-bold text-accent">Something went wrong</p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">This page didn&rsquo;t load</h1>
      <p className="text-sm text-ink-soft">It may be a brief hiccup while figures refresh. Try again, or pick up from the home page.</p>
      <div className="mt-2 flex gap-3">
        <button type="button" onClick={reset} className="rounded-lg border border-accent px-5 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10">
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
          Back to home
        </Link>
      </div>
    </main>
  );
}
