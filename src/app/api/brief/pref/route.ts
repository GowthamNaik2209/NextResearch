// The signed-in user's morning brief toggle (the watchlist page's BriefToggle).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { briefEnabled, setBrief } from "@/lib/brief/prefs";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ signedIn: false, morningBrief: false }, { headers: NO_STORE });
    return NextResponse.json({ signedIn: true, morningBrief: await briefEnabled(user.id) }, { headers: NO_STORE });
  } catch (e) {
    console.error("brief pref read failed", e);
    return NextResponse.json({ error: "unavailable, try again" }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401, headers: NO_STORE });
    const body = (await request.json().catch(() => null)) as { morningBrief?: unknown } | null;
    if (typeof body?.morningBrief !== "boolean") return NextResponse.json({ error: "morningBrief must be true or false" }, { status: 400, headers: NO_STORE });
    await setBrief(user.id, body.morningBrief);
    return NextResponse.json({ morningBrief: body.morningBrief }, { headers: NO_STORE });
  } catch (e) {
    console.error("brief pref write failed", e);
    return NextResponse.json({ error: "couldn't save, try again" }, { status: 500, headers: NO_STORE });
  }
}
