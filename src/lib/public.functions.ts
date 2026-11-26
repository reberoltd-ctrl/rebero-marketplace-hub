import { createServerFn } from "@tanstack/react-start";
import { SITE_URL, brandSlug } from "@/lib/seo";
import { PRODUCT_CARD_SELECT, type CardProduct, type ProductFilters } from "@/lib/catalog";
import type { SearchParams } from "@/lib/search-params";
import { readAllPages } from "@/lib/pagination";

/** Public product page data (approved products only, enforced by row security). */
export const getProductPage = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (typeof input?.slug !== "string" || input.slug.length > 200) throw new Error("Invalid product");
    return { slug: input.slug };
  })
  .handler(async ({ data }) => {
    const { publicClient } = await import("@/lib/public-client.server");
    const sb = publicClient();
    const { data: product, error } = await sb
      .from("products")
      .select(
        "id, slug, name, brand, model, description, condition, price_rwf, compare_at_price_rwf, stock, warranty, specs, is_featured, is_affiliate_enabled, created_at, category_id, shop:shops!inner(id, name, slug, status, is_demo, address, description, logo_url, district:districts(name)), category:categories(id, name, slug), images:product_images(url, sort_order)",
      )
      .eq("slug", data.slug)
      .eq("status", "approved")
      .eq("shop.status", "approved")
      .maybeSingle();
    if (error) throw new Error("Could not load this product");
    const related = product?.category_id ? await readPublicCards({ category: product.category_id, limit: 9 }) : [];
    return { product, origin: SITE_URL, related: related.filter((p) => p.id !== product?.id).slice(0, 4) };
  });

/** Public shop page data. */
export const getShopPage = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (typeof input?.slug !== "string" || input.slug.length > 200) throw new Error("Invalid shop");
    return { slug: input.slug };
  })
  .handler(async ({ data }) => {
    const { publicClient } = await import("@/lib/public-client.server");
    const sb = publicClient();
    const { data: shop, error } = await sb
      .from("shops")
      .select("id, name, slug, description, address, logo_url, cover_url, is_demo, business_type, approved_at, district:districts(name)")
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw new Error("Could not load this shop");
    const products = shop ? await readAllPages(async (offset, size) => {
      const result = await sb.from("products").select(PRODUCT_CARD_SELECT).eq("status", "approved").eq("shop.status", "approved").eq("shop_id", shop.id).order("id").range(offset, offset + size - 1);
      return { data: result.data as unknown as CardProduct[] | null, error: result.error };
    }) : [];
    return { shop, origin: SITE_URL, products };
  });

async function readPublicCards(f: ProductFilters = {}): Promise<CardProduct[]> {
  const { publicClient } = await import("@/lib/public-client.server");
  let q = publicClient().from("products").select(PRODUCT_CARD_SELECT).eq("status", "approved").eq("shop.status", "approved");
  if (f.category) q = q.eq("category_id", f.category);
  if (f.condition) q = q.eq("condition", f.condition);
  if (f.min != null) q = q.gte("price_rwf", f.min);
  if (f.max != null) q = q.lte("price_rwf", f.max);
  if (f.inStock) q = q.gt("stock", 0);
  if (f.featured) q = q.eq("is_featured", true);
  if (f.district) q = q.eq("shop.district_id", f.district);
  if (f.q) { const term = f.q.replace(/[%,()]/g, " ").trim(); if (term) q = q.or(`name.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,description.ilike.%${term}%`); }
  if (f.sort === "price_asc" || f.sort === "price_desc") q = q.order("price_rwf", { ascending: f.sort === "price_asc" });
  else if (f.sort === "popular") q = q.order("view_count", { ascending: false });
  else q = q.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  const { data, error } = await q.limit(f.limit ?? 48);
  if (error) throw new Error("Could not load products");
  return (data ?? []) as unknown as CardProduct[];
}

export const getCategoryPage = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string; filters: SearchParams }) => input)
  .handler(async ({ data }) => {
    const { publicClient } = await import("@/lib/public-client.server");
    const sb = publicClient();
    const { data: category, error } = await sb.from("categories").select("id, name, slug, icon").eq("is_active", true).eq("slug", data.slug).maybeSingle();
    if (error) throw new Error("Could not load category");
    const f = data.filters;
    const products = category ? await readPublicCards({ ...f, category: category.id, inStock: f.stock }) : [];
    return { category, products };
  });

export const getHomePage = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("@/lib/public-client.server");
  const sb = publicClient();
  const [products, cats, shops, slides] = await Promise.all([
    readPublicCards({ limit: 60, sort: "newest" }),
    sb.from("categories").select("id, name, slug, icon, parent_id, sort_order").eq("is_active", true).order("sort_order"),
    sb.from("shops").select("id, name, slug, description, is_demo, district:districts(name)").eq("status", "approved").order("approved_at", { ascending: false }).limit(8),
    sb.from("shop_spotlights").select("id, title, description, image_url, sort_order, starts_at, ends_at, shop:shops!inner(name, slug, status)").eq("status", "approved").eq("shop.status", "approved").order("sort_order").order("created_at", { ascending: false }).limit(20),
  ]);
  if (cats.error || shops.error || slides.error) throw new Error("Could not load the marketplace");
  const now = Date.now();
  return { products, categories: cats.data ?? [], shops: shops.data ?? [], slides: (slides.data ?? []).filter((s) => (!s.starts_at || Date.parse(s.starts_at) <= now) && (!s.ends_at || Date.parse(s.ends_at) > now)).slice(0, 10) };
});

export const getBrandCatalogue = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("@/lib/public-client.server");
  const sb = publicClient();
  const products = await readAllPages(async (offset, size) => {
    const result = await sb.from("products").select(PRODUCT_CARD_SELECT).eq("status", "approved").eq("shop.status", "approved").eq("shop.is_demo", false).order("id").range(offset, offset + size - 1);
    return { data: result.data as unknown as CardProduct[] | null, error: result.error };
  });
  const brands = [...new Set(products.map((p) => p.brand?.trim()).filter((b): b is string => !!b))].map((name) => ({ name, slug: brandSlug(name) })).filter((b) => b.slug);
  return { products, brands };
});
