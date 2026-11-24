import { ImagePlus, Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cldUrl } from "@/lib/cloudinary";
import { uploadSpotlightImage } from "@/lib/spotlight";

export type SpotlightFormValues = { title: string; description: string; image_url: string; cloudinary_public_id: string | null };

/** Title, description and wide photo for a homepage spotlight. Extra fields (shop, dates) can be passed as children. */
export function SpotlightForm({ initial, submitLabel, onSubmit, children }: {
  initial?: Partial<SpotlightFormValues>;
  submitLabel: string;
  onSubmit: (v: SpotlightFormValues) => Promise<boolean>;
  children?: ReactNode;
}) {
  const [v, setV] = useState<SpotlightFormValues>({ title: "", description: "", image_url: "", cloudinary_public_id: null, ...initial });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const img = await uploadSpotlightImage(file, setProgress);
      setV((p) => ({ ...p, ...img }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload the photo.");
    }
    setUploading(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!v.image_url) return void toast.error("Add a photo for the slide.");
    if (v.title.trim().length < 3) return void toast.error("Add a short title.");
    setSaving(true);
    const ok = await onSubmit({ ...v, title: v.title.trim(), description: v.description.trim() });
    setSaving(false);
    if (ok && !initial) setV({ title: "", description: "", image_url: "", cloudinary_public_id: null });
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="space-y-2">
        <Label>Slide photo (wide, at least 1600 × 600 recommended)</Label>
        <label className="relative grid aspect-[8/3] cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed bg-muted text-sm text-muted-foreground hover:border-primary">
          {v.image_url ? <img src={cldUrl(v.image_url, { width: 960 })} alt="" className="absolute inset-0 size-full object-cover" /> : (
            !uploading && <span className="flex flex-col items-center gap-2"><ImagePlus className="size-6" />Choose a JPG, PNG or WebP photo (max 5 MB)</span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-foreground">
              <Loader2 className="size-6 animate-spin" />Uploading… {progress}%
              <span className="h-1.5 w-40 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></span>
            </span>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {v.image_url && <p className="text-xs text-muted-foreground">Click the photo to replace it.</p>}
      </div>
      {children}
      <div className="space-y-2"><Label htmlFor="sp-title">Title</Label><Input id="sp-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={80} required placeholder="e.g. New iPhones in stock in Nyarugenge" /></div>
      <div className="space-y-2"><Label htmlFor="sp-desc">Description</Label><Textarea id="sp-desc" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={240} rows={3} placeholder="One or two sentences about your shop or offer." /></div>
      <Button type="submit" disabled={saving || uploading} className="w-fit">{saving ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
