// One-click unsubscribe (RFC 8058) for signal alert emails: mail apps POST here from the email's
// List-Unsubscribe header. The link in the email body opens /signals/unsubscribe instead, which asks.
import { unsubscribeAlerts } from "@/lib/signals/saved";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  try {
    const ok = await unsubscribeAlerts(token);
    return Response.json({ ok }, { status: ok ? 200 : 404 });
  } catch (e) {
    console.error("signal alerts unsubscribe failed", e);
    return Response.json({ error: "try again" }, { status: 500 });
  }
}
