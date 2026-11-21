import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SearchView } from "@/components/site/SearchView";
import { validateSearchParams } from "@/lib/search-params";

export const Route = createFileRoute("/search")({
  validateSearch: validateSearchParams,
  head: () => ({
    meta: [
      { title: "Search electronics — REBERO" },
      { name: "description", content: "Search phones, laptops, TVs and accessories from Kigali sellers. Filter by price, condition and district." },
      { property: "og:title", content: "Search electronics on REBERO" },
      { property: "og:description", content: "Find new, refurbished and used electronics across Kigali." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  return <SearchView params={params} title={params.q ? "Search results" : "All products"} onChange={(next) => void navigate({ search: next })} />;
}
