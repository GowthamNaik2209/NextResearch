import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureFinancials } from "@/lib/financials/load";
import { aiAskEnabled, answerQuestion, MAX_QUESTION_CHARS } from "@/lib/assistant/ask";

// Typed questions for "Ask NextResearch" (src/lib/assistant/ask.ts).
//   GET  /api/assistant/ask                                  -> { signedIn, ai }: what the panel offers
//   POST /api/assistant/ask { q, path, qs }                  -> AskAnswer
// AI-written answers are for signed-in readers: the free AI allowance is shared by everyone, and an
// account keeps bots from spending it. Signed-out readers get the matched pages' own answers (no
// model call). No daily cap per reader yet; a short burst limit stops a stuck client or a script
// from using the day's allowance in a minute. Never cached by the CDN (per reader).

const BURST = 6;
const BURST_MS = 60_000;
// Per server instance, which is enough for a burst guard; a daily cap would need the database.
const recent = new Map<string, number[]>();

function overBurst(userId: string): boolean {
  const now = Date.now();
  const times = (recent.get(userId) ?? []).filter((t) => now - t < BURST_MS);
  times.push(now);
  recent.set(userId, times);
  return times.length > BURST;
}

const noStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ signedIn: !!user, ai: aiAskEnabled() }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => null)) as { q?: unknown; path?: unknown; qs?: unknown } | null;
  const q = typeof body?.q === "string" ? body.q.trim() : "";
  if (q.length < 3) return NextResponse.json({ error: "Type a question first." }, { status: 400, headers: noStore });
  if (q.length > MAX_QUESTION_CHARS) return NextResponse.json({ error: `Keep questions under ${MAX_QUESTION_CHARS} characters.` }, { status: 400, headers: noStore });
  // Signed-out readers are told apart by address; their answers cost no model call anyway.
  const who = user?.id ?? `ip:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
  if (overBurst(who)) return NextResponse.json({ error: "That's a lot of questions at once. Wait a minute and ask again." }, { status: 429, headers: noStore });
  const path = typeof body?.path === "string" && body.path.startsWith("/") ? body.path : "/";
  const qs = new URLSearchParams(typeof body?.qs === "string" ? body.qs : "");
  try {
    // Answers quote the company table, which the app loads from the database on first use.
    await ensureFinancials();
    return NextResponse.json(await answerQuestion(q, path, qs, { ai: !!user }), { headers: noStore });
  } catch (e) {
    console.error("assistant ask failed", e);
    return NextResponse.json({ error: "Couldn't answer that right now. Try again in a moment." }, { status: 500, headers: noStore });
  }
}
