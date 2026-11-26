import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProductGrid, ProductGridSkeleton } from "@/components/site/ProductCard";
import { categoriesQuery, districtsQuery, fetchProducts, type CardProduct } from "@/lib/catalog";
import { CONDITION_LABEL } from "@/lib/format";
import type { SearchParams, SortKey } from "@/lib/search-params";

type Props = {
  params: SearchParams;
  onChange: (next: SearchParams) => void;
  title: string;
  lockedCategoryId?: string;
  initialProducts?: CardProduct[];
};

export function SearchView({ params, onChange, title, lockedCategoryId, initialProducts }: Props) {
  const categoryId = lockedCategoryId ?? params.category;
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: districts = [] } = useQuery(districtsQuery);
  const { data: products, isLoading, isError } = useQuery({
    ...(initialProducts ? { initialData: initialProducts, staleTime: 30_000 } : {}),
    queryKey: ["search", { ...params, category: categoryId }],
    queryFn: () =>
      fetchProducts({
        q: params.q, category: categoryId, condition: params.condition, min: params.min, max: params.max,
        district: params.district, inStock: params.stock, featured: params.featured, sort: params.sort,
      }),
  });

  const set = (patch: Partial<SearchParams>) => onChange({ ...params, ...patch });
  const activeCount = [params.condition, params.min, params.max, params.district, params.stock, params.featured, lockedCategoryId ? undefined : params.category].filter((v) => v !== undefined).length;

  const filters = (
    <Filters params={params} set={set} categories={lockedCategoryId ? [] : categories} districts={districts} />
  );

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Searching…" : `${products?.length ?? 0} product${products?.length === 1 ? "" : "s"}`}
            {params.q ? ` for “${params.q}”` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden"><SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}</Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="px-4 pb-6">{filters}</div>
            </SheetContent>
          </Sheet>
          <Select value={params.sort ?? "relevance"} onValueChange={(v) => set({ sort: v === "relevance" ? undefined : (v as SortKey) })}>
            <SelectTrigger className="w-44" aria-label="Sort by"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="price_asc">Lowest price</SelectItem>
              <SelectItem value="price_desc">Highest price</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <div>
          {isLoading ? (
            <ProductGridSkeleton />
          ) : isError ? (
            <p className="rounded-xl border p-8 text-center text-sm text-destructive">Search failed. Please try again.</p>
          ) : (
            <ProductGrid
              products={products ?? []}
              empty={
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <p className="font-medium">No products match these filters.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try a different search or remove some filters.</p>
                  {activeCount > 0 && (
                    <Button variant="outline" className="mt-4" onClick={() => onChange({ q: params.q })}><X /> Clear filters</Button>
                  )}
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Filters({ params, set, categories, districts }: {
  params: SearchParams;
  set: (p: Partial<SearchParams>) => void;
  categories: { id: string; name: string }[];
  districts: { id: string; name: string }[];
}) {
  const [min, setMin] = useState(params.min?.toString() ?? "");
  const [max, setMax] = useState(params.max?.toString() ?? "");
  useEffect(() => { setMin(params.min?.toString() ?? ""); setMax(params.max?.toString() ?? ""); }, [params.min, params.max]);

  return (
    <div className="space-y-6 text-sm">
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={params.category ?? "all"} onValueChange={(v) => set({ category: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Condition</Label>
        <div className="flex flex-wrap gap-2">
          {(["new", "refurbished", "used"] as const).map((c) => (
            <Button key={c} type="button" size="sm" variant={params.condition === c ? "ink" : "outline"} onClick={() => set({ condition: params.condition === c ? undefined : c })}>
              {CONDITION_LABEL[c]}
            </Button>
          ))}
        </div>
      </div>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); set({ min: min ? Number(min) : undefined, max: max ? Number(max) : undefined }); }}>
        <Label>Price (RWF)</Label>
        <div className="flex gap-2">
          <Input inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} aria-label="Minimum price" />
          <Input inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} aria-label="Maximum price" />
        </div>
        <Button type="submit" size="sm" variant="outline" className="w-full">Apply price</Button>
      </form>
      <div className="space-y-2">
        <Label>District</Label>
        <Select value={params.district ?? "all"} onValueChange={(v) => set({ district: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All of Kigali</SelectItem>
            {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <Checkbox checked={!!params.stock} onCheckedChange={(v) => set({ stock: v ? true : undefined })} /> In stock only
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={!!params.featured} onCheckedChange={(v) => set({ featured: v ? true : undefined })} /> Featured only
        </label>
      </div>
    </div>
  );
}
