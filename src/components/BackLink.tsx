"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { noteVisit, returnLabel, returnTarget, type ReturnScope, type ReturnTarget } from "@/lib/return-to";

/** Mounted once in the root layout: notes every page this tab visits, for the back-style buttons. */
export function NavTrail() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    noteVisit();
  }, [pathname, search]);
  return null;
}

/**
 * A back-style link ("← All deep dives"): goes back to the page the visitor came from when it
 * is one `scope` returns to (see return-to.ts), stepping back through history when that page is
 * right behind this one (so its scroll is kept), and is the plain `href` link otherwise.
 * `labelClassName` wraps the words after the arrow (the explorer hides them on phones).
 */
export function BackLink({ scope, href, label, className, labelClassName }: { scope: ReturnScope; href: string; label: string; className?: string; labelClassName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [target, setTarget] = useState<ReturnTarget | null>(null);
  useEffect(() => {
    // After mount, as it reads the browser's history and storage (the server sends the plain link).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(returnTarget(scope));
  }, [scope, pathname]);
  const words = returnLabel(target, label);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!target?.back || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.back();
  };
  return (
    <Link href={target?.href ?? href} onClick={onClick} className={className} aria-label={`Back to ${words.toLowerCase()}`} title={`Back to ${words.toLowerCase()}`}>
      &larr;{labelClassName ? <span className={labelClassName}> {words}</span> : <> {words}</>}
    </Link>
  );
}
