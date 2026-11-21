import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductForm, type ProductFormValues } from "@/components/seller/ProductForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/seller/products/$id")({
  head: () => ({ meta: [{ title: "Edit product — REBERO Seller" }, { name: "robots", content: "noindex" }] }),
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["edit-product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, images:product_images(id, url, storage_path, sort_order)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="container-page py-16 text-center"><h1 className="text-xl font-bold">Product not found</h1><Link to="/seller" className="text-primary">Back</Link></div>;

  const initial: ProductFormValues = {
    id: data.id, name: data.name, category_id: data.category_id, brand: data.brand ?? "", model: data.model ?? "",
    description: data.description ?? "", condition: data.condition, price_rwf: String(data.price_rwf),
    compare_at_price_rwf: data.compare_at_price_rwf ? String(data.compare_at_price_rwf) : "", stock: String(data.stock),
    warranty: data.warranty ?? "",
    specs: Object.entries((data.specs ?? {}) as Record<string, string>).map(([key, value]) => ({ key, value: String(value) })).concat([{ key: "", value: "" }]),
    images: [...data.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ id: i.id, url: i.url, storage_path: i.storage_path })),
  };
  return (
    <div className="container-page max-w-4xl py-8">
      <Link to="/seller" className="text-sm text-muted-foreground hover:text-foreground">← Seller dashboard</Link>
      <h1 className="mt-2 text-2xl font-bold">Edit product</h1>
      <p className="mt-1 text-sm text-muted-foreground">Saving changes sends the product back for review.</p>
      <div className="mt-6">
        <ProductForm shopId={data.shop_id} initial={initial} onSaved={() => { void qc.invalidateQueries({ queryKey: ["seller-products"] }); void navigate({ to: "/seller" }); }} />
      </div>
    </div>
  );
}
