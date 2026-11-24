import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BRAND_MEDIA, cldUrl } from "@/lib/cloudinary";

/** REBERO brand logo (white and gold artwork, designed for dark surfaces). */
export function Logo({ className }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link to="/" className={cn("flex shrink-0 items-center", className)} aria-label="REBERO home">
      <img src={cldUrl(BRAND_MEDIA.logo, { width: 360 })} srcSet={`${cldUrl(BRAND_MEDIA.logo, { width: 180 })} 1x, ${cldUrl(BRAND_MEDIA.logo, { width: 360 })} 2x`} alt="REBERO" width={640} height={141} className="h-7 w-auto md:h-9" />
    </Link>
  );
}
