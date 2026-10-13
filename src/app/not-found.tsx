import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
        <p className="font-mono text-sm font-bold text-accent">404</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">We couldn&rsquo;t find that page</h1>
        <p className="text-sm text-ink-soft">The link may be old, or the sector may have moved. Pick up from the home page.</p>
        <Link href="/" className="mt-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
          Back to home
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
