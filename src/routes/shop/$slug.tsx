import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid, ProductGridSkeleton } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, type CardProduct } from "@/lib/catalog";
import { getShopPage } from "@/lib/public.functions";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params }) => {
    const res = await getShopPage({ data: { slug: params.slug } });
    if (!res.shop) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const s = loaderData?.shop;
    const title = s ? `${s.name} — Electronics shop on REBERO` : "Shop — REBERO";
    const desc = s?.description?.slice(0, 150) || "Electronics shop on REBERO, Kigali.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-bold">Shop not found</h1>
      <Button asChild className="mt-6"><Link to="/search">Browse products</Link></Button>
    </div>
  ),
  component: ShopPage,
});

function ShopPage() {
  const { shop } = Route.useLoaderData();
  const s = shop!;
  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products", s.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("shop_id", s.id).eq("status", "approved").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CardProduct[];
    },
  });
  return (
    <div>
      <div className="bg-ink text-ink-foreground">
        <div className="container-page flex flex-col gap-4 py-10 md:flex-row md:items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground">{s.name.slice(0, 1)}</span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">{s.name}{!s.is_demo && <BadgeCheck className="size-6 text-primary" />}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted"><MapPin className="size-4" /> {s.district?.name ?? "Kigali"}{s.is_demo ? " · Sample shop" : " · Approved seller"}</p>
            {s.description && <p className="mt-2 max-w-2xl text-sm text-ink-muted">{s.description}</p>}
          </div>
        </div>
      </div>
      <div className="container-page py-8">
        {isLoading ? <ProductGridSkeleton /> : <ProductGrid products={products ?? []} empty={<p className="text-sm text-muted-foreground">This shop has no products listed right now.</p>} />}
      </div>
    </div>
  );
}
