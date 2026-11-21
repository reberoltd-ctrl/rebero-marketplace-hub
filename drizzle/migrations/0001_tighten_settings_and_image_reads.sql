DROP POLICY IF EXISTS "Anyone reads settings" ON public.platform_settings;
CREATE POLICY "Staff read settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
REVOKE SELECT ON public.platform_settings FROM anon;

DROP POLICY IF EXISTS "Anyone reads product images" ON public.product_images;
CREATE POLICY "Images visible with their product" ON public.product_images
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id));