-- =====================================================================
--          AGRIKART: DECOUPLE SUPABASE FROM AUTH.USERS FOR CLERK
-- =====================================================================
-- Complete, bulletproof migration script that:
-- 1. Drops all dependent RLS policies in the public schema
-- 2. Drops dependent triggers from auth.users
-- 3. Dynamically and cleanly drops all foreign key constraints referencing profiles/vendors
-- 4. Drops dependent views (e.g. public.users)
-- 5. Alters all user and vendor ID columns to VARCHAR(255) USING col::varchar
-- 6. Re-adds foreign key constraints with matching VARCHAR(255) types
-- 7. Recreates public.users view
-- 8. Recreates clean, Clerk-compatible RLS policies
-- 9. Grants appropriate permissions

BEGIN;

-- ---------------------------------------------------------------------
-- 1. DROP ALL DEPENDENT RLS POLICIES DYNAMICALLY & EXPLICITLY
-- ---------------------------------------------------------------------
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. DROP DEPENDENT TRIGGERS FROM auth.users
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;

-- ---------------------------------------------------------------------
-- 3. DROP DEPENDENT VIEWS
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.users CASCADE;

-- ---------------------------------------------------------------------
-- 4. DYNAMICALLY DROP ALL FOREIGN KEYS AFFECTED BY TYPE ALTERATION
-- ---------------------------------------------------------------------
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop FK constraints referencing public.profiles or public.vendors
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_schema = 'public'
          AND ccu.table_name IN ('profiles', 'vendors')
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_schema, r.table_name, r.constraint_name);
    END LOOP;

    -- Drop FK constraints defined on public.profiles or public.vendors (such as profiles_id_fkey to auth.users)
    FOR r IN (
        SELECT table_schema, table_name, constraint_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY' 
          AND table_schema = 'public'
          AND table_name IN ('profiles', 'vendors')
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_schema, r.table_name, r.constraint_name);
    END LOOP;

    -- Drop any remaining FK constraints on columns being converted to VARCHAR(255)
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND kcu.column_name IN (
            'id', 'user_id', 'vendor_id', 'farmer_id', 'author_id', 'reviewed_by', 'sender_id', 'receiver_id'
          )
          AND tc.table_name IN (
            'profiles', 'vendors', 'products', 'orders', 'order_items', 'cart_items', 
            'reviews', 'messages', 'disease_predictions', 'prediction_feedback', 
            'scheme_applications', 'articles', 'chat_sessions', 'payment_history'
          )
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_schema, r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 5. ALTER COLUMN TYPES TO VARCHAR(255) (USING column::varchar)
-- ---------------------------------------------------------------------
-- User ID columns (referencing profiles.id)
ALTER TABLE public.profiles ALTER COLUMN id TYPE VARCHAR(255) USING id::varchar;
ALTER TABLE public.vendors ALTER COLUMN id TYPE VARCHAR(255) USING id::varchar;
ALTER TABLE public.vendors ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::varchar;
ALTER TABLE public.orders ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::varchar;
ALTER TABLE public.cart_items ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::varchar;
ALTER TABLE public.reviews ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::varchar;
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE VARCHAR(255) USING sender_id::varchar;
ALTER TABLE public.messages ALTER COLUMN receiver_id TYPE VARCHAR(255) USING receiver_id::varchar;
ALTER TABLE public.disease_predictions ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::varchar;
ALTER TABLE public.prediction_feedback ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::varchar;
ALTER TABLE public.scheme_applications ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::varchar;
ALTER TABLE public.scheme_applications ALTER COLUMN reviewed_by TYPE VARCHAR(255) USING reviewed_by::varchar;
ALTER TABLE public.articles ALTER COLUMN author_id TYPE VARCHAR(255) USING author_id::varchar;
ALTER TABLE public.chat_sessions ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::varchar;
ALTER TABLE public.payment_history ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::varchar;

-- Vendor ID columns (referencing vendors.id)
ALTER TABLE public.products ALTER COLUMN vendor_id TYPE VARCHAR(255) USING vendor_id::varchar;
ALTER TABLE public.order_items ALTER COLUMN vendor_id TYPE VARCHAR(255) USING vendor_id::varchar;
ALTER TABLE public.cart_items ALTER COLUMN vendor_id TYPE VARCHAR(255) USING vendor_id::varchar;
ALTER TABLE public.reviews ALTER COLUMN vendor_id TYPE VARCHAR(255) USING vendor_id::varchar;
ALTER TABLE public.articles ALTER COLUMN vendor_id TYPE VARCHAR(255) USING vendor_id::varchar;

-- ---------------------------------------------------------------------
-- 6. RECREATE FOREIGN KEY CONSTRAINTS WITH MATCHING VARCHAR(255) TYPES
-- ---------------------------------------------------------------------
-- Constraints to public.profiles(id)
ALTER TABLE public.vendors ADD CONSTRAINT vendors_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.disease_predictions ADD CONSTRAINT disease_predictions_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.prediction_feedback ADD CONSTRAINT prediction_feedback_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.scheme_applications ADD CONSTRAINT scheme_applications_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.scheme_applications ADD CONSTRAINT scheme_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.articles ADD CONSTRAINT articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.chat_sessions ADD CONSTRAINT chat_sessions_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.payment_history ADD CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Constraints to public.vendors(id)
ALTER TABLE public.products ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;
ALTER TABLE public.articles ADD CONSTRAINT articles_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 7. RECREATE public.users VIEW
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 8. RECREATE CLEAN RLS POLICIES COMPATIBLE WITH CLERK & SUPABASE
-- ---------------------------------------------------------------------
-- Profiles
CREATE POLICY "Public profiles can be viewed by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles can be created and updated" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Vendors
CREATE POLICY "Public vendors can be viewed by all" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Vendors manage profiles" ON public.vendors FOR ALL USING (true) WITH CHECK (true);

-- Categories & Products (Public Catalog)
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Active products viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Vendors manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Cart & Orders
CREATE POLICY "Cart items accessible" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Orders accessible" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Order items accessible" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- Reviews
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews manage" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

-- Disease Intelligence & Schemes
CREATE POLICY "Predictions accessible" ON public.disease_predictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Prediction feedback accessible" ON public.prediction_feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Schemes viewable by everyone" ON public.schemes FOR SELECT USING (true);
CREATE POLICY "Scheme applications accessible" ON public.scheme_applications FOR ALL USING (true) WITH CHECK (true);

-- Articles & Alerts & Chat
CREATE POLICY "Articles viewable by everyone" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Alerts viewable by everyone" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Chat sessions accessible" ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Chat messages accessible" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Messages accessible" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Payment history accessible" ON public.payment_history FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 9. PERMISSIONS
-- ---------------------------------------------------------------------
GRANT ALL ON public.profiles TO authenticated, service_role, anon;
GRANT ALL ON public.users TO authenticated, service_role, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, anon;

COMMIT;
