"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Sends one GA4 event when a server-rendered state is reached (the sign-up "check your email" screen).
export function TrackOnMount({ name, params }: { name: Parameters<typeof track>[0]; params?: Record<string, string> }) {
  useEffect(() => {
    track(name, params);
    // Once per mount: params is a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  return null;
}
