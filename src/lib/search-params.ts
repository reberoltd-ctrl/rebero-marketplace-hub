import type { ProductCondition } from "@/lib/format";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "newest" | "popular";

export type SearchParams = {
  q?: string | undefined;
  category?: string | undefined;
  condition?: ProductCondition | undefined;
  min?: number | undefined;
  max?: number | undefined;
  district?: string | undefined;
  sort?: SortKey | undefined;
  stock?: boolean | undefined;
  featured?: boolean | undefined;
};

const CONDITIONS = ["new", "refurbished", "used"] as const;
const SORTS = ["relevance", "price_asc", "price_desc", "newest", "popular"] as const;

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export function validateSearchParams(raw: Record<string, unknown>): SearchParams {
  const out: SearchParams = {};
  if (typeof raw["q"] === "string" && raw["q"].trim()) out.q = raw["q"].slice(0, 100);
  if (typeof raw["category"] === "string" && raw["category"]) out.category = raw["category"];
  if (typeof raw["district"] === "string" && raw["district"]) out.district = raw["district"];
  const c = raw["condition"];
  if (typeof c === "string" && (CONDITIONS as readonly string[]).includes(c)) out.condition = c as ProductCondition;
  const s = raw["sort"];
  if (typeof s === "string" && (SORTS as readonly string[]).includes(s)) out.sort = s as SortKey;
  const min = num(raw["min"]);
  const max = num(raw["max"]);
  if (min != null) out.min = min;
  if (max != null) out.max = max;
  if (raw["stock"] === true || raw["stock"] === "true") out.stock = true;
  if (raw["featured"] === true || raw["featured"] === "true") out.featured = true;
  return out;
}
