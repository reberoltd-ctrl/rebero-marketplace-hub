import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cldUrl, uploadToCloudinary } from "@/lib/cloudinary";

type Field = "logo_url" | "cover_url";

export function ShopBranding({ shopId, name, logoUrl, coverUrl }: { shopId: string; name: string; logoUrl: string | null; coverUrl: string | null }) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{ field: Field; pct: number } | null>(null);

  const upload = async (field: Field, file: File | undefined) => {
    if (!file) return;
    setProgress({ field, pct: 0 });
    try {
      const res = await uploadToCloudinary(file, { folder: "rebero/shops", onProgress: (pct) => setProgress({ field, pct }) });
      const { error } = await supabase.from("shops").update({ [field]: res.secure_url }).eq("id", shopId);
      if (error) throw error;
      toast.success(field === "logo_url" ? "Profile photo updated" : "Banner updated");
      void qc.invalidateQueries({ queryKey: ["my-shop"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  const busy = (f: Field) => progress?.field === f;

  return (
    <section className="mb-8 overflow-hidden rounded-xl border bg-card">
      <div className="relative aspect-[4/1] min-h-28 bg-muted">
        {coverUrl && <img src={cldUrl(coverUrl, { width: 1400, aspectRatio: "4:1" })} alt="" className="size-full object-cover" />}
        <label className="absolute right-3 top-3">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!progress} onChange={(e) => void upload("cover_url", e.target.files?.[0])} />
          <Button asChild size="sm" variant="secondary"><span className="cursor-pointer"><ImagePlus /> {busy("cover_url") ? `Uploading ${progress?.pct}%` : "Change banner"}</span></Button>
        </label>
      </div>
      <div className="flex items-center gap-4 px-4 pb-4">
        <label className="relative -mt-10 cursor-pointer">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!progress} onChange={(e) => void upload("logo_url", e.target.files?.[0])} />
          <span className="grid size-20 place-items-center overflow-hidden rounded-2xl border-4 border-card bg-primary font-display text-2xl font-bold text-primary-foreground">
            {logoUrl ? <img src={cldUrl(logoUrl, { width: 160, aspectRatio: "1:1" })} alt={name} className="size-full object-cover" /> : name.slice(0, 1)}
          </span>
          <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-secondary text-secondary-foreground"><ImagePlus className="size-4" /></span>
        </label>
        <p className="pt-2 text-sm text-muted-foreground">{busy("logo_url") ? `Uploading profile photo ${progress?.pct}%…` : "Tap the photo or banner to change how your shop looks to buyers."}</p>
      </div>
    </section>
  );
}
