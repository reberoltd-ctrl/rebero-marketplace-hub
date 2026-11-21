import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { bpsToPercent, percentToBps } from "@/lib/commission";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Settings });

function Settings() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const { data } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("key, value");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
    },
  });
  const [seller, setSeller] = useState("");
  const [affiliate, setAffiliate] = useState("");
  const [days, setDays] = useState("");
  const [approval, setApproval] = useState(true);
  useEffect(() => {
    if (!data) return;
    setSeller(String(bpsToPercent(Number(data["seller_commission_bps"] ?? 200))));
    setAffiliate(String(bpsToPercent(Number(data["affiliate_commission_bps"] ?? 100))));
    setDays(String(data["affiliate_attribution_days"] ?? 30));
    setApproval(data["product_approval_required"] !== false);
  }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const s = percentToBps(Number(seller));
    const a = percentToBps(Number(affiliate));
    const d = Number(days);
    if (s == null || a == null) return void toast.error("Enter commission rates between 0 and 100%.");
    if (a > s) return void toast.error("The affiliate rate can't be higher than the seller commission.");
    if (!Number.isInteger(d) || d < 1 || d > 365) return void toast.error("Attribution window must be 1–365 days.");
    const rows = [
      { key: "seller_commission_bps", value: s }, { key: "affiliate_commission_bps", value: a },
      { key: "affiliate_attribution_days", value: d }, { key: "product_approval_required", value: approval },
    ];
    const { error } = await supabase.from("platform_settings").upsert(rows);
    if (error) return void toast.error(error.message);
    toast.success("Settings saved");
    void qc.invalidateQueries({ queryKey: ["platform-settings"] });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Platform settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">{isSuperAdmin ? "Changes apply to new orders only and are recorded in the audit log." : "Only the Super Admin can change these settings."}</p>
      <form onSubmit={save} className="mt-6 max-w-xl space-y-6 rounded-xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="sc">Seller commission (%)</Label><Input id="sc" inputMode="decimal" value={seller} onChange={(e) => setSeller(e.target.value)} disabled={!isSuperAdmin} /></div>
          <div className="space-y-2"><Label htmlFor="ac">Affiliate commission (%)</Label><Input id="ac" inputMode="decimal" value={affiliate} onChange={(e) => setAffiliate(e.target.value)} disabled={!isSuperAdmin} /></div>
        </div>
        <p className="text-xs text-muted-foreground">The affiliate share comes out of the seller commission. With the defaults (2% / 1%), REBERO keeps 1% on affiliate sales and 2% otherwise.</p>
        <div className="space-y-2"><Label htmlFor="ad">Affiliate attribution window (days)</Label><Input id="ad" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} disabled={!isSuperAdmin} className="max-w-32" /></div>
        <label className="flex items-center justify-between gap-4">
          <span><span className="block text-sm font-medium">Require approval for new products</span><span className="text-xs text-muted-foreground">When on, sellers' new and edited products wait for staff approval.</span></span>
          <Switch checked={approval} onCheckedChange={setApproval} disabled={!isSuperAdmin} />
        </label>
        {isSuperAdmin && <Button type="submit">Save settings</Button>}
      </form>
    </div>
  );
}
