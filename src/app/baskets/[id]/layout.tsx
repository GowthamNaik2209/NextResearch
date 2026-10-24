import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getVisibleBasket } from "@/lib/baskets/store";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats } from "@/lib/baskets/projection-risk-data";

// A basket that doesn't exist (deleted, mistyped, or someone else's private one) must answer
// HTTP 404, not the 404 page with a 200. The page's loading.tsx starts streaming (status 200
// sent) before the page can check, but a layout is outside that Suspense boundary, so the check
// lives here. getVisibleBasket is cached per request, so the page reuses this read.
export default async function BasketLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!(await getVisibleBasket(id, user?.id ?? null))) notFound();
  return children;
}
