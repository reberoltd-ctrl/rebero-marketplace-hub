import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { SearchView } from "@/components/site/SearchView";
import { RetryError } from "@/components/site/RetryError";
import { getCategoryPage } from "@/lib/public.functions";
import { pageHead, breadcrumbs, jsonLd } from "@/lib/seo";
import { validateSearchParams } from "@/lib/search-params";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: validateSearchParams,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const data = await getCategoryPage({ data: { slug: params.slug, filters: deps } });
    if (!data.category) throw notFound();
    return { ...data, category: data.category };
  },
  head: ({ loaderData, params }) => {
    const c = loaderData?.category;
    const path = `/category/${encodeURIComponent(params.slug)}`;
    if (!c) return pageHead("Category unavailable | REBERO Store", "This category is unavailable.", path, { noindex: true });
    return { ...pageHead(`${c.name} in Rwanda | New, Used & Refurbished | REBERO Store`, `Browse ${c.name.toLowerCase()} from local electronics sellers in Kigali, Rwanda. Compare new, used and refurbished devices, actual photos and prices in RWF.`, path), scripts: [jsonLd(breadcrumbs([{ name: "Home", path: "/" }, { name: c.name, path }]))] };
  },
  errorComponent: RetryError,
  notFoundComponent: () => <div className="container-page py-16"><h1 className="text-2xl font-bold">Category not found</h1><Link to="/search" className="mt-4 inline-block text-primary">Browse all products</Link></div>,
  component: CategoryPage,
});

function CategoryPage() {
  const { category, products } = Route.useLoaderData();
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/category/$slug" });
  return <><nav aria-label="Breadcrumb" className="container-page pt-6 text-sm text-muted-foreground"><Link to="/" className="hover:text-primary">Home</Link> / <span aria-current="page">{category.name}</span></nav><SearchView params={params} title={category.name} lockedCategoryId={category.id} initialProducts={products} onChange={(next) => void navigate({ search: next })} /></>;
}
