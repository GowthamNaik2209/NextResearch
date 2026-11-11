import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureFinancials } from "@/lib/financials/load";
import { deleteSaved, listSaved, MAX_SAVED, saveSignal, setAlerts } from "@/lib/signals/saved";
import { parseStrategy } from "@/lib/signals/strategy";
import { isScope, resolveTarget } from "@/lib/signals/targets";

// A user's saved signals (docs/SIGNALS.md section 6). GET: all of them, newest first. PUT { scope,
// target, strategy, alerts }: save the rules for that stock or basket (one set each, replaced on a
// new save). PATCH { id, alerts }: alerts on or off. DELETE ?id=: remove one. Per user: never cached.
const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE });
const broke = (what: string, e: unknown) => {
  console.error(`signals saved: ${what} failed`, e);
  return fail(500, "Saved signals are unavailable right now. Try again shortly.");
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Sign in to see your saved signals");
  try {
    return NextResponse.json({ saved: await listSaved(user.id) }, { headers: NO_STORE });
  } catch (e) {
    return broke("list", e);
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Sign in to save signals");
  const body = (await req.json().catch(() => null)) as { scope?: unknown; target?: unknown; strategy?: unknown; alerts?: unknown } | null;
  if (!isScope(body?.scope) || typeof body?.target !== "string") return fail(400, "Pick a stock or basket first");
  const parsed = parseStrategy(body.strategy);
  if (!parsed.ok) return fail(400, parsed.error);
  await ensureFinancials();
  try {
    const target = await resolveTarget(body.scope, body.target, user.id);
    if (!target) return fail(404, "That stock or basket isn't available");
    const saved = await saveSignal(user.id, target.scope, target.target, target.name, parsed.strategy, body.alerts === true);
    if (!saved) return fail(409, `You can keep up to ${MAX_SAVED} saved signals. Delete one to save another.`);
    return NextResponse.json({ saved }, { headers: NO_STORE });
  } catch (e) {
    return broke("save", e);
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Sign in to change alerts");
  const body = (await req.json().catch(() => null)) as { id?: unknown; alerts?: unknown } | null;
  if (typeof body?.id !== "string" || typeof body.alerts !== "boolean") return fail(400, "Bad request");
  try {
    return (await setAlerts(user.id, body.id, body.alerts)) ? NextResponse.json({ ok: true }, { headers: NO_STORE }) : fail(404, "Saved signal not found");
  } catch (e) {
    return broke("alerts", e);
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Sign in to delete signals");
  const id = new URL(req.url).searchParams.get("id") ?? "";
  try {
    return (await deleteSaved(user.id, id)) ? NextResponse.json({ ok: true }, { headers: NO_STORE }) : fail(404, "Saved signal not found");
  } catch (e) {
    return broke("delete", e);
  }
}
