/**
 * Cloudinary media helpers. Only the cloud name and the unsigned upload preset live here —
 * both are public by design. The API secret is never used in browser code.
 */
export const CLOUDINARY_CLOUD_NAME = "ifjvmqup";
export const CLOUDINARY_UPLOAD_PRESET = "rebero";

const DELIVERY_HOST = "res.cloudinary.com";

export type CloudinaryUpload = {
  secure_url: string;
  public_id: string;
  resource_type: "image" | "video" | "raw";
  width?: number;
  height?: number;
  bytes: number;
};

export type MediaKind = "image" | "video";

const LIMITS: Record<MediaKind, { types: string[]; maxBytes: number; label: string }> = {
  image: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024, label: "JPG, PNG or WebP photo up to 5 MB" },
  video: { types: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 50 * 1024 * 1024, label: "MP4, WebM or MOV video up to 50 MB" },
};

/** Returns an error message for a file that cannot be uploaded, or null when it is fine. */
export function validateMedia(file: { type: string; size: number }, kind: MediaKind = "image"): string | null {
  const rule = LIMITS[kind];
  if (!rule.types.includes(file.type)) return `Use a ${rule.label}.`;
  if (file.size > rule.maxBytes) return `The file is too large. Use a ${rule.label}.`;
  return null;
}

/** Uploads a file straight from the browser to Cloudinary (unsigned preset) and reports progress 0–100. */
export function uploadToCloudinary(
  file: File,
  opts: { folder: string; kind?: MediaKind; onProgress?: (percent: number) => void },
): Promise<CloudinaryUpload> {
  const kind = opts.kind ?? "image";
  const invalid = validateMedia(file, kind);
  if (invalid) return Promise.reject(new Error(invalid));
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    form.append("folder", opts.folder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: (Partial<CloudinaryUpload> & { error?: { message?: string } }) | null = null;
      try { body = JSON.parse(xhr.responseText); } catch { body = null; }
      if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url && body.public_id) {
        opts.onProgress?.(100);
        resolve(body as CloudinaryUpload);
      } else {
        reject(new Error(body?.error?.message ? `Upload failed: ${body.error.message}` : "Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your internet connection and try again."));
    xhr.send(form);
  });
}

export function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === DELIVERY_HOST && u.pathname.startsWith(`/${CLOUDINARY_CLOUD_NAME}/`);
  } catch {
    return false;
  }
}

export type DeliveryOptions = {
  /** Target width in CSS pixels. */
  width?: number;
  height?: number;
  /** Crop to this aspect ratio, e.g. "1:1" or "8:3" (implies fill). */
  aspectRatio?: string;
  /** fill = crop to exact box, limit = shrink only (default). */
  crop?: "fill" | "limit";
  /** Force a format (e.g. "jpg" for link previews); defaults to automatic. */
  format?: "auto" | "jpg" | "png";
};

/**
 * Adds automatic format, quality and sizing to a Cloudinary image or video URL.
 * Non-Cloudinary URLs are returned unchanged, so older links keep working.
 */
export function cldUrl(url: string, opts?: DeliveryOptions): string;
export function cldUrl(url: string | null | undefined, opts?: DeliveryOptions): string | null;
export function cldUrl(url: string | null | undefined, opts: DeliveryOptions = {}): string | null {
  if (!url) return null;
  if (!isCloudinaryUrl(url)) return url;
  const match = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.*)$/);
  if (!match) return url;
  const [, base, rest] = match as unknown as [string, string, string];
  const parts = [`f_${opts.format ?? "auto"}`, "q_auto"];
  if (opts.width) parts.push(`w_${Math.round(opts.width)}`);
  if (opts.height) parts.push(`h_${Math.round(opts.height)}`);
  if (opts.aspectRatio) parts.push(`ar_${opts.aspectRatio}`);
  if (opts.width || opts.height || opts.aspectRatio) parts.push(`c_${opts.aspectRatio ? "fill" : (opts.crop ?? "limit")}`);
  // Drop a transformation we added before so it is never applied twice.
  const cleanRest = rest.replace(/^f_[a-z]+,q_auto[^/]*\//, "");
  return `${base}${parts.join(",")}/${cleanRest}`;
}

/** Responsive srcset for a Cloudinary image (empty for other URLs). */
export function cldSrcSet(url: string | null | undefined, widths: number[], opts: Omit<DeliveryOptions, "width" | "height"> = {}): string | undefined {
  if (!url || !isCloudinaryUrl(url)) return undefined;
  return widths.map((w) => `${cldUrl(url, { ...opts, width: w })} ${w}w`).join(", ");
}

/** Brand artwork stored in Cloudinary. */
export const BRAND_MEDIA = {
  logo: "https://res.cloudinary.com/ifjvmqup/image/upload/v1795493661/rebero/brand/gg8vpjbuc1kd50mbyuxr.png",
  hero: "https://res.cloudinary.com/ifjvmqup/image/upload/v1795493662/rebero/brand/ht4kfteg5pjyyoxxse1d.jpg",
} as const;
