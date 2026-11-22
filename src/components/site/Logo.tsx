import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/rebero-logo.png.asset.json";

/** REBERO brand logo (white and gold artwork, designed for dark surfaces). */
export function Logo({ className }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link to="/" className={cn("flex shrink-0 items-center", className)} aria-label="REBERO home">
      <img src={logoAsset.url} alt="REBERO" width={640} height={141} className="h-7 w-auto md:h-9" />
    </Link>
  );
}
