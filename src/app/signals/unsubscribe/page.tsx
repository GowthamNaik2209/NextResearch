import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { unsubscribe } from "./actions";

export const metadata = { title: "Signal alerts", robots: { index: false, follow: false } };

// The alert email's unsubscribe link lands here and asks first: mail scanners open every link in an
// email, and a GET that unsubscribed would turn alerts off for people who never asked. Works on
// phones too (it isn't behind the Signals phone gate): the email is often read on one.
export default async function SignalAlertsUnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const { t, done, error } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 pt-10 pb-14 sm:py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Signal alert emails</h1>
        {done ? (
          <p className="text-sm leading-relaxed text-ink-soft">Alerts are off for all your saved signals. Your saved rules stay; you can turn alerts back on from Signals on a tablet or computer.</p>
        ) : t ? (
          <>
            <p className="text-sm leading-relaxed text-ink-soft">Stop alert emails for all your saved signals? The saved rules stay as they are.</p>
            {error && <p className="text-sm text-danger">That link has expired or was already used. Turn alerts off from Signals instead.</p>}
            <form action={unsubscribe}>
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="min-h-10 rounded-lg border border-btn px-4 text-sm font-semibold text-ink hover:bg-accent/10">
                Stop alert emails
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-ink-soft">Open this page from the link in a signal alert email, or turn alerts off from Signals.</p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
