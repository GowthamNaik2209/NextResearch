// The morning brief as an email: subject, preview line, HTML and plain text. Email clients ignore
// stylesheets and most layout CSS, so the HTML is tables with inline styles, one column (it reads
// the same on a phone), in the site's light palette: many mail apps invert or repaint dark emails.
// Pure, so the tests and the preview route render exactly what goes out.
import { croreShort, fmtDay, inr, signedPct } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import type { MarketBrief, WatchBrief, WatchItem } from "./types";

export type BriefEmail = { subject: string; preview: string; html: string; text: string };
export type BriefLinks = { site: string; unsubscribe: string };

// The site's light theme (globals.css :root[data-theme="light"]).
const C = { bg: "#f8f4ea", panel: "#efe9d9", ink: "#14201a", soft: "#536157", line: "#d4cab0", accent: "#0f5c4a", pos: "#187043", neg: "#ac3628" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
// Rows shown before "+ N more".
const WATCH_ROWS = 8;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tone = (v: number | null | undefined) => (v == null || Math.abs(v) < 0.05 ? C.soft : v > 0 ? C.pos : C.neg);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Thu 5 Nov" */
const dayShort = (day: string) => `${WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]} ${fmtDay(day).replace(/ \d{4}$/, "")}`;
const signedCr = (cr: number) => `${cr > 0 ? "+" : ""}${croreShort(cr)}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------- pieces

const section = (inner: string) => `<tr><td style="padding:18px 24px;border-top:1px solid ${C.line};">${inner}</td></tr>`;
const label = (s: string) => `<div style="font-size:12px;color:${C.soft};margin:0 0 10px;">${esc(s)}</div>`;
const heading = (s: string) => `<div style="font-size:16px;font-weight:600;color:${C.ink};margin:0 0 10px;">${esc(s)}</div>`;

// Every list in the email is one fixed-layout table (table-layout:fixed): the first column takes
// what's left, the figure columns have set widths and never wrap, and the first column always holds
// a name line with an optional detail line under it. So rows read the same whatever the name's
// length and nothing pushes the email wider than a phone screen.
const ROW_LINE = `border-top:1px solid ${C.line};`;

/** A name over an optional detail line (both HTML; escape what goes in). */
const stack = (title: string, sub = "") =>
  `<div style="font-size:13px;font-weight:600;color:${C.ink};line-height:1.35;word-wrap:break-word;">${title}</div>${sub ? `<div style="font-size:12px;color:${C.soft};line-height:1.35;margin-top:2px;word-wrap:break-word;">${sub}</div>` : ""}`;

const link = (href: string, text: string) => `<a href="${esc(href)}" style="color:${C.ink};text-decoration:none;">${esc(text)}</a>`;

/** A figure cell's text: coloured, never wrapping. */
const fig = (text: string, color: string) => `<span style="font-size:13px;color:${color};white-space:nowrap;">${esc(text)}</span>`;

/** A list column: a set width in px (none: takes what's left) and its alignment. */
type Col = { width?: number; align?: "right" };
const NAME: Col = {};
const FIG = (width: number): Col => ({ width, align: "right" });

/** A list table: each row is its cells' HTML (names as `stack`, figures as `fig`); `head` labels the columns. */
function listTable(cols: Col[], rows: string[][], head?: string[]): string {
  const colgroup = `<colgroup>${cols.map((c) => (c.width ? `<col width="${c.width}" style="width:${c.width}px;">` : "<col>")).join("")}</colgroup>`;
  const cell = (html: string, j: number, i: number, isHead = false) =>
    `<td valign="top" align="${cols[j].align ?? "left"}" style="padding:${isHead ? "0 0 4px" : "8px 0"}${j ? " 0 8px" : ""};${!isHead && i ? ROW_LINE : ""}${isHead ? `font-size:11px;color:${C.soft};white-space:nowrap;` : ""}">${html}</td>`;
  const headRow = head ? `<tr>${head.map((h, j) => cell(esc(h), j, 0, true)).join("")}</tr>` : "";
  const body = rows.map((r, i) => `<tr>${r.map((c, j) => cell(c, j, i)).join("")}</tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;width:100%;">${colgroup}${headRow}${body}</table>`;
}

/** One figure tile: three single lines (label, figure, detail). The border is on the cell, so tiles in a row share a height. */
function tile(name: string, value: string, valueColor: string, sub: string, subColor = C.soft): string {
  const line = (size: number, color: string, text: string, bold = false) =>
    `<div style="font-size:${size}px;${bold ? "font-weight:600;" : ""}color:${color};white-space:nowrap;overflow:hidden;line-height:1.35;">${esc(text)}</div>`;
  return `<td width="50%" valign="top" style="width:50%;border:1px solid ${C.line};border-radius:8px;padding:10px;">${line(12, C.soft, name)}${line(18, valueColor, value, true)}${line(12, subColor, sub)}</td>`;
}

function closeSection(m: MarketBrief): string {
  const tiles: string[] = m.indices.map((i) => tile(i.name, inr(i.close, 1), C.ink, `${i.change >= 0 ? "+" : "−"}${inr(Math.abs(i.change), 1)} (${signedPct(i.pct, 2)})`, tone(i.pct)));
  if (m.flows) {
    const f = m.flows;
    // Short enough for a tile on a 320px phone: "Buying 4 days", "Nov −₹7,783 Cr".
    const side = f.fiiNetCr >= 0 ? "Buying" : "Selling";
    const streak = f.fiiStreak > 1 ? `${side} ${f.fiiStreak} days` : f.fiiNetCr >= 0 ? "Net buyers" : "Net sellers";
    tiles.push(tile("FII net (cash)", signedCr(f.fiiNetCr), tone(f.fiiNetCr), streak));
    tiles.push(tile("DII net (cash)", signedCr(f.diiNetCr), tone(f.diiNetCr), `${MONTHS[Number(f.day.slice(5, 7)) - 1]} ${signedCr(f.diiMonthCr)}`));
  }
  if (!tiles.length) return "";
  const rows: string[] = [];
  for (let i = 0; i < tiles.length; i += 2)
    rows.push(`${i ? '<tr><td colspan="3" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>' : ""}<tr>${tiles[i]}<td width="8" style="width:8px;"></td>${tiles[i + 1] ?? '<td width="50%"></td>'}</tr>`);
  return section(
    `${label(`Close on ${dayShort(m.day)}`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;width:100%;border-collapse:separate;">${rows.join("")}</table>`,
  );
}

/** The best-performing themes on the brief day, each linked to its basket page. */
function themeSection(m: MarketBrief, site: string): string {
  if (!m.themes.length) return "";
  const rows = m.themes.map((t) => [stack(link(`${site}/baskets/industry/${t.slug}`, t.name), `${t.kind} theme`), fig(signedPct(t.ret), tone(t.ret))]);
  return section(`${label(`Best-performing themes on ${SITE_NAME}`)}${listTable([NAME, FIG(64)], rows)}`);
}

/** The figures line over the morning's headlines, each linked to its publisher. */
function highlightSection(m: MarketBrief): string {
  if (!m.summary && !m.headlines.length) return "";
  const items = m.headlines
    .map(
      (h) =>
        `<li style="margin:0 0 8px;"><a href="${esc(h.url)}" style="color:${C.ink};text-decoration:none;">${esc(h.headline)}</a><br><span style="color:${C.soft};font-size:12px;">${esc(h.source)}</span></li>`,
    )
    .join("");
  return section(
    `${heading("Market highlights")}${m.summary ? `<div style="font-size:14px;line-height:1.6;color:${C.ink};margin-bottom:${items ? "12px" : "0"};">${esc(m.summary)}</div>` : ""}${items ? `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5;">${items}</ul>` : ""}`,
  );
}

// Rows in "Key dates": the user's own stocks' dates always fit; market dates fill the rest.
const DATE_ROWS = 6;

/** The user's stock dates and the market's, soonest first; the stocks' marked "Watchlist". */
export function mergedDates(m: MarketBrief, w: WatchBrief | null): { day: string; what: string; mine: boolean }[] {
  const mine = (w?.events ?? []).map((e) => ({ ...e, mine: true }));
  const market = m.keyDates.slice(0, Math.max(0, DATE_ROWS - mine.length)).map((e) => ({ ...e, mine: false }));
  return [...mine, ...market].sort((a, b) => a.day.localeCompare(b.day));
}

function watchRow(w: WatchItem, site: string): string[] {
  const milestone = w.milestone != null ? ` · <span style="color:${C.accent};font-weight:600;">${w.milestone > 0 ? "crossed" : "down past"} ${signedPct(w.milestone, 0)}</span>` : "";
  return [stack(link(`${site}/company/${w.slug}`, w.name), `₹${inr(w.close, 2)}${milestone}`), fig(signedPct(w.dayPct), tone(w.dayPct)), fig(signedPct(w.sincePct), tone(w.sincePct))];
}

/** A filled button (a table cell, so Gmail and Outlook keep its shape and nothing sits beside it). */
const button = (href: string, text: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.accent}" style="background:${C.accent};border-radius:6px;"><a href="${esc(href)}" style="display:block;font-size:14px;font-weight:600;line-height:20px;padding:10px 18px;color:${C.bg};text-decoration:none;">${esc(text)}</a></td></tr></table>`;

/** First email only: a thank-you above the figures. */
function welcomeSection(): string {
  return `<tr><td style="padding:18px 24px;border-top:1px solid ${C.line};">${heading(`Thank you for using ${SITE_NAME}`)}<div style="font-size:14px;line-height:1.6;color:${C.ink};">This is your first morning brief: the market close, the best themes on ${SITE_NAME} and your watchlist, every trading day at 8 am.</div></td></tr>`;
}

const hasStocks = (w: WatchBrief | null): w is WatchBrief => Boolean(w?.items.length);

function watchSection(m: MarketBrief, w: WatchBrief | null, site: string): string {
  if (!hasStocks(w))
    return section(
      `${heading("Your watchlist")}<div style="font-size:14px;color:${C.ink};line-height:1.6;margin-bottom:14px;">Add stocks to your watchlist to get updates on them here every morning.</div>${button(site, `Explore ${SITE_NAME}`)}`,
    );
  const up = w.items.filter((i) => (i.dayPct ?? 0) > 0).length;
  const shown = w.items.slice(0, WATCH_ROWS);
  const more = w.items.length - shown.length;
  const moreLine = more ? `<div style="padding:8px 0 0;${ROW_LINE}font-size:13px;color:${C.soft};">+ ${more} more · <a href="${esc(`${site}/watchlist`)}" style="color:${C.accent};">see all</a></div>` : "";
  const deals = w.deals.map((d) => `<div style="font-size:12px;color:${C.ink};line-height:1.5;margin-top:8px;word-wrap:break-word;"><span style="color:${C.soft};">Deal · ${esc(d.name)} ·</span> ${esc(d.text)}</div>`).join("");
  return section(
    `${heading("Your watchlist")}<div style="font-size:12px;color:${C.soft};margin:-6px 0 10px;">${w.items.length} stocks · ${up} up on ${esc(dayShort(m.day))}</div>${listTable([NAME, FIG(64), FIG(84)], shown.map((i) => watchRow(i, site)), ["Stock", "Day", "Since added"])}${moreLine}${deals}`,
  );
}

/** Key dates: the date in a fixed column, the event (and whose it is) beside it. */
function datesSection(m: MarketBrief, w: WatchBrief | null): string {
  const dates = mergedDates(m, w);
  if (!dates.length) return "";
  const rows = dates.map((k) => [`<span style="font-size:13px;color:${C.soft};white-space:nowrap;">${esc(dayShort(k.day))}</span>`, stack(esc(k.what), k.mine ? `<span style="color:${C.accent};">Your watchlist</span>` : "")]);
  return section(`${label("Key dates")}${listTable([{ width: 84 }, NAME], rows)}`);
}

function ipoSection(m: MarketBrief, site: string): string {
  if (!m.ipos.length) return "";
  const rows = m.ipos.map((i) => [stack(link(`${site}/ipos?ipo=${i.slug}`, i.name), esc([i.label, i.size].filter(Boolean).join(" · ")))]);
  return section(
    `${label(m.iposDated === false ? "IPO pipeline (approved, not yet dated)" : "Upcoming IPOs")}${listTable([NAME], rows)}<div style="margin-top:8px;font-size:12px;"><a href="${esc(`${site}/ipos`)}" style="color:${C.accent};">Read the 10-slide IPO summaries</a></div>`,
  );
}

// ---------------------------------------------------------------- the email

export function briefSubject(m: MarketBrief, w: WatchBrief | null): string {
  const parts: string[] = [];
  const nifty = m.indices[0];
  if (nifty) parts.push(`${nifty.name.replace(/ 50$/, "")} ${signedPct(nifty.pct, 1)}`);
  if (m.flows) parts.push(`FIIs ${m.flows.fiiNetCr >= 0 ? "buy" : "sell"} ${croreShort(Math.abs(m.flows.fiiNetCr))}`);
  const top = w?.items[0];
  const head = parts.join(", ") || `Market brief for ${dayShort(m.day)}`;
  return top && top.dayPct != null && Math.abs(top.dayPct) >= 1 ? `${head} · ${top.name} ${signedPct(top.dayPct)} in your watchlist` : head;
}

/** `first`: the user's first brief, which opens with a thank-you. */
export function renderBriefEmail(m: MarketBrief, w: WatchBrief | null, links: BriefLinks, sendDay: string, { first = false } = {}): BriefEmail {
  const subject = briefSubject(m, w);
  const preview = `${first ? `Thank you for using ${SITE_NAME}. ` : ""}Your 2-minute read before the open: the close, your watchlist, key dates and IPOs`;
  const site = links.site;
  const body = [
    first ? welcomeSection() : "",
    closeSection(m),
    highlightSection(m),
    themeSection(m, site),
    watchSection(m, w, site),
    datesSection(m, w),
    ipoSection(m, site),
  ].join("");

  // The last line is hidden and differs every day: Gmail trims ("•••") the part of an email that
  // repeats the one before it in a conversation, and the footer otherwise repeats daily.
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.panel};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.panel};"><tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.bg};border:1px solid ${C.line};border-radius:12px;font-family:${FONT};color:${C.ink};">
<tr><td style="padding:18px 24px;">
<div style="font-size:17px;font-weight:600;color:${C.accent};">${SITE_NAME} morning brief</div>
<div style="font-size:12px;color:${C.soft};margin-top:2px;">${esc(dayShort(sendDay))} ${sendDay.slice(0, 4)}</div></td></tr>
${body}
<tr><td style="padding:${hasStocks(w) ? "6px" : "18px"} 24px 20px;${hasStocks(w) ? "" : `border-top:1px solid ${C.line};`}">
${hasStocks(w) ? `${button(`${site}/watchlist`, "Open your watchlist")}<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>` : ""}<div style="font-size:11px;line-height:1.6;color:${C.soft};"><a href="${esc(links.unsubscribe)}" style="color:${C.soft};">Unsubscribe</a> · Not investment advice</div>
<div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;">${esc(`${sendDay} ${m.day}`)}</div></td></tr>
</table></td></tr></table></body></html>`;

  return { subject, preview, html, text: renderText(m, w, links, sendDay, first) };
}

function renderText(m: MarketBrief, w: WatchBrief | null, links: BriefLinks, sendDay: string, first: boolean): string {
  const out: string[] = [`${SITE_NAME} morning brief · ${dayShort(sendDay)} ${sendDay.slice(0, 4)}`, ""];
  if (first) out.push(`Thank you for using ${SITE_NAME}. This is your first morning brief: the market close, the best themes on ${SITE_NAME} and your watchlist, every trading day at 8 am.`, "");
  out.push(`CLOSE ON ${dayShort(m.day).toUpperCase()}`);
  for (const i of m.indices) out.push(`${i.name}: ${inr(i.close, 1)} (${signedPct(i.pct, 2)})`);
  if (m.flows) out.push(`FII net (cash): ${signedCr(m.flows.fiiNetCr)}`, `DII net (cash): ${signedCr(m.flows.diiNetCr)}`);
  if (m.summary || m.headlines.length) out.push("", "MARKET HIGHLIGHTS", ...(m.summary ? [m.summary] : []), ...m.headlines.map((h) => `- ${h.headline} (${h.source}) ${h.url}`));
  if (m.themes.length) out.push("", `BEST-PERFORMING THEMES ON ${SITE_NAME.toUpperCase()}`, ...m.themes.map((t) => `${t.name} (${t.kind}): ${signedPct(t.ret)}`));
  if (w?.items.length) {
    out.push("", "YOUR WATCHLIST (day / since added)");
    for (const i of w.items.slice(0, WATCH_ROWS)) out.push(`${i.name}: ${signedPct(i.dayPct)} / ${signedPct(i.sincePct)}${i.milestone != null ? ` (crossed ${signedPct(i.milestone, 0)})` : ""}`);
    if (w.items.length > WATCH_ROWS) out.push(`+ ${w.items.length - WATCH_ROWS} more: ${links.site}/watchlist`);
    for (const d of w.deals) out.push(`Deal · ${d.name} · ${d.text}`);
  } else out.push("", "YOUR WATCHLIST", `Add stocks to your watchlist to get updates on them here every morning: ${links.site}`);
  const dates = mergedDates(m, w);
  if (dates.length) out.push("", "KEY DATES", ...dates.map((k) => `${dayShort(k.day)}: ${k.what}${k.mine ? " (watchlist)" : ""}`));
  if (m.ipos.length) out.push("", m.iposDated === false ? "IPO PIPELINE (APPROVED, NOT YET DATED)" : "UPCOMING IPOS", ...m.ipos.map((i) => `${i.name}: ${[i.label, i.size].filter(Boolean).join(" · ")}`));
  if (w?.items.length) out.push("", `Open your watchlist: ${links.site}/watchlist`);
  out.push("", `Unsubscribe: ${links.unsubscribe} · Not investment advice`);
  return out.join("\n");
}
