
-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','seller','customer','affiliate');
CREATE TYPE public.product_condition AS ENUM ('new','refurbished','used');
CREATE TYPE public.verification_status AS ENUM ('unverified','pending','approved','rejected','suspended');
CREATE TYPE public.product_status AS ENUM ('pending','approved','rejected','removed');

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended','banned')),
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'))
$$;

-- ===== Audit log =====
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _entity_type text, _entity_id text, _details jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_details, '{}'::jsonb));
$$;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Profile policies
CREATE POLICY "Users read own profile, staff read all" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile, staff update all" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    NEW.account_status := OLD.account_status;
    IF NEW.must_change_password AND NOT OLD.must_change_password THEN
      NEW.must_change_password := false;
    END IF;
  END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    PERFORM public.write_audit('account_status_changed', 'user', NEW.id::text,
      jsonb_build_object('from', OLD.account_status, 'to', NEW.account_status));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

-- Role policies: only super admin assigns/removes roles
CREATE POLICY "Users read own roles, staff read all" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Super admin assigns roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin removes roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.user_roles_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit('role_granted', 'user', NEW.user_id::text, jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSE
    IF OLD.role = 'super_admin' AND (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
      RAISE EXCEPTION 'The last Super Admin cannot be removed';
    END IF;
    PERFORM public.write_audit('role_revoked', 'user', OLD.user_id::text, jsonb_build_object('role', OLD.role));
    RETURN OLD;
  END IF;
END $$;
CREATE TRIGGER user_roles_audit_ins AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.user_roles_audit();
CREATE TRIGGER user_roles_audit_del BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.user_roles_audit();

-- New user: profile + customer role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Districts =====
CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  province text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.districts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.districts TO authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads districts" ON public.districts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage districts" ON public.districts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
INSERT INTO public.districts (name, province, sort_order) VALUES
  ('Gasabo','Kigali City',1),('Kicukiro','Kigali City',2),('Nyarugenge','Kigali City',3);

-- ===== Categories =====
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active categories" ON public.categories FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Smartphones','smartphones','Smartphone',1),
  ('Laptops & Computers','laptops-computers','Laptop',2),
  ('Tablets','tablets','Tablet',3),
  ('TVs & Displays','tvs-displays','Tv',4),
  ('Cameras & Photography','cameras','Camera',5),
  ('Audio Equipment','audio','Radio',6),
  ('Headphones & Speakers','headphones-speakers','Headphones',7),
  ('Gaming','gaming','Gamepad2',8),
  ('Smartwatches & Wearables','wearables','Watch',9),
  ('Networking','networking','Router',10),
  ('Printers & Office','printers-office','Printer',11),
  ('Computer Accessories','computer-accessories','Mouse',12),
  ('Phone Accessories','phone-accessories','Cable',13),
  ('Power Banks & Charging','power-charging','BatteryCharging',14),
  ('Home Electronics','home-electronics','Lamp',15),
  ('Spare Parts','spare-parts','Cpu',16),
  ('Other Electronics','other','Package',17);

-- ===== Platform settings =====
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin writes settings" ON public.platform_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin updates settings" ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.platform_settings_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  PERFORM public.write_audit('setting_changed', 'setting', NEW.key,
    jsonb_build_object('from', CASE WHEN TG_OP = 'UPDATE' THEN OLD.value ELSE NULL END, 'to', NEW.value));
  RETURN NEW;
END $$;
CREATE TRIGGER platform_settings_audit BEFORE INSERT OR UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.platform_settings_audit();

INSERT INTO public.platform_settings (key, value) VALUES
  ('seller_commission_bps', '200'),
  ('affiliate_commission_bps', '100'),
  ('product_approval_required', 'true'),
  ('affiliate_attribution_days', '30'),
  ('site', '{"name":"REBERO","tagline":"Your Technology. Your Marketplace."}');

CREATE OR REPLACE FUNCTION public.setting_bool(_key text, _default boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (value)::text::boolean FROM public.platform_settings WHERE key = _key), _default)
$$;

-- ===== Shops =====
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  slug text NOT NULL UNIQUE,
  description text,
  address text,
  district_id uuid REFERENCES public.districts(id),
  business_type text NOT NULL DEFAULT 'individual' CHECK (business_type IN ('individual','registered_business')),
  contact_name text,
  phone text,
  email text,
  logo_url text,
  cover_url text,
  status public.verification_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  is_demo boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shops_status_idx ON public.shops (status);
GRANT SELECT ON public.shops TO anon, authenticated;
GRANT INSERT, UPDATE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public sees approved shops; owners and staff see theirs" ON public.shops FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Signed-in users apply for a shop" ON public.shops FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners and staff update shops" ON public.shops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.seller_verifications (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  id_type text,
  id_number text,
  business_registration text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_verifications TO authenticated;
GRANT ALL ON public.seller_verifications TO service_role;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and staff read verification" ON public.seller_verifications FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Owner adds verification" ON public.seller_verifications FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owner and staff update verification" ON public.seller_verifications FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.shops_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := auth.uid() IS NULL OR public.is_staff(auth.uid());
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF NOT staff THEN
      NEW.owner_id := auth.uid();
      NEW.status := 'pending';
      NEW.is_demo := false;
      NEW.rejection_reason := NULL;
      NEW.approved_at := NULL;
    END IF;
  ELSE
    IF NOT staff THEN
      NEW.owner_id := OLD.owner_id;
      NEW.is_demo := OLD.is_demo;
      NEW.approved_at := OLD.approved_at;
      NEW.rejection_reason := OLD.rejection_reason;
      -- A rejected seller may resubmit; otherwise status is staff-only
      IF OLD.status = 'rejected' THEN NEW.status := 'pending'; NEW.rejection_reason := NULL;
      ELSE NEW.status := OLD.status; END IF;
    END IF;
    IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
      NEW.approved_at := now();
      NEW.rejection_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shops_guard BEFORE INSERT OR UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.shops_guard();

CREATE OR REPLACE FUNCTION public.shops_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit('shop_applied', 'shop', NEW.id::text, jsonb_build_object('name', NEW.name));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.write_audit('shop_status_changed', 'shop', NEW.id::text,
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'reason', NEW.rejection_reason));
    IF NEW.status = 'approved' AND NEW.owner_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.owner_id, 'seller') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shops_after AFTER INSERT OR UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.shops_after();

-- ===== Products =====
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 160),
  slug text NOT NULL UNIQUE,
  brand text,
  model text,
  description text,
  condition public.product_condition NOT NULL,
  price_rwf bigint NOT NULL CHECK (price_rwf > 0),
  compare_at_price_rwf bigint CHECK (compare_at_price_rwf IS NULL OR compare_at_price_rwf > price_rwf),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  warranty text,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.product_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  is_featured boolean NOT NULL DEFAULT false,
  is_affiliate_enabled boolean NOT NULL DEFAULT true,
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_status_idx ON public.products (status, created_at DESC);
CREATE INDEX products_shop_idx ON public.products (shop_id);
CREATE INDEX products_category_idx ON public.products (category_id);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_shop(_shop_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops WHERE id = _shop_id AND owner_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.shop_is_approved(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops WHERE id = _shop_id AND status = 'approved')
$$;

CREATE POLICY "Public sees approved products of approved shops; owners and staff see theirs" ON public.products FOR SELECT TO anon, authenticated
  USING ((status = 'approved' AND public.shop_is_approved(shop_id)) OR public.owns_shop(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Approved sellers add products" ON public.products FOR INSERT TO authenticated
  WITH CHECK ((public.owns_shop(shop_id, auth.uid()) AND public.shop_is_approved(shop_id)) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners and staff update products" ON public.products FOR UPDATE TO authenticated
  USING (public.owns_shop(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.owns_shop(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners and staff delete products" ON public.products FOR DELETE TO authenticated
  USING (public.owns_shop(shop_id, auth.uid()) OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.products_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := auth.uid() IS NULL OR public.is_staff(auth.uid());
DECLARE needs_approval boolean := public.setting_bool('product_approval_required', true);
BEGIN
  NEW.updated_at := now();
  IF staff THEN RETURN NEW; END IF;
  IF NOT public.shop_is_approved(NEW.shop_id) THEN
    RAISE EXCEPTION 'Your shop must be approved before you can publish products';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := CASE WHEN needs_approval THEN 'pending'::public.product_status ELSE 'approved'::public.product_status END;
    NEW.is_featured := false;
    NEW.view_count := 0;
    NEW.rejection_reason := NULL;
  ELSE
    NEW.shop_id := OLD.shop_id;
    NEW.is_featured := OLD.is_featured;
    NEW.view_count := OLD.view_count;
    NEW.rejection_reason := OLD.rejection_reason;
    IF OLD.status = 'removed' THEN
      NEW.status := 'removed';
    ELSE
      NEW.status := CASE WHEN needs_approval THEN 'pending'::public.product_status ELSE 'approved'::public.product_status END;
      NEW.rejection_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_guard BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_guard();

CREATE OR REPLACE FUNCTION public.products_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) THEN
    PERFORM public.write_audit('product_status_changed', 'product', NEW.id::text,
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'reason', NEW.rejection_reason));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_after AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_after();

-- Public view counter (safe: only increments)
CREATE OR REPLACE FUNCTION public.increment_product_view(_product_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.products SET view_count = view_count + 1 WHERE id = _product_id AND status = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.increment_product_view(uuid) TO anon, authenticated;

-- ===== Product images =====
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images (product_id, sort_order);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_product(_product_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(_user_id) OR EXISTS (
    SELECT 1 FROM public.products p JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = _product_id AND s.owner_id = _user_id)
$$;
CREATE POLICY "Anyone reads product images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners and staff add images" ON public.product_images FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_product(product_id, auth.uid()));
CREATE POLICY "Owners and staff edit images" ON public.product_images FOR UPDATE TO authenticated
  USING (public.can_manage_product(product_id, auth.uid())) WITH CHECK (public.can_manage_product(product_id, auth.uid()));
CREATE POLICY "Owners and staff delete images" ON public.product_images FOR DELETE TO authenticated
  USING (public.can_manage_product(product_id, auth.uid()));

-- ===== Wishlists =====
CREATE TABLE public.wishlists (
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.wishlists FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== Storage policies (private buckets, uploads in own folder) =====
CREATE POLICY "Users upload own product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('product-images','shop-media') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own uploads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('product-images','shop-media') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));
CREATE POLICY "Users delete own uploads" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('product-images','shop-media') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));

-- ===== Admin RPCs (real counts) =====
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'customers', (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role = 'customer'),
    'sellers', (SELECT count(*) FROM public.shops WHERE NOT is_demo),
    'approved_sellers', (SELECT count(*) FROM public.shops WHERE status = 'approved' AND NOT is_demo),
    'pending_sellers', (SELECT count(*) FROM public.shops WHERE status = 'pending'),
    'total_products', (SELECT count(*) FROM public.products),
    'pending_products', (SELECT count(*) FROM public.products WHERE status = 'pending'),
    'active_products', (SELECT count(*) FROM public.products WHERE status = 'approved'),
    'demo_products', (SELECT count(*) FROM public.products p JOIN public.shops s ON s.id = p.shop_id WHERE s.is_demo)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL)
RETURNS TABLE (id uuid, email text, full_name text, phone text, account_status text, created_at timestamptz, last_sign_in_at timestamptz, roles public.app_role[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, u.email::text, p.full_name, p.phone, p.account_status, p.created_at, u.last_sign_in_at,
    COALESCE(ARRAY(SELECT r.role FROM public.user_roles r WHERE r.user_id = p.id ORDER BY r.role), '{}')
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE _search IS NULL OR _search = '' OR u.email ILIKE '%' || _search || '%' OR p.full_name ILIKE '%' || _search || '%' OR p.phone ILIKE '%' || _search || '%'
  ORDER BY p.created_at DESC
  LIMIT 200;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated;

-- ===== Labelled demo data =====
WITH d AS (SELECT id FROM public.districts WHERE name = 'Kicukiro'),
shop AS (
  INSERT INTO public.shops (name, slug, description, address, district_id, business_type, contact_name, phone, email, status, is_demo, approved_at)
  SELECT 'REBERO Demo', 'rebero-demo', 'Sample shop with test listings so you can try REBERO. These are not real offers and can be deleted by the Super Admin.',
    'Kigali (sample)', d.id, 'registered_business', 'REBERO Team', '+250 788 000 000', 'demo@rebero.rw', 'approved', true, now()
  FROM d RETURNING id
),
items(name, slug, cat, brand, model, cond, price, compare, stock, warranty, specs, featured, img, ord) AS (VALUES
  ('Galaxy A55 5G 256GB (Sample)', 'sample-galaxy-a55-5g', 'smartphones', 'Samsung', 'Galaxy A55', 'new', 520000, NULL::bigint, 6, 'Sample listing — warranty shown for testing only', '{"Storage":"256 GB","RAM":"8 GB","Display":"6.6\" AMOLED","Network":"5G"}', true, '/__l5e/assets-v1/237440e4-fef9-4b3c-ac87-3a3c7d32dc31/rebero-phone.jpg', 1),
  ('EliteBook 840 G8 Core i5 (Sample)', 'sample-elitebook-840-g8', 'laptops-computers', 'HP', 'EliteBook 840 G8', 'refurbished', 650000, 780000::bigint, 3, NULL, '{"Processor":"Intel Core i5 11th Gen","RAM":"16 GB","Storage":"512 GB SSD","Display":"14\" FHD"}', true, '/__l5e/assets-v1/72e88d54-3b7b-4213-8611-983a1cc3bd3f/rebero-laptop.jpg', 2),
  ('WH-1000XM5 Noise Cancelling Headphones (Sample)', 'sample-wh-1000xm5', 'headphones-speakers', 'Sony', 'WH-1000XM5', 'used', 280000, NULL, 1, NULL, '{"Type":"Over-ear","Connectivity":"Bluetooth 5.2","Battery":"Up to 30 h"}', false, '/__l5e/assets-v1/ee21fe9d-cc38-4fbe-a47d-f69ab7929840/rebero-headphones.jpg', 3),
  ('Watch Series Sport 45mm (Sample)', 'sample-smartwatch-45mm', 'wearables', NULL, NULL, 'new', 320000, NULL, 4, NULL, '{"Case":"45 mm aluminium","Band":"Sport band"}', false, '/__l5e/assets-v1/dcd69c7e-a08e-4f22-a323-9b75f51b5206/rebero-watch.jpg', 4),
  ('Portable Bluetooth Speaker 20W (Sample)', 'sample-bluetooth-speaker-20w', 'headphones-speakers', NULL, NULL, 'new', 85000, 99000::bigint, 12, NULL, '{"Output":"20 W","Water resistance":"IPX7"}', true, '/__l5e/assets-v1/ebaee37b-98da-4a7c-b561-e33a64c246ed/rebero-speaker.jpg', 5),
  ('20000mAh USB-C Power Bank (Sample)', 'sample-power-bank-20000', 'power-charging', NULL, NULL, 'new', 35000, NULL, 25, NULL, '{"Capacity":"20000 mAh","Ports":"USB-A, USB-C"}', false, '/__l5e/assets-v1/292163d8-0df3-4bca-a501-bc9bb2f3ea5e/rebero-powerbank.jpg', 6),
  ('Home Gaming Console + Controller (Sample)', 'sample-gaming-console', 'gaming', NULL, NULL, 'used', 690000, NULL, 1, NULL, '{"Storage":"825 GB","Includes":"1 wireless controller"}', true, '/__l5e/assets-v1/b18544b5-8029-4ba1-8d18-c87678e5eb62/rebero-console.jpg', 7),
  ('55" 4K Smart TV (Sample)', 'sample-55-4k-smart-tv', 'tvs-displays', NULL, NULL, 'new', 899000, NULL, 2, NULL, '{"Screen":"55\"","Resolution":"4K UHD","Smart TV":"Yes"}', false, '/__l5e/assets-v1/19398556-5e67-491e-9077-1e9605c81da3/rebero-tv.jpg', 8)
),
ins AS (
  INSERT INTO public.products (shop_id, category_id, name, slug, brand, model, description, condition, price_rwf, compare_at_price_rwf, stock, warranty, specs, status, is_featured, created_at)
  SELECT shop.id, c.id, i.name, i.slug, i.brand, i.model,
    'Sample listing for testing REBERO — not a real offer. Use it to try search, product pages, wishlists and sharing.',
    i.cond::public.product_condition, i.price, i.compare, i.stock, i.warranty, i.specs::jsonb, 'approved', i.featured, now() - (i.ord || ' hours')::interval
  FROM items i CROSS JOIN shop LEFT JOIN public.categories c ON c.slug = i.cat
  RETURNING id, slug
)
INSERT INTO public.product_images (product_id, url, sort_order)
SELECT ins.id, i.img, 0 FROM ins JOIN items i ON i.slug = ins.slug;
