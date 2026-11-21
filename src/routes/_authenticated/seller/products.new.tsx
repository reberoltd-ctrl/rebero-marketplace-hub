import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ProductForm, emptyProduct } from "@/components/seller/ProductForm";
import { useMyShop } from "@/lib/seller";

export const Route = createFileRoute("/_authenticated/seller/products/new")({
  head: () => ({ meta: [{ title: "Add a product — REBERO Seller" }, { name: "robots", content: "noindex" }] }),
  component: NewProduct,
});

function NewProduct() {
  const { data: shop, isLoading } = useMyShop();
  const navigate = useNavigate();
  const qc = useQueryClient();
  if (isLoading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!shop || shop.status !== "approved") {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-xl font-bold">Your shop must be approved first</h1>
        <Link to="/seller" className="mt-4 inline-block text-primary">Go to seller dashboard</Link>
      </div>
    );
  }
  return (
    <div className="container-page max-w-4xl py-8">
      <Link to="/seller" className="text-sm text-muted-foreground hover:text-foreground">← Seller dashboard</Link>
      <h1 className="mt-2 text-2xl font-bold">Add a product</h1>
      <p className="mt-1 text-sm text-muted-foreground">New products are reviewed by REBERO before they go live.</p>
      <div className="mt-6">
        <ProductForm shopId={shop.id} initial={emptyProduct} onSaved={() => { void qc.invalidateQueries({ queryKey: ["seller-products"] }); void navigate({ to: "/seller" }); }} />
      </div>
    </div>
  );
}
