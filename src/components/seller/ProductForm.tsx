import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoriesQuery } from "@/lib/catalog";
import { CONDITION_LABEL, uniqueSlug, type ProductCondition } from "@/lib/format";

export type ProductFormValues = {
  id?: string;
  name: string;
  category_id: string | null;
  brand: string;
  model: string;
  description: string;
  condition: ProductCondition | "";
  price_rwf: string;
  compare_at_price_rwf: string;
  stock: string;
  warranty: string;
  specs: { key: string; value: string }[];
  images: { id?: string; url: string; storage_path: string | null }[];
};

export const emptyProduct: ProductFormValues = {
  name: "", category_id: null, brand: "", model: "", description: "", condition: "", price_rwf: "", compare_at_price_rwf: "",
  stock: "1", warranty: "", specs: [{ key: "", value: "" }], images: [],
};

const MAX_IMAGES = 8;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function ProductForm({ shopId, initial, onSaved }: { shopId: string; initial: ProductFormValues; onSaved: () => void }) {
  const { user } = useAuth();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [v, setV] = useState<ProductFormValues>(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const upload = async (files: FileList | null) => {
    if (!files || !user) return;
    const list = Array.from(files).slice(0, MAX_IMAGES - v.images.length);
    setUploading(true);
    const added: ProductFormValues["images"] = [];
    for (const f of list) {
      if (!ALLOWED.includes(f.type)) { toast.error(`${f.name}: use JPG, PNG or WebP`); continue; }
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} is larger than 5 MB`); continue; }
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type });
      if (error) { toast.error(`Could not upload ${f.name}`); continue; }
      added.push({ url: `/api/public/media/product-images/${path}`, storage_path: path });
    }
    setV((p) => ({ ...p, images: [...p.images, ...added] }));
    setUploading(false);
  };

  const removeImage = (idx: number) => {
    const img = v.images[idx];
    if (img?.id) setRemoved((r) => [...r, img.id!]);
    setV((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const price = Number(v.price_rwf);
    const compare = v.compare_at_price_rwf ? Number(v.compare_at_price_rwf) : null;
    const stock = Number(v.stock);
    if (!v.condition) return void toast.error("Choose the product condition.");
    if (!Number.isInteger(price) || price <= 0) return void toast.error("Enter a valid price in RWF.");
    if (compare != null && (!Number.isInteger(compare) || compare <= price)) return void toast.error("The previous price must be higher than the current price.");
    if (!Number.isInteger(stock) || stock < 0) return void toast.error("Enter a valid stock quantity.");
    if (!v.images.length) return void toast.error("Add at least one photo.");

    const specs: Record<string, string> = {};
    v.specs.forEach((s) => { if (s.key.trim() && s.value.trim()) specs[s.key.trim().slice(0, 60)] = s.value.trim().slice(0, 200); });
    const row = {
      name: v.name.trim(), category_id: v.category_id, brand: v.brand.trim() || null, model: v.model.trim() || null,
      description: v.description.trim() || null, condition: v.condition, price_rwf: price, compare_at_price_rwf: compare,
      stock, warranty: v.warranty.trim() || null, specs,
    };
    setSaving(true);
    let productId = v.id;
    if (productId) {
      const { error } = await supabase.from("products").update(row).eq("id", productId);
      if (error) { setSaving(false); return void toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("products").insert({ ...row, shop_id: shopId, slug: uniqueSlug(v.name) }).select("id").single();
      if (error || !data) { setSaving(false); return void toast.error(error?.message ?? "Could not save the product."); }
      productId = data.id;
    }
    if (removed.length) await supabase.from("product_images").delete().in("id", removed);
    const keep = v.images.filter((i) => i.id);
    for (const [idx, img] of keep.entries()) await supabase.from("product_images").update({ sort_order: idx }).eq("id", img.id!);
    const fresh = v.images.map((img, idx) => ({ img, idx })).filter((x) => !x.img.id);
    if (fresh.length) {
      const { error } = await supabase.from("product_images").insert(fresh.map(({ img, idx }) => ({ product_id: productId!, url: img.url, storage_path: img.storage_path, sort_order: idx })));
      if (error) { setSaving(false); return void toast.error("Product saved, but some photos could not be attached."); }
    }
    setSaving(false);
    toast.success(v.id ? "Changes saved" : "Product submitted");
    onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-bold">Photos</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {v.images.map((img, i) => (
            <div key={img.url} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
              <img src={img.url} alt="" className="size-full object-cover" />
              {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 text-[10px] text-ink-foreground">Cover</span>}
              <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-card shadow" aria-label="Remove photo"><X className="size-3.5" /></button>
            </div>
          ))}
          {v.images.length < MAX_IMAGES && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
              {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void upload(e.target.files)} disabled={uploading} />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Up to 8 real photos of the item (JPG, PNG or WebP, max 5 MB each). The first photo is used in link previews.</p>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <h2 className="font-bold md:col-span-2">Details</h2>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="pn">Product name</Label><Input id="pn" required minLength={3} maxLength={160} value={v.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={v.category_id ?? ""} onValueChange={(x) => set("category_id", x)}>
            <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Condition (required)</Label>
          <Select value={v.condition} onValueChange={(x) => set("condition", x as ProductCondition)}>
            <SelectTrigger><SelectValue placeholder="New, refurbished or used" /></SelectTrigger>
            <SelectContent>{(["new", "refurbished", "used"] as const).map((c) => <SelectItem key={c} value={c}>{CONDITION_LABEL[c]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label htmlFor="pb">Brand</Label><Input id="pb" maxLength={60} value={v.brand} onChange={(e) => set("brand", e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="pm">Model</Label><Input id="pm" maxLength={80} value={v.model} onChange={(e) => set("model", e.target.value)} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="pd">Description</Label><Textarea id="pd" rows={5} maxLength={4000} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the item honestly, including any wear or missing accessories." /></div>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-3">
        <h2 className="font-bold md:col-span-3">Price & stock</h2>
        <div className="space-y-2"><Label htmlFor="pp">Price (RWF)</Label><Input id="pp" inputMode="numeric" required value={v.price_rwf} onChange={(e) => set("price_rwf", e.target.value.replace(/\D/g, ""))} /></div>
        <div className="space-y-2"><Label htmlFor="pc">Previous price (optional)</Label><Input id="pc" inputMode="numeric" value={v.compare_at_price_rwf} onChange={(e) => set("compare_at_price_rwf", e.target.value.replace(/\D/g, ""))} placeholder="Only for a genuine discount" /></div>
        <div className="space-y-2"><Label htmlFor="ps">Stock quantity</Label><Input id="ps" inputMode="numeric" required value={v.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} /></div>
        <div className="space-y-2 md:col-span-3"><Label htmlFor="pw">Warranty (leave empty if none)</Label><Input id="pw" maxLength={200} value={v.warranty} onChange={(e) => set("warranty", e.target.value)} placeholder="e.g. 6 months shop warranty" /></div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-bold">Specifications</h2>
        {v.specs.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="e.g. Storage" value={s.key} onChange={(e) => set("specs", v.specs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
            <Input placeholder="e.g. 256 GB" value={s.value} onChange={(e) => set("specs", v.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => set("specs", v.specs.filter((_, j) => j !== i))} aria-label="Remove row"><Trash2 /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => set("specs", [...v.specs, { key: "", value: "" }])}><Plus /> Add specification</Button>
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={saving || uploading}>{saving ? "Saving…" : v.id ? "Save changes" : "Submit product"}</Button>
      </div>
    </form>
  );
}
