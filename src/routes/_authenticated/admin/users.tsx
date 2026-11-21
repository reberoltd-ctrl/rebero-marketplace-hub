import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

type Role = Database["public"]["Enums"]["app_role"];
const ROLES: { role: Role; label: string }[] = [
  { role: "super_admin", label: "Super Admin" }, { role: "admin", label: "Admin / Staff" }, { role: "seller", label: "Seller" },
  { role: "affiliate", label: "Affiliate" }, { role: "customer", label: "Customer" },
];

export const Route = createFileRoute("/_authenticated/admin/users")({ component: Users });

function Users() {
  const qc = useQueryClient();
  const { isSuperAdmin, user: me } = useAuth();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _search: search.trim() });
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-users"] });

  const toggleRole = async (userId: string, role: Role, has: boolean) => {
    if (role === "super_admin" && !has && !confirm("Give this person full control of REBERO as Super Admin?")) return;
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return void toast.error(error.message);
    toast.success("Roles updated");
    refresh();
  };
  const setStatus = async (userId: string, status: "active" | "suspended" | "banned") => {
    if (status !== "active" && !confirm(`Mark this account as ${status}?`)) return;
    const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", userId);
    if (error) return void toast.error(error.message);
    toast.success(`Account ${status}`);
    refresh();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Users & roles</h1>
      <p className="mt-1 text-sm text-muted-foreground">{isSuperAdmin ? "Only you, as Super Admin, can change roles." : "Role changes are reserved for the Super Admin."}</p>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email, name or phone" className="mt-4 max-w-sm" />
      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">User</th><th className="p-3">Roles</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3">Last sign-in</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? <tr><td className="p-4 text-muted-foreground" colSpan={6}>Loading…</td></tr> : data.map((u) => (
              <tr key={u.id}>
                <td className="p-3"><div className="font-medium">{u.full_name || "—"}</div><div className="text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div></td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} variant={r === "super_admin" ? "ink" : "muted"}>{ROLES.find((x) => x.role === r)?.label ?? r}</Badge>)}</div></td>
                <td className="p-3"><Badge variant={u.account_status === "active" ? "success" : "destructive"} className="capitalize">{u.account_status}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("en-GB")}</td>
                <td className="p-3 text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("en-GB") : "Never"}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {isSuperAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="sm" variant="outline">Roles</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Assign roles</DropdownMenuLabel><DropdownMenuSeparator />
                          {ROLES.map((r) => {
                            const has = u.roles.includes(r.role);
                            return <DropdownMenuCheckboxItem key={r.role} checked={has} disabled={u.id === me?.id && r.role === "super_admin"} onCheckedChange={() => void toggleRole(u.id, r.role, has)}>{r.label}</DropdownMenuCheckboxItem>;
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {u.id !== me?.id && (u.account_status === "active"
                      ? <Button size="sm" variant="outline" onClick={() => void setStatus(u.id, "suspended")}>Suspend</Button>
                      : <Button size="sm" variant="outline" onClick={() => void setStatus(u.id, "active")}>Reactivate</Button>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
