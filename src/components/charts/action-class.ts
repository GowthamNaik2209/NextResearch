// Shared by the industry page (a Server Component) and its button row (IndustryActions, a Client
// Component), so it lives outside both.

/** One look for every button in the row: small on phones, the usual size from tablet up. */
export function actionClass(primary: boolean, on = false) {
  return (
    "flex min-h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-center text-xs font-semibold transition sm:min-h-10 sm:px-3.5 sm:text-sm lg:flex-none lg:px-3 xl:px-4 " +
    (primary ? "border-accent bg-accent text-bg hover:opacity-90" : on ? "border-accent text-ink" : "border-line font-normal text-ink-soft hover:border-accent hover:text-ink")
  );
}
