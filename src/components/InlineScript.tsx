"use client";

// A <script> that runs once during the server HTML's parse and is inert after that (Next's
// "preventing flash before hydration" pattern). It must be a Client Component: `typeof window`
// is only "object" when this runs in the browser. Rendered from a Server Component the RSC
// payload always said text/javascript, so whenever React built the tree on the client (the 404
// path re-renders the root layout there) it warned "Encountered a script tag".
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
