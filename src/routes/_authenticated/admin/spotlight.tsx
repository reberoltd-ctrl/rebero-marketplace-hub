import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotlightForm } from "@/components/spotlight/SpotlightForm";
import { cldUrl } from "@/lib/cloudinary";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SPOTLIGHT_STATUS_BADGE, SPOTLIGHT_STATUS_LABEL, toLocalInput, type SpotlightStatus } from "@/lib/spotlight";

export const Route = createFileRoute("/_authenticated/admin/spotlight")({ component: AdminSpotlight });

type SpotlightPatch = Database["public"]["Tables"]["shop_spotlights"]["Update"];

const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function AdminSpotlight() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<SpotlightStatus | "all">("pending");
  const [shopId, setShopId] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-spotlights", tab],
    queryFn: async () => {
      let q = supabase.from("shop_spotlights").select("*, shop:shops(name, slug, status)").order("sort_order").order("created_at", { ascending: false });
      if (tab !== "all") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-approved-shops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("id, name").eq("status", "approved").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-spotlights"] });
    void qc.invalidateQueries({ queryKey: ["live-spotlights"] });
  };

  const update = async (id: string, patch: SpotlightPatch, msg: string) => {
    const { error } = await supabase.from("shop_spotlights").update(patch).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(msg);
    refresh();
  };

  const reject = (id: string) => {
    const reason = prompt("Reason (shown to the seller):");
    if (reason) void update(id, { status: "rejected", rejection_reason: reason }, "Spotlight rejected");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this spotlight permanently?")) return;
    const { error } = await supabase.from("shop_spotlights").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Homepage spotlight</h1>
      <p className="mt-1 text-sm text-muted-foreground">Slides at the top of the home page. Each one links to its shop. Review shop requests or add one yourself.</p>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Add a spotlight</h2>
        <SpotlightForm submitLabel="Publish spotlight" onSubmit={async (v) => {
          if (!shopId) { toast.error("Choose the shop this slide links to."); return false; }
          const { error } = await supabase.from("shop_spotlights").insert({ shop_id: shopId, ...v, description: v.description || null, status: "approved" });
          if (error) { toast.error(error.message); return false; }
          toast.success("Spotlight published");
          setShopId("");
          refresh();
          return true;
        }}>
          <div className="space-y-2">
            <Label>Shop</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue placeholder="Choose an approved shop" /></SelectTrigger>
              <SelectContent>{shops.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </SpotlightForm>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SpotlightStatus | "all")} className="mt-8">
        <TabsList><TabsTrigger value="pending">Requests</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger><TabsTrigger value="ended">Ended</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
      </Tabs>
      <div className="mt-4 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here.</p> : data.map((s) => (
          <SpotlightRow key={s.id} s={s} onUpdate={update} onReject={reject} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}

type Row = {
  id: string; title: string; description: string | null; image_url: string; status: SpotlightStatus; rejection_reason: string | null;
  starts_at: string | null; ends_at: string | null; sort_order: number; shop: { name: string; slug: string; status: string } | null;
};

function SpotlightRow({ s, onUpdate, onReject, onRemove }: {
  s: Row;
  onUpdate: (id: string, patch: SpotlightPatch, msg: string) => Promise<void>;
  onReject: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [starts, setStarts] = useState(toLocalInput(s.starts_at));
  const [ends, setEnds] = useState(toLocalInput(s.ends_at));
  const [order, setOrder] = useState(String(s.sort_order));

  const schedule = () => {
    const st = fromLocal(starts), en = fromLocal(ends);
    if (st && en && en <= st) return void toast.error("The end date must be after the start date.");
    return { starts_at: st, ends_at: en, sort_order: Number.parseInt(order, 10) || 0 };
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <img src={cldUrl(s.image_url, { width: 512, aspectRatio: "8:3" })} alt="" loading="lazy" className="aspect-[8/3] w-full shrink-0 rounded-lg object-cover md:w-64" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-semibold">{s.title} <Badge variant={SPOTLIGHT_STATUS_BADGE[s.status]}>{SPOTLIGHT_STATUS_LABEL[s.status]}</Badge></div>
          <div className="text-sm text-muted-foreground">{s.shop?.name ?? "Unknown shop"}{s.shop && s.shop.status !== "approved" ? " · shop not approved, slide hidden" : ""}</div>
          {s.description && <p className="mt-1 text-sm">{s.description}</p>}
          {s.rejection_reason && <p className="mt-1 text-xs text-destructive">Reason: {s.rejection_reason}</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1"><Label className="text-xs">Starts (empty = now)</Label><Input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Ends (empty = no end)</Label><Input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Order (lower shows first)</Label><Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.status !== "approved" && <Button size="sm" onClick={() => { const p = schedule(); if (p) void onUpdate(s.id, { ...p, status: "approved", rejection_reason: null }, "Spotlight approved"); }}>Approve</Button>}
            {s.status === "approved" && <Button size="sm" variant="outline" onClick={() => { const p = schedule(); if (p) void onUpdate(s.id, p, "Schedule saved"); }}>Save schedule</Button>}
            {s.status === "pending" && <Button size="sm" variant="outline" onClick={() => onReject(s.id)}>Reject</Button>}
            {s.status === "approved" && <Button size="sm" variant="outline" onClick={() => void onUpdate(s.id, { status: "ended" }, "Spotlight ended")}>End now</Button>}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onRemove(s.id)}>Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
