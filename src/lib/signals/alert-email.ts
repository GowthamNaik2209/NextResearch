// The signal alert email (docs/SIGNALS.md section 6): one per user per close, listing every saved
// signal whose entry or exit was met on it. Tables with inline styles in the site's light palette,
// one column, as the morning brief (src/lib/brief/email.ts). Pure, so the tests and the preview
// render exactly what goes out. Says what the rules did, never "buy" or "sell".
import { fmtDay } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";

export type AlertItem = {
  /** The saved signal's stock or basket name, and its target for the link. */
  name: string;
  scope: "stock" | "basket";
  target: string;
  ticker: string;
  kind: "entry" | "exit";
  /** What met it: the rules in a sentence for an entry or an exit rule, or the exit control. */
  why: string;
  price: number;
};
export type AlertEmail = { subject: string; html: string; text: string };

const C = { bg: "#f8f4ea", panel: "#efe9d9", ink: "#14201a", soft: "#536157", line: "#d4cab0", accent: "#0f5c4a", pos: "#187043", neg: "#ac3628" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const price = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: v < 100 ? 2 : 1 })}`;
const verb = (k: AlertItem["kind"]) => (k === "entry" ? "Entry rules met" : "Exit met");

export function alertSubject(items: AlertItem[], day: string): string {
  const d = fmtDay(day).replace(/ \d{4}$/, "");
  if (items.length === 1) return `${items[0].ticker}: ${verb(items[0].kind).toLowerCase()} on the ${d} close`;
  return `${items.length} of your signals triggered on the ${d} close`;
}

function link(site: string, it: AlertItem) {
  return `${site}/signals?${it.scope === "stock" ? `t=${encodeURIComponent(it.target)}` : `b=${encodeURIComponent(it.target)}`}`;
}

export function renderAlertEmail(items: AlertItem[], day: string, links: { site: string; unsubscribe: string }): AlertEmail {
  const subject = alertSubject(items, day);
  const rows = items
    .map(
      (it) => `<tr><td style="padding:12px 0;border-top:1px solid ${C.line};">
<div style="font-size:14px;font-weight:600;color:${C.ink};">${esc(it.ticker)}${it.scope === "basket" ? ` <span style="font-weight:400;color:${C.soft};">in ${esc(it.name)}</span>` : ""}</div>
<div style="font-size:13px;color:${it.kind === "entry" ? C.pos : C.neg};margin-top:2px;">${verb(it.kind)} at ${esc(price(it.price))}</div>
<div style="font-size:12px;color:${C.soft};margin-top:2px;line-height:1.45;">${esc(it.why)}</div>
<div style="margin-top:6px;"><a href="${esc(link(links.site, it))}" style="font-size:12px;color:${C.accent};">Open the backtest</a></div>
</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.panel};border:1px solid ${C.line};border-radius:8px;">
<tr><td style="padding:20px 24px 8px;"><div style="font-size:12px;color:${C.soft};">${esc(SITE_NAME)} · Signals · ${esc(fmtDay(day))} close</div>
<div style="font-size:18px;font-weight:600;color:${C.ink};margin-top:4px;">${esc(subject)}</div>
<div style="font-size:13px;color:${C.soft};margin-top:6px;line-height:1.5;">Your saved rules were met on the last close. In the backtest they trade at the next close.</div></td></tr>
<tr><td style="padding:4px 24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
<tr><td style="padding:12px 24px 20px;border-top:1px solid ${C.line};"><div style="font-size:11px;line-height:1.6;color:${C.soft};">Rules describe what prices did; they are not buy or sell calls. Past prices only, not investment advice.<br><a href="${esc(links.unsubscribe)}" style="color:${C.soft};">Stop signal alerts</a></div></td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    subject,
    "",
    ...items.flatMap((it) => [`${it.ticker}${it.scope === "basket" ? ` (in ${it.name})` : ""}: ${verb(it.kind)} at ${price(it.price)}`, `  ${it.why}`, `  ${link(links.site, it)}`, ""]),
    "Rules describe what prices did; they are not buy or sell calls. Past prices only, not investment advice.",
    `Stop signal alerts: ${links.unsubscribe}`,
  ].join("\n");
  return { subject, html, text };
}
