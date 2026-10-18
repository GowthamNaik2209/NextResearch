// A short bulleted list for authored one-line points (a sector's "What this is" / "Why now").
export function Points({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={"list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink marker:text-accent " + className}>
      {items.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}
