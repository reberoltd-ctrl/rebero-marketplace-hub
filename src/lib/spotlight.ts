import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { uploadToCloudinary } from "@/lib/cloudinary";

export type SpotlightStatus = Database["public"]["Enums"]["spotlight_status"];

export const SPOTLIGHT_STATUS_LABEL: Record<SpotlightStatus, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Not approved",
  ended: "Ended",
};

export const SPOTLIGHT_STATUS_BADGE = { pending: "warning", approved: "success", rejected: "destructive", ended: "muted" } as const;

/** Live homepage spotlights (row security only returns approved, in-date spotlights of approved shops to the public). */
export const liveSpotlightsQuery = queryOptions({
  queryKey: ["live-spotlights"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("shop_spotlights")
      .select("id, title, description, image_url, sort_order, starts_at, ends_at, shop:shops!inner(name, slug, status)")
      .eq("status", "approved")
      .eq("shop.status", "approved")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    // Staff and owners can read every row, so apply the schedule here too.
    const now = Date.now();
    return (data ?? [])
      .filter((s) => (!s.starts_at || Date.parse(s.starts_at) <= now) && (!s.ends_at || Date.parse(s.ends_at) > now))
      .slice(0, 10);
  },
  staleTime: 60_000,
});

/** Uploads a spotlight photo straight to Cloudinary and returns its link and Cloudinary ID. */
export async function uploadSpotlightImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ image_url: string; cloudinary_public_id: string }> {
  const res = await uploadToCloudinary(file, { folder: "rebero/spotlights", ...(onProgress ? { onProgress } : {}) });
  return { image_url: res.secure_url, cloudinary_public_id: res.public_id };
}

/** Converts a stored timestamp to the value a datetime-local input expects (local time). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
