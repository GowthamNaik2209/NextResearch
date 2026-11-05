// Sends the brief through Resend's HTTP API (no SDK: one POST per batch of up to 100 emails).
// Needs RESEND_API_KEY and BRIEF_FROM ("NextResearch <brief@nextresearchapp.in>", the site's domain,
// verified in Resend); without them nothing is sent and the send route reports a dry run. The
// sending address has no inbox, so replies go to the contact address (CONTACT_EMAIL).
import { CONTACT_EMAIL } from "@/lib/site";

export type OutMail = { to: string; subject: string; html: string; text: string; unsubscribe: string };

const RESEND_BATCH = "https://api.resend.com/emails/batch";
export const BATCH_MAX = 100;

export const mailerReady = () => Boolean(process.env.RESEND_API_KEY && process.env.BRIEF_FROM);

/** Sends up to BATCH_MAX emails in one call. Resend takes or refuses a batch whole: true when it was taken. */
export async function sendBatch(mails: OutMail[]): Promise<boolean> {
  if (!mails.length) return true;
  if (mails.length > BATCH_MAX) throw new Error(`sendBatch: ${mails.length} emails, at most ${BATCH_MAX}`);
  const from = process.env.BRIEF_FROM!;
  try {
    const res = await fetch(RESEND_BATCH, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        mails.map((m) => ({
          from,
          to: [m.to],
          reply_to: CONTACT_EMAIL,
          subject: m.subject,
          html: m.html,
          text: m.text,
          // One-click unsubscribe (RFC 8058): Gmail and Yahoo require it from bulk senders.
          headers: { "List-Unsubscribe": `<${m.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        })),
      ),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) console.error(`[brief] Resend refused a batch of ${mails.length}: ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
    return res.ok;
  } catch (e) {
    console.error("[brief] Resend unreachable", e);
    return false;
  }
}
