import type { Database } from "@/integrations/supabase/types";

export type ProductCondition = Database["public"]["Enums"]["product_condition"];

const rwf = new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 });

/** Formats a whole-franc integer amount as "RWF 520,000". */
export function formatRwf(amount: number | null | undefined): string {
  if (amount == null) return "";
  return `RWF ${rwf.format(Math.round(amount))}`;
}

export const CONDITION_LABEL: Record<ProductCondition, string> = {
  new: "New",
  refurbished: "Refurbished",
  used: "Used",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function uniqueSlug(input: string): string {
  return `${slugify(input) || "item"}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Discount percentage only when a genuine previous price exists. */
export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Rwanda mobile numbers: +2507XXXXXXXX or 07XXXXXXXX (MTN 78/79, Airtel 72/73). */
export function isValidRwandaPhone(value: string): boolean {
  const v = value.replace(/[\s-]/g, "");
  return /^(\+?250|0)7[2389]\d{7}$/.test(v);
}

export function absoluteUrl(url: string, origin: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${origin.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}
