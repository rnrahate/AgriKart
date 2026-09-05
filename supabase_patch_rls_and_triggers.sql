-- =====================================================================
--          AGRIKART SUPABASE PATCH (RLS POLICIES & TRIGGER UPDATES)
-- =====================================================================
-- Safe, idempotent script containing ONLY the updates from the recent debug.
-- This does NOT drop or recreate existing tables.

-- 1. Ensure Backward-Compatible View for 'users'
CREATE OR REPLACE VIEW public.users AS
  SELECT 
    id, 
    email, 
    full_name, 
    phone, 
    role, 
    email_verified AS verified, 
    location, 
    bio, 
    created_at, 
    updated_at
  FROM public.profiles;

-- 2. Enhanced Trigger: Auto-sync auth.users to public.profiles & vendors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
  user_phone TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'farmer');
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
  user_phone := new.raw_user_meta_data->>'phone';

  -- Insert or update user profile
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    new.id, 
    new.email, 
    user_name,
    user_phone,
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  -- If user registered as a vendor, automatically create vendor record
  IF user_role = 'vendor' THEN
    INSERT INTO public.vendors (
      id,
      user_id,
      company_name,
      business_name,
      owner_name,
      business_phone,
      business_description,
      is_active
    ) VALUES (
      new.id,
      new.id,
      COALESCE(new.raw_user_meta_data->>'business_name', user_name || '''s Store'),
      COALESCE(new.raw_user_meta_data->>'business_name', user_name || '''s Store'),
      user_name,
      user_phone,
      'New vendor profile',
      true
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- Re-attach trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles can be viewed by all" ON public.profiles;
CREATE POLICY "Public profiles can be viewed by all" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 4. Row Level Security (RLS) on Vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public vendors can be viewed by all" ON public.vendors;
CREATE POLICY "Public vendors can be viewed by all" 
  ON public.vendors FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Vendors can insert their own profile" ON public.vendors;
CREATE POLICY "Vendors can insert their own profile" 
  ON public.vendors FOR INSERT 
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendors can update their own profile" ON public.vendors;
CREATE POLICY "Vendors can update their own profile" 
  ON public.vendors FOR UPDATE 
  USING (auth.uid() = id OR auth.uid() = user_id);

-- 5. Atomic RPC Functions
CREATE OR REPLACE FUNCTION public.decrease_product_inventory(product_id UUID, quantity INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET 
    quantity_in_stock = GREATEST(quantity_in_stock - quantity, 0),
    stock_quantity = GREATEST(stock_quantity - quantity, 0),
    updated_at = NOW()
  WHERE id = product_id AND quantity_in_stock >= quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient inventory for product % or product not found', product_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_article_views(article_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_views INT;
BEGIN
  UPDATE public.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id
  RETURNING view_count INTO new_views;

  RETURN new_views;
END;
$$;
