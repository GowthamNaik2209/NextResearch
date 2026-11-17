"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

// A link to /signup that records which one was pressed (signup_click), so the funnel shows whether
// the header, the landing page's closing pitch or a save prompt brings people to sign up.
export function SignupLink({ from, href = "/signup", className, children }: { from: string; href?: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => track("signup_click", { from })}>
      {children}
    </Link>
  );
}
