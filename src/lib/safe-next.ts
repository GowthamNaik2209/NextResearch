// The `next` param on login/signup/OAuth-callback says where to land after auth. It comes
// from the URL, so only same-site paths are honoured: "/sector/x?stock=Y" passes, while
// "//evil.com", "/\evil.com", "https://evil.com" or "@evil.com" (which would turn
// `${origin}${next}` into "https://site@evil.com") fall back to the home page.
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Control characters (tabs/newlines are stripped by URL parsers) could smuggle "//" through.
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}

// Where to send someone who wants to save `ticker` but isn't signed in: back to the page
// they're on with the stock pop-up reopened (see ReturnToStock).
export function returnToStockPath(pathname: string, search: string, ticker: string): string {
  const params = new URLSearchParams(search);
  params.set("stock", ticker);
  return `${pathname}?${params.toString()}`;
}
