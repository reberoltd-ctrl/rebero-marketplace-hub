import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CONDITION_LABEL, formatRwf } from "@/lib/format";

type Status = Database["public"]["Enums"]["product_status"];

export const Route = createFileRoute("/_authenticated/admin/products")({ component: Products });

const badge = { pending: "warning", approved: "success", rejected: "destructive", removed: "muted" } as const;

function Products() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status | "all">("pending");
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-products", tab, q],
    queryFn: async () => {
      let query = supabase.from("products").select("id, slug, name, brand, condition, price_rwf, stock, status, is_featured, rejection_reason, created_at, shop:shops(name, is_demo), category:categories(name), images:product_images(url, sort_order)").order("created_at", { ascending: false }).limit(100);
      if (tab !== "all") query = query.eq("status", tab);
      if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%,]/g, " ")}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = async (id: string, patch: Database["public"]["Tables"]["products"]["Update"], msg: string) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(msg);
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
    void qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };
  const reject = (id: string, status: "rejected" | "removed") => {
    const reason = prompt(status === "rejected" ? "Reason for rejection (shown to the seller):" : "Reason for removal:");
    if (reason) void update(id, { status, rejection_reason: reason }, status === "rejected" ? "Product rejected" : "Listing removed");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Status | "all")}>
          <TabsList><TabsTrigger value="pending">Awaiting approval</TabsTrigger><TabsTrigger value="approved">Live</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger><TabsTrigger value="removed">Removed</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
        </Tabs>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="max-w-xs" />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No products here.</p> : (
          <ul className="divide-y">
            {data.map((p) => {
              const img = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">{img && <img src={img} alt="" className="size-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {p.status === "approved" ? <Link to="/product/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.name}</Link> : p.name}
                      <Badge variant={badge[p.status]} className="capitalize">{p.status}</Badge>
                      {p.is_featured && <Badge variant="ink">Featured</Badge>}
                      {p.shop?.is_demo && <Badge variant="warning">Sample</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.shop?.name} · {p.category?.name ?? "No category"} · {CONDITION_LABEL[p.condition]} · {formatRwf(p.price_rwf)} · stock {p.stock}</div>
                    {p.rejection_reason && <div className="text-xs text-destructive">Reason: {p.rejection_reason}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.status !== "approved" && <Button size="sm" onClick={() => update(p.id, { status: "approved", rejection_reason: null }, "Product approved")}>Approve</Button>}
                    {p.status === "pending" && <Button size="sm" variant="outline" onClick={() => reject(p.id, "rejected")}>Reject</Button>}
                    {p.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => update(p.id, { is_featured: !p.is_featured }, p.is_featured ? "Removed from featured" : "Featured")}>
                        <Star className={p.is_featured ? "fill-primary text-primary" : ""} /> {p.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                    )}
                    {p.status === "approved" && <Button size="sm" variant="outline" onClick={() => reject(p.id, "removed")}>Remove</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
