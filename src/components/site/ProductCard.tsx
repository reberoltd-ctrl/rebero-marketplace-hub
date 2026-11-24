import type * as React from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/site/ShareButtons";
import { cart } from "@/lib/cart";
import { firstImage, type CardProduct } from "@/lib/catalog";
import { cldSrcSet, cldUrl } from "@/lib/cloudinary";
import { CONDITION_LABEL, discountPercent, formatRwf } from "@/lib/format";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

const conditionVariant = { new: "success", refurbished: "accent", used: "muted" } as const;

export function ProductCard({ product }: { product: CardProduct }) {
  const { ids, toggle } = useWishlist();
  const saved = ids.includes(product.id);
  const img = firstImage(product);
  const off = discountPercent(product.price_rwf, product.compare_at_price_rwf);

  const addToCart = () => {
    if (product.stock < 1) return;
    cart.add({
      productId: product.id, slug: product.slug, name: product.name, priceRwf: product.price_rwf, image: img,
      shopId: product.shop.id, shopName: product.shop.name, stock: product.stock,
    });
    toast.success("Added to cart");
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-shadow hover:shadow-lift">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden bg-muted">
        {img ? (
          <img src={cldUrl(img, { width: 480, aspectRatio: "1:1" })} srcSet={cldSrcSet(img, [240, 360, 480, 720], { aspectRatio: "1:1" })} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" alt={product.name} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid size-full place-items-center text-sm text-muted-foreground">No photo</div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.is_featured && <Badge variant="ink">Featured</Badge>}
          {off && <Badge>-{off}%</Badge>}
          {product.shop.is_demo && <Badge variant="warning">Sample</Badge>}
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <Button type="button" variant="outline" size="icon" className="size-8 rounded-full bg-card/90" aria-label={saved ? "Remove from wishlist" : "Save to wishlist"} onClick={() => toggle(product.id)}>
          <Heart className={cn(saved && "fill-primary text-primary")} />
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <Badge variant={conditionVariant[product.condition]}>{CONDITION_LABEL[product.condition]}</Badge>
          {product.stock < 1 && <span className="text-xs text-destructive">Out of stock</span>}
        </div>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">
          {product.name}
        </Link>
        <Link to="/shop/$slug" params={{ slug: product.shop.slug }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {product.shop.name}
          {product.shop.status === "approved" && !product.shop.is_demo && <BadgeCheck className="size-3.5 text-success" aria-label="Verified shop" />}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="font-display text-base font-bold">{formatRwf(product.price_rwf)}</div>
            {off && <div className="text-xs text-muted-foreground line-through">{formatRwf(product.compare_at_price_rwf)}</div>}
          </div>
          <div className="flex items-center">
            <ShareButtons slug={product.slug} name={product.name} priceLabel={formatRwf(product.price_rwf)} compact />
            <Button type="button" size="icon" onClick={addToCart} disabled={product.stock < 1} aria-label={`Add ${product.name} to cart`}>
              <ShoppingCart />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, empty }: { products: CardProduct[]; empty?: React.ReactNode }) {
  if (!products.length) return <>{empty ?? null}</>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-square animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
