import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpotlightForm } from "@/components/spotlight/SpotlightForm";
import { supabase } from "@/integrations/supabase/client";
import { useMyShop } from "@/lib/seller";
import { SPOTLIGHT_STATUS_BADGE, SPOTLIGHT_STATUS_LABEL } from "@/lib/spotlight";

export const Route = createFileRoute("/_authenticated/seller/spotlight")({
  head: () => ({ meta: [{ title: "Homepage spotlight — REBERO Seller" }, { name: "robots", content: "noindex" }] }),
  component: SellerSpotlight,
});

function SellerSpotlight() {
  const { data: shop, isLoading } = useMyShop();
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["my-spotlights", shop?.id],
    enabled: !!shop,
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_spotlights").select("*").eq("shop_id", shop!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!shop || shop.status !== "approved") {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-xl font-bold">Your shop must be approved first</h1>
        <Link to="/seller" className="mt-4 inline-block text-primary">Go to seller dashboard</Link>
      </div>
    );
  }

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["my-spotlights"] });
    void qc.invalidateQueries({ queryKey: ["live-spotlights"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Withdraw this spotlight request?")) return;
    const { error } = await supabase.from("shop_spotlights").delete().eq("id", id);
    if (error) return void toast.error("Could not remove it.");
    toast.success("Removed");
    refresh();
  };

  return (
    <div className="container-page max-w-4xl py-8">
      <Link to="/seller" className="text-sm text-muted-foreground hover:text-foreground">← Seller dashboard</Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold"><Megaphone className="size-6 text-primary" /> Homepage spotlight</h1>
      <p className="mt-1 text-sm text-muted-foreground">Apply to show {shop.name} in the big slideshow at the top of the REBERO home page. The REBERO team reviews every request and chooses the dates.</p>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">New request</h2>
        <SpotlightForm submitLabel="Send for review" onSubmit={async (v) => {
          const { error } = await supabase.from("shop_spotlights").insert({ shop_id: shop.id, ...v, description: v.description || null });
          if (error) { toast.error(error.message); return false; }
          toast.success("Request sent. We'll review it soon.");
          refresh();
          return true;
        }} />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3 font-semibold">Your requests</div>
        {requests.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No requests yet.</p> : (
          <ul className="divide-y">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-4 p-4">
                <img src={r.image_url} alt="" className="aspect-[8/3] w-32 shrink-0 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.title}</div>
                  {r.status === "approved" && (r.starts_at || r.ends_at) && (
                    <div className="text-xs text-muted-foreground">
                      {r.starts_at ? `From ${new Date(r.starts_at).toLocaleDateString()}` : "Live now"}{r.ends_at ? ` until ${new Date(r.ends_at).toLocaleDateString()}` : ""}
                    </div>
                  )}
                  {r.status === "rejected" && r.rejection_reason && <div className="text-xs text-destructive">Reason: {r.rejection_reason}</div>}
                </div>
                <Badge variant={SPOTLIGHT_STATUS_BADGE[r.status]}>{SPOTLIGHT_STATUS_LABEL[r.status]}</Badge>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Remove request"><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
