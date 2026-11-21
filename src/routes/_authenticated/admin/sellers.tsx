import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["verification_status"];

export const Route = createFileRoute("/_authenticated/admin/sellers")({ component: Sellers });

const badge = { pending: "warning", approved: "success", rejected: "destructive", suspended: "muted", unverified: "muted" } as const;

function Sellers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status | "all">("pending");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-shops", tab],
    queryFn: async () => {
      let q = supabase.from("shops").select("*, district:districts(name), verification:seller_verifications(id_number, business_registration)").order("created_at", { ascending: false });
      if (tab !== "all") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = async (id: string, status: Status) => {
    let reason: string | null = null;
    if (status === "rejected" || status === "suspended") {
      reason = prompt(status === "rejected" ? "Reason for rejection (shown to the seller):" : "Reason for suspension:");
      if (!reason) return;
    }
    const { error } = await supabase.from("shops").update({ status, rejection_reason: reason }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(`Shop ${status}`);
    void qc.invalidateQueries({ queryKey: ["admin-shops"] });
    void qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Sellers</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Status | "all")} className="mt-4">
        <TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger><TabsTrigger value="suspended">Suspended</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
      </Tabs>
      <div className="mt-4 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No shops here.</p> : data.map((s) => {
          const v = Array.isArray(s.verification) ? s.verification[0] : s.verification;
          return (
            <div key={s.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-semibold">{s.name} <Badge variant={badge[s.status]} className="capitalize">{s.status}</Badge>{s.is_demo && <Badge variant="warning">Sample</Badge>}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.contact_name} · {s.phone} · {s.email}</div>
                  <div className="text-sm text-muted-foreground">{s.address}{s.district?.name ? `, ${s.district.name}` : ""} · {s.business_type === "registered_business" ? "Registered business" : "Individual"}</div>
                  {v && <div className="mt-1 text-xs text-muted-foreground">ID: {v.id_number ?? "—"} · Registration/TIN: {v.business_registration ?? "—"}</div>}
                  {s.description && <p className="mt-2 max-w-2xl text-sm">{s.description}</p>}
                  {s.rejection_reason && <p className="mt-1 text-xs text-destructive">Reason: {s.rejection_reason}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.status !== "approved" && <Button size="sm" onClick={() => setStatus(s.id, "approved")}>{s.status === "suspended" ? "Reactivate" : "Approve"}</Button>}
                  {s.status === "pending" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "rejected")}>Reject</Button>}
                  {s.status === "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "suspended")}>Suspend</Button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
