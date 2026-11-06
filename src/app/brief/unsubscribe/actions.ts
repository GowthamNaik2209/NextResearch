"use server";

import { redirect } from "next/navigation";
import { unsubscribeToken } from "@/lib/brief/prefs";

export async function unsubscribe(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  const ok = await unsubscribeToken(token);
  redirect(`/brief/unsubscribe?${ok ? "done=1" : `t=${encodeURIComponent(token)}&error=1`}`);
}
