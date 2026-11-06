import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { unsubscribe } from "./actions";

export const metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

// The email's unsubscribe link lands here and asks first: mail scanners open every link in an email,
// and a GET that unsubscribed would turn the brief off for people who never asked.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const { t, done, error } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 pt-10 pb-14 sm:py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Morning brief emails</h1>
        {done ? (
          <p className="text-sm leading-relaxed text-ink-soft">
            You&rsquo;re unsubscribed and won&rsquo;t get the morning brief again. You can turn it back on from your{" "}
            <Link href="/watchlist" className="text-accent hover:underline">
              watchlist
            </Link>
            .
          </p>
        ) : t ? (
          <>
            <p className="text-sm leading-relaxed text-ink-soft">Stop the 8 am morning brief email? Your watchlist and baskets stay as they are.</p>
            {error && <p className="text-sm text-danger">That link has expired or was already used. Turn the brief off from your watchlist page instead.</p>}
            <form action={unsubscribe}>
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="min-h-10 rounded-lg border border-btn px-4 text-sm font-semibold text-ink hover:bg-accent/10">
                Unsubscribe
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-ink-soft">
            Open this page from the unsubscribe link in a morning brief email, or turn the brief off from your{" "}
            <Link href="/watchlist" className="text-accent hover:underline">
              watchlist
            </Link>
            .
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
