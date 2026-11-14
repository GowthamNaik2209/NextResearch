import { SITE_URL, jsonLd } from "@/lib/site";

/** A page's structured data for search and answer engines: the nodes go into one schema.org @graph. */
export function JsonLd({ graph }: { graph: object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": graph }) }} />;
}

/** A BreadcrumbList node from [name, path] pairs, home first implied. */
export function breadcrumbLd(trail: [name: string, path: string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE_URL}${path}` })),
  };
}

/** The page's own node, tied to the site's WebSite node from the layout. */
export function webPageLd({ type = "WebPage", path, name, description, dateModified }: { type?: string; path: string; name: string; description?: string; dateModified?: string | null }) {
  return {
    "@type": type,
    url: `${SITE_URL}${path}`,
    name,
    ...(description ? { description } : {}),
    ...(dateModified ? { dateModified } : {}),
    inLanguage: "en-IN",
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

/** An ItemList node of named links. */
export function itemListLd(name: string, items: { name: string; path: string }[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: `${SITE_URL}${x.path}` })),
  };
}
