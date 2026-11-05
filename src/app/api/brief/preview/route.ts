// The signed-in user's own morning brief as it would go out (the watchlist page's "Preview" link):
// the latest stored brief, or one built now when none is stored yet. ?format=text for the plain text.
// In local dev only, ?sample=TATAPOWER,LT renders it signed out with those stocks as the watchlist.
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMarketBrief } from "@/lib/brief/market";
import { briefEmail, watchBriefs } from "@/lib/brief/run";
import type { MarketBrief } from "@/lib/brief/types";

export const maxDuration = 60;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sample = process.env.NODE_ENV === "development" ? params.get("sample") : null;
  const user = sample == null ? await getCurrentUser() : null;
  if (!user && sample == null) return new Response("Sign in to preview your morning brief.", { status: 401 });
  try {
    const stored = await prisma.morningBrief.findFirst({ orderBy: { day: "desc" }, select: { data: true } }).catch(() => null);
    const market = (stored?.data as unknown as MarketBrief | undefined) ?? (await buildMarketBrief());
    if (!market) return new Response("No market close to build a brief from yet.", { status: 503 });
    const saved = user
      ? await prisma.watchlist.findMany({ where: { userId: user.id }, select: { priceAtAdd: true, company: { select: { ticker: true, name: true } } } })
      : (await prisma.company.findMany({ where: { ticker: { in: sample!.split(",") } }, select: { ticker: true, name: true } })).map((company) => ({ priceAtAdd: null, company }));
    const [watch] = await watchBriefs(market, [saved.map((w) => ({ ticker: w.company.ticker, name: w.company.name, priceAtAdd: w.priceAtAdd?.toNumber() ?? 0 }))]);
    const email = briefEmail(market, watch, "preview");
    const text = params.get("format") === "text";
    return new Response(text ? `Subject: ${email.subject}\n\n${email.text}` : email.html, {
      headers: { "Content-Type": text ? "text/plain; charset=utf-8" : "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    console.error("brief preview failed", e);
    return new Response("Preview unavailable, try again.", { status: 500 });
  }
}
