import { NextResponse, type NextRequest } from "next/server";
import { buildContext, contextKeyForPath } from "@/lib/assistant";
import { aiAnswer, aiEnabled } from "@/lib/assistant/ai";

// GET /api/assistant?path=/sector/defence&qs=report%3Ddefence
//   -> the page's context: { key, title, asOf, ai, questions: [{ id, q, a }] } (code-written answers)
// GET /api/assistant?ctx=sector:defence&q=valuation
//   -> { answer, ai } - the AI-written answer when GROQ_API_KEY is set and it passes the checks,
//      otherwise the code-written one. Only fixed (context, question) pairs exist, so both responses
//      are CDN-cacheable and model calls stay bounded however many people ask.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ctxKey = sp.get("ctx");
  const qid = sp.get("q");

  if (ctxKey && qid) {
    const ctx = buildContext(ctxKey);
    const question = ctx?.questions.find((x) => x.id === qid);
    if (!ctx || !question) return NextResponse.json({ error: "unknown question" }, { status: 404 });
    const ai = await aiAnswer(ctx.key, ctx.title, question);
    return NextResponse.json(
      { answer: ai ?? question.a, ai: !!ai },
      // A fallback (rate limit, failed check) is cached briefly so the AI gets another try later.
      { headers: { "Cache-Control": ai ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=300" } },
    );
  }

  const key = contextKeyForPath(sp.get("path") ?? "/", new URLSearchParams(sp.get("qs") ?? ""));
  // A slug that no longer exists (renamed sector, removed IPO) falls back to the platform questions.
  const ctx = buildContext(key) ?? buildContext("platform")!;
  return NextResponse.json(
    { key: ctx.key, title: ctx.title, asOf: ctx.asOf, ai: aiEnabled(), questions: ctx.questions.map(({ id, q, a }) => ({ id, q, a })) },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
