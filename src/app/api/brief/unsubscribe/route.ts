// One-click unsubscribe (RFC 8058): mail apps POST here from the email's List-Unsubscribe header.
// The link in the email body opens /brief/unsubscribe instead, which asks before turning it off, so
// a mail scanner following links never unsubscribes anyone.
import { unsubscribeToken } from "@/lib/brief/prefs";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  try {
    const ok = await unsubscribeToken(token);
    return Response.json({ ok }, { status: ok ? 200 : 404 });
  } catch (e) {
    console.error("brief unsubscribe failed", e);
    return Response.json({ error: "try again" }, { status: 500 });
  }
}
