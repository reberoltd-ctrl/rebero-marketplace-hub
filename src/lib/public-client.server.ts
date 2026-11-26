import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Session-free public reads only; every query remains subject to anonymous row security. */
export function publicClient() {
  const url = process.env["SUPABASE_URL"] || (import.meta.env["VITE_SUPABASE_URL"] as string);
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string);
  if (!url || !key) throw new Error("Public catalogue configuration unavailable");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}