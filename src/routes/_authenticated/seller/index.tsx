import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Eye, Package, PackageCheck, Pencil, Plus, Store, Trash2, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { districtsQuery } from "@/lib/catalog";
import { CONDITION_LABEL, formatRwf, isValidRwandaPhone, uniqueSlug } from "@/lib/format";
import { useMyShop } from "@/lib/seller";

export const Route = createFileRoute("/_authenticated/seller/")({
  head: () => ({ meta: [{ title: "Seller dashboard — REBERO" }, { name: "robots", content: "noindex" }] }),
  component: SellerHome,
});

function SellerHome() {
  const { data: shop, isLoading } = useMyShop();
  if (isLoading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading your shop…</div>;
  if (!shop) return <ApplyForm />;
  if (shop.status !== "approved") return <ApplicationStatus shop={shop} />;
  return <Dashboard shopId={shop.id} shopName={shop.name} shopSlug={shop.slug} />;
}

function ApplyForm({ resubmit }: { resubmit?: { id: string } }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { data: districts = [] } = useQuery(districtsQuery);
  const [district, setDistrict] = useState<string>("");
  const [type, setType] = useState<"individual" | "registered_business">("individual");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone")).trim();
    if (!isValidRwandaPhone(phone)) return void toast.error("Enter a valid Rwandan phone number, e.g. 0788 123 456.");
    if (!district) return void toast.error("Choose your district.");
    const name = String(fd.get("name")).trim();
    setBusy(true);
    const row = {
      name, description: String(fd.get("description")).trim() || null, address: String(fd.get("address")).trim(),
      district_id: district, business_type: type, contact_name: String(fd.get("contact_name")).trim(), phone,
      email: String(fd.get("email")).trim() || user.email || null,
    };
    let shopId = resubmit?.id;
    if (shopId) {
      const { error } = await supabase.from("shops").update(row).eq("id", shopId);
      if (error) { setBusy(false); return void toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("shops").insert({ ...row, owner_id: user.id, slug: uniqueSlug(name) }).select("id").single();
      if (error || !data) { setBusy(false); return void toast.error(error?.message ?? "Could not submit your application."); }
      shopId = data.id;
    }
    const idNumber = String(fd.get("id_number")).trim();
    const reg = String(fd.get("business_registration")).trim();
    if (idNumber || reg) {
      await supabase.from("seller_verifications").upsert({ shop_id: shopId!, owner_id: user.id, id_type: "national_id", id_number: idNumber || null, business_registration: reg || null });
    }
    setBusy(false);
    toast.success("Application submitted");
    void qc.invalidateQueries({ queryKey: ["my-shop"] });
  };

  return (
    <div className="container-page max-w-3xl py-10">
      <Store className="size-8 text-primary" />
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">{resubmit ? "Update your application" : "Apply to sell on REBERO"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Free to apply. The REBERO team reviews every seller; you can list products once approved.</p>
      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="cn">Your full name</Label><Input id="cn" name="contact_name" required defaultValue={profile?.full_name ?? ""} maxLength={80} /></div>
        <div className="space-y-2"><Label htmlFor="ph">Phone number</Label><Input id="ph" name="phone" required defaultValue={profile?.phone ?? ""} placeholder="0788 123 456" /></div>
        <div className="space-y-2"><Label htmlFor="em">Email</Label><Input id="em" name="email" type="email" defaultValue={user?.email ?? ""} /></div>
        <div className="space-y-2">
          <Label>Seller type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="individual">Individual seller</SelectItem><SelectItem value="registered_business">Registered business</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="sn">Shop name</Label><Input id="sn" name="name" required minLength={2} maxLength={80} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="sd">Shop description</Label><Textarea id="sd" name="description" rows={3} maxLength={1000} placeholder="What do you sell? Do you offer warranties or repairs?" /></div>
        <div className="space-y-2"><Label htmlFor="ad">Shop address</Label><Input id="ad" name="address" required maxLength={200} placeholder="Street, building, sector" /></div>
        <div className="space-y-2">
          <Label>District</Label>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger><SelectValue placeholder="Choose district" /></SelectTrigger>
            <SelectContent>{districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label htmlFor="id">National ID number (for verification)</Label><Input id="id" name="id_number" maxLength={30} /></div>
        <div className="space-y-2"><Label htmlFor="rg">Business registration / TIN (if registered)</Label><Input id="rg" name="business_registration" maxLength={40} /></div>
        <p className="text-xs text-muted-foreground md:col-span-2">Verification details are only visible to you and REBERO staff.</p>
        <div className="md:col-span-2"><Button type="submit" size="lg" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</Button></div>
      </form>
    </div>
  );
}

function ApplicationStatus({ shop }: { shop: { id: string; name: string; status: string; rejection_reason: string | null } }) {
  if (shop.status === "rejected") {
    return (
      <div>
        <div className="container-page max-w-3xl pt-10">
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <p className="flex items-center gap-2 font-semibold text-destructive"><XCircle className="size-5" /> Your application was not approved</p>
            {shop.rejection_reason && <p className="mt-2 text-sm">Reason: {shop.rejection_reason}</p>}
            <p className="mt-1 text-sm text-muted-foreground">Update your details below and resubmit.</p>
          </div>
        </div>
        <ApplyForm resubmit={{ id: shop.id }} />
      </div>
    );
  }
  return (
    <div className="container-page grid min-h-[50vh] max-w-xl place-items-center py-16 text-center">
      <div>
        <Clock className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{shop.status === "suspended" ? "Your shop is suspended" : "Application under review"}</h1>
        <p className="mt-2 text-muted-foreground">
          {shop.status === "suspended"
            ? "Your products are hidden from buyers. Please contact REBERO support."
            : `Thanks for applying with “${shop.name}”. You'll be able to list products as soon as the REBERO team approves your shop.`}
        </p>
      </div>
    </div>
  );
}

const statusBadge = { pending: "warning", approved: "success", rejected: "destructive", removed: "muted" } as const;

function Dashboard({ shopId, shopName, shopSlug }: { shopId: string; shopName: string; shopSlug: string }) {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["seller-products", shopId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id, slug, name, condition, price_rwf, stock, status, rejection_reason, view_count, created_at, images:product_images(url, sort_order)")
        .eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete “${name}”? This can't be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return void toast.error("Could not delete this product.");
    toast.success("Product deleted");
    void qc.invalidateQueries({ queryKey: ["seller-products", shopId] });
  };

  const stats = [
    { label: "Products", value: products.length, icon: Package },
    { label: "Live", value: products.filter((p) => p.status === "approved").length, icon: PackageCheck },
    { label: "Awaiting approval", value: products.filter((p) => p.status === "pending").length, icon: Clock },
    { label: "Product views", value: products.reduce((n, p) => n + p.view_count, 0), icon: Eye },
  ];

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Seller dashboard</p>
          <h1 className="text-2xl font-bold md:text-3xl">{shopName}</h1>
          <Link to="/shop/$slug" params={{ slug: shopSlug }} className="text-sm text-primary hover:underline">View public shop page</Link>
        </div>
        <Button asChild><Link to="/seller/products/new"><Plus /> Add product</Link></Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <s.icon className="size-5 text-muted-foreground" />
            <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Sales, orders, commission deductions (2%) and settlements will appear here once checkout and payments go live.</p>

      <div className="mt-8 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3 font-semibold">Your products</div>
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No products yet</p>
            <Button asChild className="mt-4"><Link to="/seller/products/new"><Plus /> Add your first product</Link></Button>
          </div>
        ) : (
          <ul className="divide-y">
            {products.map((p) => {
              const img = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
              return (
                <li key={p.id} className="flex items-center gap-4 p-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">{img && <img src={img} alt="" className="size-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{CONDITION_LABEL[p.condition]} · {formatRwf(p.price_rwf)} · {p.stock} in stock</div>
                    {p.status === "rejected" && p.rejection_reason && <div className="mt-1 text-xs text-destructive">Rejected: {p.rejection_reason}</div>}
                  </div>
                  <Badge variant={statusBadge[p.status]} className="capitalize">{p.status === "pending" ? "Awaiting approval" : p.status}</Badge>
                  <Button variant="ghost" size="icon" asChild><Link to="/seller/products/$id" params={{ id: p.id }} aria-label={`Edit ${p.name}`}><Pencil /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(p.id, p.name)} aria-label={`Delete ${p.name}`}><Trash2 /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
