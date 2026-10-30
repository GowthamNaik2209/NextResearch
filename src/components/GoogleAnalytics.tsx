import Script from "next/script";

// The GA4 tag (gtag.js), loaded after hydration. Page views on client-side navigations come from
// GA4's own "page changes based on browser history events" (Enhanced measurement, on by default),
// so nothing here listens to the router. Custom events go through track() in lib/analytics.ts.
export function GoogleAnalytics({ id }: { id: string }) {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config",${JSON.stringify(id)});`}
      </Script>
    </>
  );
}
