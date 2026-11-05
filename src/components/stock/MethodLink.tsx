import Link from "next/link";

// The "i" notes' way into the full method, opened on this stock's worked example (/baskets/signals).
export function MethodLink({ ticker, children = "How it's worked out, for this stock" }: { ticker?: string; children?: React.ReactNode }) {
  return (
    <Link href={`/baskets/signals${ticker ? `?t=${encodeURIComponent(ticker)}` : ""}#example`} className="mt-1.5 block font-semibold text-accent underline">
      {children} &rarr;
    </Link>
  );
}
