import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display text-xl font-bold tracking-tight", className)} aria-label="REBERO home">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 20V4h6a4 4 0 0 1 0 8H7m6 0 4 8" />
        </svg>
      </span>
      <span className={tone === "light" ? "text-ink-foreground" : "text-foreground"}>REBERO</span>
    </Link>
  );
}
