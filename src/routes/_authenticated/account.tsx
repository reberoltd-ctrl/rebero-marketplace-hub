import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bell, Heart, KeyRound, Link2, Package, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isValidRwandaPhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My account — REBERO" }, { name: "robots", content: "noindex" }] }),
  component: Account,
});

const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", seller: "Seller", customer: "Customer", affiliate: "Affiliate" };

function Account() {
  const { user, profile, roles, refresh } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(profile?.full_name ?? ""); setPhone(profile?.phone ?? ""); }, [profile]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (phone && !isValidRwandaPhone(phone)) return void toast.error("Enter a valid Rwandan phone number.");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null, phone: phone.trim() || null }).eq("id", user.id);
    setBusy(false);
    if (error) return void toast.error("Could not save your profile.");
    await refresh();
    toast.success("Profile saved");
  };

  const tiles = [
    { to: "/wishlist" as const, icon: Heart, label: "Wishlist", note: "Products you saved" },
    { to: "/seller" as const, icon: Store, label: roles.includes("seller") ? "Seller dashboard" : "Become a seller", note: "Manage your shop" },
    { to: "/affiliate" as const, icon: Link2, label: "Affiliate programme", note: "Opening soon" },
    { to: "/change-password" as const, icon: KeyRound, label: "Account security", note: "Change your password" },
  ];

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold md:text-3xl">My account</h1>
      <div className="mt-2 flex flex-wrap gap-1">{roles.map((r) => <Badge key={r} variant="muted">{ROLE_LABEL[r] ?? r}</Badge>)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-6">
          <h2 className="font-bold">Profile</h2>
          <div className="space-y-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="space-y-2"><Label htmlFor="n">Full name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <div className="space-y-2"><Label htmlFor="ph">Phone</Label><Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0788 123 456" /></div>
          <Button type="submit" disabled={busy}>Save profile</Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiles.map((t) => (
            <Link key={t.label} to={t.to} className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-lift">
              <t.icon className="size-6 text-primary" />
              <div className="mt-3 font-semibold">{t.label}</div>
              <div className="text-sm text-muted-foreground">{t.note}</div>
            </Link>
          ))}
          <div className="rounded-xl border border-dashed p-5 text-muted-foreground">
            <Package className="size-6" />
            <div className="mt-3 font-semibold text-foreground">My orders</div>
            <div className="text-sm">Your orders and tracking will appear here once checkout opens.</div>
          </div>
          <div className="rounded-xl border border-dashed p-5 text-muted-foreground">
            <Bell className="size-6" />
            <div className="mt-3 font-semibold text-foreground">Notifications</div>
            <div className="text-sm">You have no notifications.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
