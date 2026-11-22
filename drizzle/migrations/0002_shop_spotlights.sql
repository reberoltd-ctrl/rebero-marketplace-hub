CREATE TYPE public.spotlight_status AS ENUM ('pending', 'approved', 'rejected', 'ended');

CREATE TABLE public.shop_spotlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  storage_path text,
  status public.spotlight_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shop_spotlights_status_idx ON public.shop_spotlights (status, sort_order);
CREATE INDEX shop_spotlights_shop_idx ON public.shop_spotlights (shop_id);

GRANT SELECT ON public.shop_spotlights TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_spotlights TO authenticated;
GRANT ALL ON public.shop_spotlights TO service_role;
ALTER TABLE public.shop_spotlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public sees live spotlights; owners and staff see theirs" ON public.shop_spotlights
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'approved'
      AND public.shop_is_approved(shop_id)
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now()))
    OR public.owns_shop(shop_id, auth.uid())
    OR public.is_staff(auth.uid())
  );
CREATE POLICY "Approved sellers and staff request spotlights" ON public.shop_spotlights
  FOR INSERT TO authenticated
  WITH CHECK ((public.owns_shop(shop_id, auth.uid()) AND public.shop_is_approved(shop_id)) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners and staff update spotlights" ON public.shop_spotlights
  FOR UPDATE TO authenticated
  USING (public.owns_shop(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.owns_shop(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners and staff delete spotlights" ON public.shop_spotlights
  FOR DELETE TO authenticated
  USING (public.owns_shop(shop_id, auth.uid()) OR public.is_staff(auth.uid()));

-- Sellers can never approve or schedule their own spotlight; any seller edit goes back to review.
CREATE OR REPLACE FUNCTION public.shop_spotlights_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := auth.uid() IS NULL OR public.is_staff(auth.uid());
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.requested_by := COALESCE(auth.uid(), NEW.requested_by);
  END IF;
  IF staff THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.rejection_reason := NULL;
    NEW.starts_at := NULL;
    NEW.ends_at := NULL;
    NEW.sort_order := 0;
  ELSE
    NEW.shop_id := OLD.shop_id;
    NEW.requested_by := OLD.requested_by;
    NEW.starts_at := OLD.starts_at;
    NEW.ends_at := OLD.ends_at;
    NEW.sort_order := OLD.sort_order;
    IF OLD.status = 'ended' THEN
      NEW.status := 'ended';
      NEW.rejection_reason := OLD.rejection_reason;
    ELSE
      NEW.status := 'pending';
      NEW.rejection_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shop_spotlights_guard BEFORE INSERT OR UPDATE ON public.shop_spotlights
  FOR EACH ROW EXECUTE FUNCTION public.shop_spotlights_guard();

CREATE OR REPLACE FUNCTION public.shop_spotlights_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) THEN
    PERFORM public.write_audit('spotlight_status_changed', 'shop_spotlight', NEW.id::text,
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'reason', NEW.rejection_reason, 'shop_id', NEW.shop_id));
  ELSIF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) THEN
    PERFORM public.write_audit('spotlight_created', 'shop_spotlight', NEW.id::text,
      jsonb_build_object('status', NEW.status, 'shop_id', NEW.shop_id));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shop_spotlights_after AFTER INSERT OR UPDATE ON public.shop_spotlights
  FOR EACH ROW EXECUTE FUNCTION public.shop_spotlights_after();