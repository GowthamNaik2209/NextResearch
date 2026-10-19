import { SiteHeader } from "@/components/SiteHeader";

// Shown the moment a basket opens (straight after creating one, too) while the server loads it,
// so the tap answers at once instead of waiting on the page.
export default function LoadingBasket() {
  const bar = "animate-pulse rounded-lg bg-line/60";
  return (
    <>
      <SiteHeader />
      <main aria-busy className="mx-auto flex w-full max-w-4xl lg:max-w-7xl flex-1 flex-col gap-4 px-5 py-14">
        <span className="sr-only">Opening the basket…</span>
        <div className={`${bar} h-3 w-24`} />
        <div className={`${bar} h-9 w-64 max-w-full`} />
        <div className="flex gap-2">
          <div className={`${bar} h-10 w-40`} />
          <div className={`${bar} h-10 w-20`} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className={`${bar} h-24`} />
          <div className={`${bar} h-24`} />
        </div>
        <div className={`${bar} h-10 w-full`} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${bar} h-16 w-full`} />
        ))}
      </main>
    </>
  );
}
