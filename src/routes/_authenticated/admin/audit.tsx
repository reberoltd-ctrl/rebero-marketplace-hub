import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({ component: Audit });

const LABEL: Record<string, string> = {
  role_granted: "Role granted", role_revoked: "Role removed", shop_applied: "Seller applied", shop_status_changed: "Shop status changed",
  product_status_changed: "Product status changed", setting_changed: "Setting changed", account_status_changed: "Account status changed",
  super_admin_bootstrapped: "Super Admin created",
};

function Audit() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div>
      <h1 className="text-2xl font-bold">Audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every approval, role change and settings change, newest first.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Item</th><th className="p-3">Details</th></tr></thead>
          <tbody className="divide-y">
            {isLoading ? <tr><td className="p-4 text-muted-foreground" colSpan={4}>Loading…</td></tr> : data.length === 0 ? <tr><td className="p-4 text-muted-foreground" colSpan={4}>No activity yet.</td></tr> : data.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB")}</td>
                <td className="p-3 font-medium">{LABEL[r.action] ?? r.action}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.entity_type} {r.entity_id?.slice(0, 8)}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
