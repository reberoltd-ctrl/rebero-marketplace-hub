import { BRAND_MEDIA, cldUrl } from "@/lib/cloudinary";
import { CONDITION_LABEL, formatRwf, type ProductCondition } from "@/lib/format";

// The configured production origin, never the editor preview or caller-supplied headers.
export const SITE_URL = "https://rebero-marketplace-hub.lovable.app";
export const SITE_NAME = "REBERO Store";
export const siteUrl = (path: string) => new URL(path, `${SITE_URL}/`).href;
export const brandSlug = (brand: string) => brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function pageHead(title: string, description: string, path: string, options: { noindex?: boolean; image?: string | null; type?: string } = {}) {
  const image = options.image?.startsWith("https://") ? cldUrl(options.image, { width: 1200, height: 630, crop: "fill", format: "jpg" }) : null;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: options.type ?? "website" },
      { property: "og:url", content: siteUrl(path) },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ...(options.noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
    links: [{ rel: "canonical", href: siteUrl(path) }],
  };
}

export const jsonLd = (value: unknown) => ({ type: "application/ld+json", children: JSON.stringify(value).replace(/</g, "\\u003c") });
export function breadcrumbs(items: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: siteUrl(item.path) })) };
}
export const organization = {
  "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME, legalName: "REBERO Ltd", url: SITE_URL, logo: cldUrl(BRAND_MEDIA.logo, { width: 600 }),
};

type SeoProduct = {
  id: string; slug: string; name: string; brand: string | null; model: string | null;
  description: string | null; condition: ProductCondition; price_rwf: number; stock: number;
  images: { url: string; sort_order: number }[]; shop: { name: string; slug: string; is_demo: boolean };
};
export const schemaCondition: Record<ProductCondition, string> = {
  new: "https://schema.org/NewCondition", used: "https://schema.org/UsedCondition", refurbished: "https://schema.org/RefurbishedCondition",
};
export function productDescription(p: SeoProduct) {
  const detail = p.description?.replace(/\s+/g, " ").trim();
  return `${p.shop.is_demo ? "Sample listing — not a real offer. " : ""}${p.name}: ${CONDITION_LABEL[p.condition].toLowerCase()}, ${formatRwf(p.price_rwf)}. ${p.stock > 0 ? "In stock" : "Out of stock"} at ${p.shop.name}, Rwanda.${detail ? ` ${detail}` : ""}`.slice(0, 170);
}
export function productSchema(p: SeoProduct) {
  return {
    "@context": "https://schema.org", "@type": "Product", "@id": `${siteUrl(`/product/${encodeURIComponent(p.slug)}`)}#product`,
    name: p.name, description: p.description || `${CONDITION_LABEL[p.condition]} ${p.name} sold by ${p.shop.name}.`,
    image: [...p.images].sort((a, b) => a.sort_order - b.sort_order).map((im) => cldUrl(im.url, { width: 1200 })),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.model ? { model: p.model } : {}),
    productID: p.id, itemCondition: schemaCondition[p.condition],
    // Labelled demo listings must never be represented as real merchant offers.
    ...(!p.shop.is_demo ? { offers: {
      "@type": "Offer", url: siteUrl(`/product/${encodeURIComponent(p.slug)}`), priceCurrency: "RWF", price: p.price_rwf,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: schemaCondition[p.condition], seller: { "@type": "Organization", name: p.shop.name, url: siteUrl(`/shop/${encodeURIComponent(p.shop.slug)}`) },
    } } : {}),
  };
}