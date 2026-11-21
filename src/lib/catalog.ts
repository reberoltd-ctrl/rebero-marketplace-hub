import { supabase } from "@/integrations/supabase/client";
import type { ProductCondition } from "@/lib/format";

export const PRODUCT_CARD_SELECT =
  "id, slug, name, brand, model, condition, price_rwf, compare_at_price_rwf, stock, is_featured, is_affiliate_enabled, created_at, view_count, category_id, shop:shops!inner(id, name, slug, status, is_demo, district_id), images:product_images(url, sort_order)";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  model: string | null;
  condition: ProductCondition;
  price_rwf: number;
  compare_at_price_rwf: number | null;
  stock: number;
  is_featured: boolean;
  is_affiliate_enabled: boolean;
  created_at: string;
  view_count: number;
  category_id: string | null;
  shop: { id: string; name: string; slug: string; status: string; is_demo: boolean; district_id: string | null };
  images: { url: string; sort_order: number }[];
};

export function firstImage(p: { images: { url: string; sort_order: number }[] }): string | null {
  const sorted = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.url ?? null;
}

export type ProductFilters = {
  q?: string | undefined;
  category?: string | undefined; // category id
  condition?: ProductCondition | undefined;
  min?: number | undefined;
  max?: number | undefined;
  district?: string | undefined;
  inStock?: boolean | undefined;
  featured?: boolean | undefined;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "popular" | undefined;
  limit?: number | undefined;
  ids?: string[] | undefined;
};

export async function fetchProducts(f: ProductFilters = {}): Promise<CardProduct[]> {
  let query = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("status", "approved").eq("shop.status", "approved");
  if (f.q) {
    const term = f.q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (f.category) query = query.eq("category_id", f.category);
  if (f.condition) query = query.eq("condition", f.condition);
  if (f.min != null) query = query.gte("price_rwf", f.min);
  if (f.max != null) query = query.lte("price_rwf", f.max);
  if (f.district) query = query.eq("shop.district_id", f.district);
  if (f.inStock) query = query.gt("stock", 0);
  if (f.featured) query = query.eq("is_featured", true);
  if (f.ids) query = query.in("id", f.ids.length ? f.ids : ["00000000-0000-0000-0000-000000000000"]);
  switch (f.sort) {
    case "price_asc":
      query = query.order("price_rwf", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_rwf", { ascending: false });
      break;
    case "popular":
      query = query.order("view_count", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }
  const { data, error } = await query.limit(f.limit ?? 48);
  if (error) throw error;
  return (data ?? []) as unknown as CardProduct[];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, icon, parent_id, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchDistricts() {
  const { data, error } = await supabase.from("districts").select("id, name, province").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export const categoriesQuery = { queryKey: ["categories"], queryFn: fetchCategories, staleTime: 5 * 60_000 };
export const districtsQuery = { queryKey: ["districts"], queryFn: fetchDistricts, staleTime: 30 * 60_000 };
