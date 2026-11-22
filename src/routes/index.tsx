import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Link2, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useAuth } from "@/lib/auth";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { ProductGrid, ProductGridSkeleton } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, fetchProducts, type CardProduct } from "@/lib/catalog";
import { useRecentlyViewed } from "@/lib/recent";
import type { SearchParams } from "@/lib/search-params";
import { HomeSpotlight } from "@/components/spotlight/HomeSpotlight";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "REBERO — Electronics Marketplace in Kigali, Rwanda" },
      { name: "description", content: "Buy new, refurbished and used phones, laptops, TVs and accessories from trusted Kigali electronics shops. Prices in RWF." },
      { property: "og:title", content: "REBERO — Your Technology. Your Marketplace." },
      { property: "og:description", content: "Buy and sell electronics across Kigali — new, refurbished and used, from verified shops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Section({ title, subtitle, to, search, children }: { title: string; subtitle?: string; to?: "/search"; search?: SearchParams; children: ReactNode }) {
  return (
    <section className="container-page mt-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} search={search ?? {}} className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover">
            View all <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const recentIds = useRecentlyViewed();
  const { user } = useAuth();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: products, isLoading } = useQuery({ queryKey: ["home-products"], queryFn: () => fetchProducts({ limit: 60, sort: "newest" }) });
  const { data: shops = [] } = useQuery({
    queryKey: ["home-shops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("id, name, slug, description, is_demo, district:districts(name)").eq("status", "approved").order("approved_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: recent = [] } = useQuery({
    queryKey: ["recent-products", recentIds],
    enabled: recentIds.length > 0,
    queryFn: () => fetchProducts({ ids: recentIds, limit: 8 }),
  });

  const all: CardProduct[] = products ?? [];
  const byDate = [...all].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const featured = all.filter((p) => p.is_featured).slice(0, 8);
  const trending = all.filter((p) => p.view_count > 0).sort((a, b) => b.view_count - a.view_count).slice(0, 4);
  const deals = all.filter((p) => p.compare_at_price_rwf && p.compare_at_price_rwf > p.price_rwf).slice(0, 4);
  const refurbished = all.filter((p) => p.condition === "refurbished").slice(0, 4);
  const used = all.filter((p) => p.condition === "used").slice(0, 4);
  const affiliate = all.filter((p) => p.is_affiliate_enabled).slice(0, 4);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/search", search: { q: q.trim() || undefined } });
  };

  return (
    <div className="pb-4">
      {/* Homepage spotlight: shop slides approved by admins */}
      <HomeSpotlight />

      {/* Categories: slideshow showing 3 at a time */}
      {categories.length > 0 && (
        <Section title="Popular categories" to="/search">
          <CategorySlideshow categories={categories} />
        </Section>
      )}

      {isLoading ? (
        <Section title="Latest products"><ProductGridSkeleton /></Section>
      ) : all.length === 0 ? (
        <Section title="Latest products">
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">No products are listed yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Approved sellers' products will appear here.</p>
            <Button asChild className="mt-4"><Link to="/sell">Become a seller</Link></Button>
          </div>
        </Section>
      ) : (
        <>
          {featured.length > 0 && <Section title="Featured products" subtitle="Hand-picked by the REBERO team"><ProductGrid products={featured} /></Section>}
          {trending.length > 0 && <Section title="Trending electronics" subtitle="Most viewed right now" to="/search" search={{ sort: "popular" }}><ProductGrid products={trending} /></Section>}
          <Section title="New arrivals" to="/search" search={{ sort: "newest" }}><ProductGrid products={byDate.slice(0, 8)} /></Section>
          {deals.length > 0 && <Section title="Best deals" subtitle="Genuine price drops from sellers"><ProductGrid products={deals} /></Section>}
          {refurbished.length > 0 && <Section title="Refurbished electronics" to="/search" search={{ condition: "refurbished" }}><ProductGrid products={refurbished} /></Section>}
          {used.length > 0 && <Section title="Used electronics" to="/search" search={{ condition: "used" }}><ProductGrid products={used} /></Section>}
        </>
      )}

      {shops.length > 0 && (
        <Section title="Verified electronics shops">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shops.map((s) => (
              <Link key={s.id} to="/shop/$slug" params={{ slug: s.slug }} className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-lift">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink font-display font-bold text-ink-foreground">{s.name.slice(0, 1)}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 truncate font-semibold">
                    {s.name} {!s.is_demo && <BadgeCheck className="size-4 shrink-0 text-success" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.is_demo ? "Sample shop" : s.district?.name ?? "Kigali"}</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {recent.length > 0 && <Section title="Recently viewed"><ProductGrid products={recent.slice(0, 4)} /></Section>}

      {affiliate.length > 0 && (
        <Section title="Share and earn" subtitle="Products you can promote once you're an approved affiliate"><ProductGrid products={affiliate} /></Section>
      )}

      {/* Become seller / affiliate: only shown to signed-in visitors */}
      {user && (
      <section className="container-page mt-14 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-ink p-8 text-ink-foreground">
          <Store className="size-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Sell your electronics on REBERO</h2>
          <p className="mt-2 text-sm text-ink-muted">Open a shop for free, list new, refurbished or used products and reach buyers across Kigali. A 2% commission applies only on completed sales.</p>
          <Button asChild className="mt-6"><Link to="/sell">Become a seller</Link></Button>
        </div>
        <div className="rounded-2xl border bg-accent p-8">
          <Link2 className="size-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Share products, earn commission</h2>
          <p className="mt-2 text-sm text-muted-foreground">Approved affiliates earn 1% on completed sales from the product links they share on WhatsApp, Facebook and beyond.</p>
          <Button asChild variant="ink" className="mt-6"><Link to="/affiliate">Become an affiliate</Link></Button>
        </div>
      </section>
      )}
    </div>
  );
}

type CategoryTile = { id: string; slug: string; name: string; icon: string | null };

/** Shows three categories at a time and slides to the next ones every few seconds. */
function CategorySlideshow({ categories }: { categories: CategoryTile[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api || paused) return;
    const timer = setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 3500);
    return () => clearInterval(timer);
  }, [api, paused]);

  return (
    <Carousel setApi={setApi} opts={{ align: "start", loop: true, slidesToScroll: 3 }} className="px-10"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <CarouselContent>
        {categories.map((c) => (
          <CarouselItem key={c.id} className="basis-1/3">
            <Link to="/category/$slug" params={{ slug: c.slug }}
              className="group flex h-full flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center text-sm font-medium transition-colors hover:border-primary">
              <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <CategoryIcon name={c.icon} className="size-6" />
              </span>
              <span className="line-clamp-2">{c.name}</span>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-0" />
      <CarouselNext className="right-0" />
    </Carousel>
  );
}
