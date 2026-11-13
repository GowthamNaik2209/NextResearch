import type { ReactNode } from "react";

// The building blocks of the method pages (/baskets/projections, /baskets/signals): headings,
// paragraphs, formula boxes and tables that scroll sideways inside their own box on a phone.
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-20 font-display text-lg font-bold text-ink sm:text-xl">
      {children}
    </h2>
  );
}
export const H3 = ({ children }: { children: ReactNode }) => <h3 className="font-semibold text-ink">{children}</h3>;
export const P = ({ children }: { children: ReactNode }) => <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">{children}</p>;
export const B = ({ children }: { children: ReactNode }) => <b className="text-ink">{children}</b>;
export const Note = ({ children }: { children: ReactNode }) => <p className="max-w-3xl text-[11px] leading-relaxed text-ink-soft">{children}</p>;
export const Formula = ({ children }: { children: ReactNode }) => (
  <p className="max-w-3xl overflow-x-auto rounded border border-line bg-panel-2/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">{children}</p>
);
export const Bullets = ({ children }: { children: ReactNode }) => <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">{children}</ul>;
/** `hide`: a column left out on a phone, so the ones that matter fit. */
export const Th = ({ children, left, hide }: { children: ReactNode; left?: boolean; hide?: boolean }) => (
  <th scope="col" className={"whitespace-nowrap px-2 py-1.5 font-semibold " + (left ? "text-left" : "text-right") + (hide ? " max-sm:hidden" : "")}>
    {children}
  </th>
);
export const Td = ({ children, left, tone, wrap, hide }: { children: ReactNode; left?: boolean; tone?: number; wrap?: boolean; hide?: boolean }) => (
  <td
    className={
      (wrap ? "" : "whitespace-nowrap ") +
      "px-2 py-1.5 font-mono " +
      (left ? "text-left font-sans" : "text-right") +
      (tone == null ? "" : tone >= 0 ? " text-pos" : " text-danger") +
      (hide ? " max-sm:hidden" : "")
    }
  >
    {children}
  </td>
);
/** A table that scrolls sideways inside its own box on a phone, never the page. `tall`: a long list
 * that also scrolls down inside a framed box, its column labels staying in view. */
export const Table = ({ min, head, children, tall }: { min: string; head: ReactNode; children: ReactNode; tall?: boolean }) => (
  <div className={"max-w-full overflow-x-auto" + (tall ? " max-h-[28rem] overflow-y-auto rounded border border-line" : "")}>
    <table className={`w-full ${min} border-collapse text-xs`}>
      <thead className={"border-b border-line text-[10px] uppercase tracking-wider text-ink-soft" + (tall ? " sticky top-0 z-10 bg-panel shadow-[0_1px_0_var(--line)]" : "")}>
        <tr>{head}</tr>
      </thead>
      <tbody className="text-ink">{children}</tbody>
    </table>
  </div>
);
export const Row = ({ children, last }: { children: ReactNode; last?: boolean }) => <tr className={last ? "" : "border-b border-line/60"}>{children}</tr>;
