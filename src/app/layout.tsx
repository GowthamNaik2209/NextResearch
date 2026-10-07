import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
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
  title: "NextResearch",
  description: "Fund-level research for India's public markets — explore a sector's supply chain in 3D, then deep-dive into any company's financials.",
};

// Applied synchronously during HTML parsing, before first paint, so a saved
// "light" choice never flashes the server-rendered dark default (see Next's
// "preventing flash before hydration" guide — useEffect runs too late). The
// `<html>` below renders a literal data-theme="dark" default; suppressHydrationWarning
// tells React to accept whatever this script leaves in the DOM instead of
// treating the dark->light rewrite as a mismatch. Keep the storage key and
// values in sync with ThemeToggle.tsx.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("nr-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        {/* type flips client-side so React doesn't warn about rendering a live
            <script> tag (it never executes it on the client either way — this
            element's only job is to run once, synchronously, during the
            server HTML's initial parse). */}
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
