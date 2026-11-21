import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Heart, MapPin, Package, ShieldCheck, ShoppingCart, Truck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/site/ProductCard";
import { ShareButtons } from "@/components/site/ShareButtons";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/lib/cart";
import { fetchProducts } from "@/lib/catalog";
import { absoluteUrl, CONDITION_LABEL, discountPercent, formatRwf } from "@/lib/format";
import { getProductPage } from "@/lib/public.functions";
import { pushRecentlyViewed, storeReferral } from "@/lib/recent";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  validateSearch: (raw: Record<string, unknown>): { ref?: string } =>
    typeof raw["ref"] === "string" && /^[0-9a-f-]{36}$/i.test(raw["ref"]) ? { ref: raw["ref"] } : {},
  loader: async ({ params }) => {
    const res = await getProductPage({ data: { slug: params.slug } });
    if (!res.product) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Product not found — REBERO" }] };
    const imgs = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const img = imgs[0] ? absoluteUrl(imgs[0].url, loaderData.origin) : null;
    const title = `${p.name} — ${formatRwf(p.price_rwf)} | REBERO`;
    const desc = `${CONDITION_LABEL[p.condition]} · ${formatRwf(p.price_rwf)} · Sold by ${p.shop.name} on REBERO, Kigali.`;
    const url = loaderData.origin ? `${loaderData.origin}/product/${p.slug}` : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: `${p.name} — ${formatRwf(p.price_rwf)}` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        ...(url ? [{ property: "og:url", content: url }] : []),
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }, { property: "og:image:alt", content: p.name }] : []),
        { property: "product:price:amount", content: String(p.price_rwf) },
        { property: "product:price:currency", content: "RWF" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-bold">This product isn't available</h1>
      <p className="mt-2 text-muted-foreground">It may have been sold, removed or is awaiting approval.</p>
      <Button asChild className="mt-6"><Link to="/search">Browse products</Link></Button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const { ids, toggle } = useWishlist();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);

  const product = p!;
  const images = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const off = discountPercent(product.price_rwf, product.compare_at_price_rwf);
  const specs = Object.entries((product.specs ?? {}) as Record<string, string>).filter(([k, v]) => k && v);
  const saved = ids.includes(product.id);

  useEffect(() => {
    pushRecentlyViewed(product.id);
    void supabase.rpc("increment_product_view", { _product_id: product.id });
    if (ref) storeReferral(ref, product.id);
    setActive(0);
  }, [product.id, ref]);

  const { data: related = [] } = useQuery({
    queryKey: ["related", product.id],
    enabled: !!product.category_id,
    queryFn: async () => (await fetchProducts({ category: product.category_id ?? undefined, limit: 9 })).filter((x) => x.id !== product.id).slice(0, 4),
  });

  const add = (goToCart: boolean) => {
    cart.add({
      productId: product.id, slug: product.slug, name: product.name, priceRwf: product.price_rwf,
      image: images[0]?.url ?? null, shopId: product.shop.id, shopName: product.shop.name, stock: product.stock,
    }, qty);
    if (goToCart) void navigate({ to: "/cart" });
    else toast.success("Added to cart");
  };

  return (
    <div className="container-page py-8">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        {product.category && (
          <> / <Link to="/category/$slug" params={{ slug: product.category.slug }} className="hover:text-foreground">{product.category.name}</Link></>
        )}
      </nav>

      {product.shop.is_demo && (
        <div className="mb-6 rounded-lg border border-warning bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
          This is a sample listing for testing REBERO. It is not a real offer.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
            {images[active] ? <img src={images[active].url} alt={product.name} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-muted-foreground"><Package className="size-10" /></div>}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((im, i) => (
                <button key={im.url + i} type="button" onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`}
                  className={cn("size-20 shrink-0 overflow-hidden rounded-lg border-2", i === active ? "border-primary" : "border-transparent")}>
                  <img src={im.url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={product.condition === "new" ? "success" : product.condition === "refurbished" ? "accent" : "muted"}>{CONDITION_LABEL[product.condition]}</Badge>
            {product.is_featured && <Badge variant="ink">Featured</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">{product.name}</h1>
          {(product.brand || product.model) && (
            <p className="mt-1 text-sm text-muted-foreground">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>
          )}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold">{formatRwf(product.price_rwf)}</span>
            {off && <><span className="text-muted-foreground line-through">{formatRwf(product.compare_at_price_rwf)}</span><Badge>-{off}%</Badge></>}
          </div>
          <p className={cn("mt-2 text-sm font-medium", product.stock > 0 ? "text-success" : "text-destructive")}>
            {product.stock > 0 ? `In stock · ${product.stock} available` : "Out of stock"}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border">
              <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</Button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Increase quantity">+</Button>
            </div>
            <Button size="lg" onClick={() => add(false)} disabled={product.stock < 1}><ShoppingCart /> Add to cart</Button>
            <Button size="lg" variant="ink" onClick={() => add(true)} disabled={product.stock < 1}><Zap /> Buy now</Button>
            <Button size="lg" variant="outline" onClick={() => toggle(product.id)} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}>
              <Heart className={cn(saved && "fill-primary text-primary")} />
            </Button>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Share this product</p>
            <ShareButtons slug={product.slug} name={product.name} priceLabel={formatRwf(product.price_rwf)} />
          </div>

          <div className="mt-6 grid gap-3 rounded-xl border bg-card p-4 text-sm">
            <Link to="/shop/$slug" params={{ slug: product.shop.slug }} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-ink font-display font-bold text-ink-foreground">{product.shop.name.slice(0, 1)}</span>
              <span>
                <span className="flex items-center gap-1 font-semibold">{product.shop.name}{!product.shop.is_demo && <BadgeCheck className="size-4 text-success" />}</span>
                <span className="text-xs text-muted-foreground">{product.shop.is_demo ? "Sample shop" : "Approved seller"}</span>
              </span>
            </Link>
            {product.shop.district?.name && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> {product.shop.district.name}, Kigali</p>}
            <p className="flex items-center gap-2 text-muted-foreground"><Truck className="size-4" /> Delivery is arranged by the seller after you order.</p>
            {product.warranty && <p className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="size-4" /> {product.warranty}</p>}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description || "The seller hasn't added a description yet."}</p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Specifications</h2>
          {specs.length ? (
            <dl className="mt-3 divide-y rounded-xl border bg-card text-sm">
              {specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 gap-4 px-4 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">The seller hasn't listed specifications.</p>
          )}
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-bold">Customer reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet. Verified buyers will be able to review this product after delivery.</p>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">Similar products</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
