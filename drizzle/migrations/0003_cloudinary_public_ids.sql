ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS cloudinary_public_id text;
ALTER TABLE public.shop_spotlights ADD COLUMN IF NOT EXISTS cloudinary_public_id text;
COMMENT ON COLUMN public.product_images.storage_path IS 'DEPRECATED: photos now live in Cloudinary (see cloudinary_public_id)';
COMMENT ON COLUMN public.shop_spotlights.storage_path IS 'DEPRECATED: photos now live in Cloudinary (see cloudinary_public_id)';