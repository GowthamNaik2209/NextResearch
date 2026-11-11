"use server";

import { redirect } from "next/navigation";
import { unsubscribeAlerts } from "@/lib/signals/saved";

export async function unsubscribe(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  const ok = await unsubscribeAlerts(token);
  redirect(`/signals/unsubscribe?${ok ? "done=1" : `t=${encodeURIComponent(token)}&error=1`}`);
}
