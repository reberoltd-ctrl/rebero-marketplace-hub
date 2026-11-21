import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Heart, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, ShoppingCart, Store, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/Logo";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cartCount, useCart } from "@/lib/cart";
import { categoriesQuery } from "@/lib/catalog";

export function Header() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile, isStaff, roles } = useAuth();
  const items = useCart();
  const count = cartCount(items);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const currentQ = useRouterState({ select: (s) => (s.location.search as { q?: string }).q ?? "" });
  const [q, setQ] = useState(currentQ);
  const [open, setOpen] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/search", search: { q: q.trim() || undefined } });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 bg-ink text-ink-foreground">
      <div className="container-page flex h-16 items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display">Browse REBERO</SheetTitle>
            </SheetHeader>
            <nav className="mt-2 flex flex-col gap-1 px-4 pb-6">
              {categories.map((c) => (
                <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted">
                  <CategoryIcon name={c.icon} className="size-4 text-muted-foreground" /> {c.name}
                </Link>
              ))}
              <div className="my-2 border-t" />
              <Link to="/sell" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm font-medium hover:bg-muted">Sell on REBERO</Link>
              <Link to="/affiliate" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm font-medium hover:bg-muted">Become an affiliate</Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Logo tone="light" />

        <form onSubmit={submit} className="relative mx-2 hidden flex-1 md:block" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search phones, laptops, brands, models…" aria-label="Search products"
            className="h-10 rounded-full border-0 bg-card pl-9 text-foreground" />
        </form>

        <div className="ml-auto flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground sm:inline-flex" aria-label="Language">
                <Globe />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Language</DropdownMenuLabel>
              <DropdownMenuItem>English ✓</DropdownMenuItem>
              <DropdownMenuItem disabled>Kinyarwanda (coming soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" asChild className="text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
            <Link to="/wishlist" aria-label="Wishlist"><Heart /></Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
            <Link to="/cart" aria-label={`Cart, ${count} items`}>
              <ShoppingCart />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
              )}
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground" aria-label="Account menu">
                  <User />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/account"><User /> My account</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/wishlist"><Heart /> Wishlist</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/seller"><Store /> {roles.includes("seller") ? "Seller dashboard" : "Sell on REBERO"}</Link></DropdownMenuItem>
                {isStaff && <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck /> Admin control center</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" asChild className="text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
              <Link to="/auth" aria-label="Sign in"><User /></Link>
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="container-page pb-3 md:hidden" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search electronics…" aria-label="Search products" className="h-10 rounded-full border-0 bg-card pl-9 text-foreground" />
        </div>
      </form>

      <nav className="hidden border-t border-ink-border md:block" aria-label="Categories">
        <div className="container-page flex h-11 items-center gap-5 overflow-x-auto text-sm text-ink-muted scrollbar-none">
          {categories.slice(0, 10).map((c) => (
            <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} className="whitespace-nowrap hover:text-ink-foreground" activeProps={{ className: "text-ink-foreground" }}>
              {c.name}
            </Link>
          ))}
          <Link to="/search" className="whitespace-nowrap hover:text-ink-foreground">All products</Link>
          <Link to="/sell" className="ml-auto flex items-center gap-1 whitespace-nowrap font-medium text-primary hover:text-primary-hover">
            <LayoutDashboard className="size-4" /> Sell on REBERO
          </Link>
        </div>
      </nav>
    </header>
  );
}
