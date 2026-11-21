import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductGrid, ProductGridSkeleton } from "@/components/site/ProductCard";
import { fetchProducts } from "@/lib/catalog";
import { useWishlist } from "@/lib/wishlist";

export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({ meta: [{ title: "My wishlist — REBERO" }, { name: "robots", content: "noindex" }] }),
  component: Wishlist,
});

function Wishlist() {
  const { ids } = useWishlist();
  const { data, isLoading } = useQuery({ queryKey: ["wishlist-products", ids], queryFn: () => fetchProducts({ ids, limit: 100 }) });
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold md:text-3xl">My wishlist</h1>
      <div className="mt-6">
        {isLoading ? <ProductGridSkeleton count={4} /> : (
          <ProductGrid products={data ?? []} empty={
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">Nothing saved yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any product to save it here.</p>
              <Button asChild className="mt-4"><Link to="/search">Browse products</Link></Button>
            </div>
          } />
        )}
      </div>
    </div>
  );
}
