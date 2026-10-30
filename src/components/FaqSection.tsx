import type { Faq } from "@/lib/faq";

// A page's common questions as collapsed rows: one line each until opened, so they add little to the
// page while the full answers stay in the HTML for search and answer engines (lib/faq.ts).
export function FaqSection({ faqs, headingClassName }: { faqs: Faq[]; headingClassName: string }) {
  if (!faqs.length) return null;
  return (
    <section>
      <h2 className={headingClassName}>Common questions</h2>
      <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-panel">
        {faqs.map((f) => (
          <details key={f.q} className="group px-4 py-3 sm:px-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <h3>{f.q}</h3>
              <span aria-hidden className="-mt-0.5 flex-none text-lg leading-none font-semibold text-accent transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
