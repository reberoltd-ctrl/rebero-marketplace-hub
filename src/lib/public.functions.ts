import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  // Fall back to the build-time public values so hosts without server env vars (e.g. Vercel) still work.
  const url = process.env["SUPABASE_URL"] || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function requestOrigin(): string {
  try {
    const req = getRequest();
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

/** Public product page data (approved products only, enforced by row security). */
export const getProductPage = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => {
    if (typeof input?.slug !== "string" || input.slug.length > 200) throw new Error("Invalid product");
    return { slug: input.slug };
  })
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: product, error } = await sb
      .from("products")
      .select(
        "id, slug, name, brand, model, description, condition, price_rwf, compare_at_price_rwf, stock, warranty, specs, is_featured, is_affiliate_enabled, created_at, category_id, shop:shops!inner(id, name, slug, status, is_demo, address, description, logo_url, district:districts(name)), category:categories(id, name, slug), images:product_images(url, sort_order)",
      )
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw new Error("Could not load this product");
    return { product, origin: requestOrigin() };
  });

/** Public shop page data. */
export const getShopPage = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => {
    if (typeof input?.slug !== "string" || input.slug.length > 200) throw new Error("Invalid shop");
    return { slug: input.slug };
  })
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: shop, error } = await sb
      .from("shops")
      .select("id, name, slug, description, address, logo_url, cover_url, is_demo, business_type, approved_at, district:districts(name)")
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw new Error("Could not load this shop");
    return { shop, origin: requestOrigin() };
  });
