import { pageHead, breadcrumbs, jsonLd } from "@/lib/seo";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { RetryError } from "@/components/site/RetryError";
import { BadgeCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/site/ProductCard";
import { cldUrl } from "@/lib/cloudinary";
import { getShopPage } from "@/lib/public.functions";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params }) => {
    const res = await getShopPage({ data: { slug: params.slug } });
    if (!res.shop) throw notFound();
    return { ...res, shop: res.shop };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.shop;
    if (!s) return pageHead("Shop unavailable | REBERO Store", "This shop is not publicly available.", "/shop/unavailable", { noindex: true });
    const path = `/shop/${encodeURIComponent(s.slug)}`;
    return { ...pageHead(`${s.name} | Electronics Seller in Rwanda | REBERO Store`, s.description?.slice(0, 170) || `Shop electronics from ${s.name} in ${s.district?.name ?? "Kigali"}. Compare real listings and prices in RWF.`, path, { noindex: s.is_demo, image: s.cover_url || s.logo_url }), scripts: [jsonLd(breadcrumbs([{ name: "Home", path: "/" }, { name: s.name, path }]))] };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-bold">Shop not found</h1>
      <Button asChild className="mt-6"><Link to="/search">Browse products</Link></Button>
    </div>
  ),
  errorComponent: RetryError,
  component: ShopPage,
});

function ShopPage() {
  const { shop: s, products } = Route.useLoaderData();
  return (data ?? []) as unknown as CardProduct[];
    },
  });
  return (
    <div>
      <div className="relative h-40 w-full overflow-hidden bg-ink md:h-64">
        {s.cover_url ? <img src={cldUrl(s.cover_url, { width: 1600, height: 400, crop: "fill" })} alt="" className="size-full object-cover" /> : <div className="size-full bg-gradient-to-br from-primary/40 to-ink" />}
      </div>
      <div className="container-page">
        <nav aria-label="Breadcrumb" className="mt-4 text-sm text-muted-foreground"><Link to="/" className="hover:text-primary">Home</Link> / <span aria-current="page">{s.name}</span></nav>
        <div className="-mt-12 flex flex-col gap-4 md:-mt-16 md:flex-row md:items-end">
          <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-background bg-primary font-display text-3xl font-bold text-primary-foreground shadow-lift md:size-32">
            {s.logo_url ? <img src={cldUrl(s.logo_url, { width: 256, aspectRatio: "1:1" })} alt={s.name} className="size-full object-cover" /> : s.name.slice(0, 1)}
          </span>
          <div className="pb-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">{s.name}{!s.is_demo && <BadgeCheck className="size-6 text-primary" />}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" /> {s.district?.name ?? "Kigali"}{s.is_demo ? " · Sample shop" : " · Approved seller"}</p>
          </div>
        </div>
        {s.description && <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{s.description}</p>}
      </div>
      <div className="container-page py-8">
        <ProductGrid products={products} empty={<p className="text-sm text-muted-foreground">This shop has no products listed right now.</p>} />
      </div>
    </div>
  );
}
