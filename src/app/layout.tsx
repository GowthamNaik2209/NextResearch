import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
// The documented `@vercel/analytics/next` entry point fails to resolve under
// this project's Turbopack dev server ("Module not found", reproducible even
// with a clean .next cache, though plain Node resolves it fine) - `/react`
// resolves correctly and the actual pageview tracking (including Next.js
// client-side navigations) is handled by Vercel's injected script patching
// the History API globally, not by this wrapper, so nothing is lost.
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import { ReturnToStock } from "@/components/stock/ReturnToStock";
import { InlineScript } from "@/components/InlineScript";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { AppResume } from "@/components/AppResume";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CONTACT_EMAIL, GA_ID, INSTAGRAM_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, SITE_VERIFICATION, jsonLd, shareMeta } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Added to an iPhone home screen: opens full-screen, named "NextResearch" under the icon.
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  keywords: [
    "Indian stock market research",
    "supply chain stocks India",
    "sector analysis India",
    "data centre stocks India",
    "EV supply chain India",
    "semiconductor stocks India",
    "railway stocks",
    "defence shipbuilding stocks",
    "ALMM solar stocks",
    "NSE BSE company research",
  ],
  alternates: { canonical: "/" },
  ...shareMeta({ title: SITE_NAME, line: "See where every listed Indian company sits in the supply chain.", path: "/", image: null }),
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
  verification: {
    google: SITE_VERIFICATION.google,
    other: SITE_VERIFICATION.bing ? { "msvalidate.01": SITE_VERIFICATION.bing } : undefined,
  },
};

// The browser bar / status bar colour: the light page background. ThemeToggle's setTheme (and
// the init script below) switch it to the dark one when dark mode is on.
export const viewport: Viewport = {
  themeColor: "#f8f4ea",
};

const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      logo: `${SITE_URL}/icons/icon-512.png`,
      email: CONTACT_EMAIL,
      sameAs: [INSTAGRAM_URL],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en-IN",
    },
  ],
};

// Applied synchronously during HTML parsing, before first paint, so a saved
// "dark" choice never flashes the server-rendered light default (see Next's
// "preventing flash before hydration" guide — useEffect runs too late). The
// `<html>` below renders a literal data-theme="dark" default; suppressHydrationWarning
// tells React to accept whatever this script leaves in the DOM instead of
// treating the light->dark rewrite as a mismatch. Keep the storage key and
// values in sync with ThemeToggle.tsx.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("nr-theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#0c1110")}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs once, synchronously, during the server HTML's parse; InlineScript flips its
            type to text/plain on the client so React never renders a live <script>. */}
        <InlineScript html={THEME_INIT_SCRIPT} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(SITE_JSON_LD) }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {children}
        {/* Reads ?stock= (useSearchParams), so it needs its own Suspense boundary to keep
            the rest of every page prerenderable. */}
        <Suspense fallback={null}>
          <ReturnToStock />
        </Suspense>
        {/* ⌥/Alt + letter top-bar shortcuts, on every page. */}
        <KeyboardShortcuts />
        <AppResume />
        <Analytics />
        {GA_ID && <GoogleAnalytics id={GA_ID} />}
      </body>
    </html>
  );
}
