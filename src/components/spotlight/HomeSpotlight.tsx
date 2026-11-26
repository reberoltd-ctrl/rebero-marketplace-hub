import type { getHomePage } from "@/lib/public.functions";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useAuth } from "@/lib/auth";
import { liveSpotlightsQuery } from "@/lib/spotlight";
import { cn } from "@/lib/utils";
import { BRAND_MEDIA, cldSrcSet, cldUrl } from "@/lib/cloudinary";

const SLIDE = "relative h-[340px] overflow-hidden bg-ink text-ink-foreground md:h-[440px]";

/** Homepage top slideshow of shop spotlights approved by REBERO admins. */
export function HomeSpotlight({ initialSlides }: { initialSlides?: Awaited<ReturnType<typeof getHomePage>>["slides"] }) {
  const { data: slides = [], isLoading } = useQuery({ ...liveSpotlightsQuery, ...(initialSlides ? { initialData: initialSlides } : {}) });
  const { user } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  useEffect(() => {
    if (!api || paused || slides.length < 2) return;
    const t = setInterval(() => api.scrollNext(), 6000);
    return () => clearInterval(t);
  }, [api, paused, slides.length]);

  if (isLoading) return <section className={cn(SLIDE, "animate-pulse")} aria-hidden="true" />;

  if (slides.length === 0) {
    return (
      <section className={SLIDE}>
        <img src={cldUrl(BRAND_MEDIA.hero, { width: 1600 })} srcSet={cldSrcSet(BRAND_MEDIA.hero, [640, 1024, 1600, 2400])} sizes="100vw" alt="" className="absolute inset-0 size-full object-cover object-right opacity-70" />
        <div className="absolute inset-0 hero-scrim" />
        <div className="container-page relative flex h-full flex-col justify-center">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Megaphone className="size-4" /> Homepage spotlight</span>
          <h2 className="mt-3 max-w-lg text-3xl font-extrabold md:text-4xl">Your shop could be featured here</h2>
          <p className="mt-3 max-w-md text-sm text-ink-muted">Approved sellers can apply to show their shop on the REBERO home page.</p>
          <Button asChild className="mt-6 w-fit"><Link to={user ? "/seller/spotlight" : "/sell"}>Promote your shop <ArrowRight /></Link></Button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-ink" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="Featured shops">
      <Carousel setApi={setApi} opts={{ loop: slides.length > 1 }}>
        <CarouselContent className="ml-0">
          {slides.map((s, i) => (
            <CarouselItem key={s.id} className="pl-0">
              <div className={SLIDE}>
                <img src={cldUrl(s.image_url, { width: 1600 })} srcSet={cldSrcSet(s.image_url, [640, 1024, 1600, 2400])} sizes="100vw" alt={s.title} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" />
                <div className="absolute inset-0 hero-scrim" />
                <div className="container-page relative flex h-full flex-col justify-center">
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Featured shop · {s.shop.name}</span>
                  <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight md:text-5xl">{s.title}</h2>
                  {s.description && <p className="mt-3 line-clamp-3 max-w-md text-sm text-ink-muted md:text-base">{s.description}</p>}
                  <Button asChild className="mt-6 w-fit"><Link to="/shop/$slug" params={{ slug: s.shop.slug }}>Visit shop <ArrowRight /></Link></Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-3 hidden border-ink-border bg-ink/60 text-ink-foreground md:inline-flex" />
            <CarouselNext className="right-3 hidden border-ink-border bg-ink/60 text-ink-foreground md:inline-flex" />
          </>
        )}
      </Carousel>
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {slides.map((s, i) => (
            <button key={s.id} type="button" onClick={() => api?.scrollTo(i)} aria-label={`Show slide ${i + 1}`}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-1.5 bg-ink-foreground/40")} />
          ))}
        </div>
      )}
    </section>
  );
}
