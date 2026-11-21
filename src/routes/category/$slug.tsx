import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchView } from "@/components/site/SearchView";
import { categoriesQuery } from "@/lib/catalog";
import { validateSearchParams } from "@/lib/search-params";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: validateSearchParams,
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — REBERO` },
        { name: "description", content: `Shop ${name.toLowerCase()} from Kigali electronics sellers on REBERO. New, refurbished and used, priced in RWF.` },
        { property: "og:title", content: `${name} on REBERO` },
        { property: "og:description", content: `New, refurbished and used ${name.toLowerCase()} from Kigali sellers.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/category/$slug" });
  const { data: categories, isLoading } = useQuery(categoriesQuery);
  const category = categories?.find((c) => c.slug === slug);

  if (isLoading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!category) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Category not found</h1>
        <Link to="/search" className="mt-4 inline-block text-primary">Browse all products</Link>
      </div>
    );
  }
  return <SearchView params={params} title={category.name} lockedCategoryId={category.id} onChange={(next) => void navigate({ search: next })} />;
}
