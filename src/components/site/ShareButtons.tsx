import { Copy, Facebook, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function buildShareUrl(slug: string, origin: string, affiliateId?: string | null) {
  const url = new URL(`/product/${slug}`, origin);
  if (affiliateId) url.searchParams.set("ref", affiliateId);
  return url.toString();
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  );
}

export function ShareButtons({ slug, name, priceLabel, compact = false }: { slug: string; name: string; priceLabel: string; compact?: boolean }) {
  const { roles, user } = useAuth();
  const affiliateId = roles.includes("affiliate") ? user?.id : null;
  const getUrl = () => buildShareUrl(slug, window.location.origin, affiliateId);
  const text = `${name} — ${priceLabel} on REBERO`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      toast.success(affiliateId ? "Your affiliate link is copied" : "Product link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };
  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url: getUrl() });
      } catch {
        /* cancelled */
      }
    } else {
      void copy();
    }
  };

  if (compact) {
    return (
      <Button type="button" variant="ghost" size="icon" onClick={native} aria-label={`Share ${name}`}>
        <Share2 />
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" asChild>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
          onClick={(e) => { e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${getUrl()}`)}`; }}>
          <WhatsAppIcon /> WhatsApp
        </a>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <a href="https://www.facebook.com/sharer/sharer.php" target="_blank" rel="noopener noreferrer"
          onClick={(e) => { e.currentTarget.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`; }}>
          <Facebook /> Facebook
        </a>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Copy /> {affiliateId ? "Copy affiliate link" : "Copy link"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={native}>
        <Share2 /> More
      </Button>
    </div>
  );
}
