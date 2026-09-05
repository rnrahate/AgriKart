-- =====================================================================
--                   AGRIKART 2.0 CONSOLIDATED SCHEMA (PRODUCTION)
-- =====================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean Up (Drop in reverse dependency order)
DROP TABLE IF EXISTS public.payment_history CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.prediction_feedback CASCADE;
DROP TABLE IF EXISTS public.disease_predictions CASCADE;
DROP TABLE IF EXISTS public.diseases CASCADE;
DROP TABLE IF EXISTS public.scheme_applications CASCADE;
DROP TABLE IF EXISTS public.schemes CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.articles CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Profiles Table (Main user metadata linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'vendor', 'expert', 'admin')),
  language VARCHAR(10) DEFAULT 'en',
  location VARCHAR(255),
  state VARCHAR(100),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(20) DEFAULT 'pending',
  notification_preferences JSONB DEFAULT '{
    "emailNotifications": true,
    "pushNotifications": true,
    "smsNotifications": false,
    "newsletterSubscribed": false,
    "schemeAlerts": true,
    "diseaseAlerts": true,
    "orderUpdates": true
  }'::jsonb,
  bio TEXT,
  last_login TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility view for frontend queries referencing 'users'
CREATE OR REPLACE VIEW public.users AS
  SELECT id, email, full_name, phone, role, email_verified AS verified, location, bio, created_at, updated_at
  FROM public.profiles;

-- 4. Vendors Table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_description TEXT,
  owner_name VARCHAR(255),
  business_type VARCHAR(100),
  registration_number VARCHAR(100),
  gst_number VARCHAR(30),
  pan_number VARCHAR(30),
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  business_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  website_url VARCHAR(500),
  years_in_business INT DEFAULT 0,
  service_areas TEXT[] DEFAULT '{}'::text[],
  support_contact VARCHAR(100),
  avatar_url VARCHAR(500),
  banner_url VARCHAR(500),
  rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 5.00,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Categories Table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  parent_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  product_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Products Table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2),
  stock_quantity INT DEFAULT 0 CHECK (stock_quantity >= 0),
  quantity_in_stock INT DEFAULT 0 CHECK (quantity_in_stock >= 0),
  image VARCHAR(500),
  image_url VARCHAR(500),
  additional_images JSONB DEFAULT '[]'::jsonb,
  specifications JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}'::text[],
  sku VARCHAR(80),
  rating DECIMAL(3,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Reviews Table (Aligned with reviewService)
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  comment TEXT,
  helpful_count INT DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Orders Table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_id VARCHAR(255),
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Order Items Table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Shopping Cart Items Table
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- 11. Payment History Table
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(255) NOT NULL,
  razorpay_payment_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'pending',
  method VARCHAR(50) DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Messages Table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Diseases Table
CREATE TABLE public.diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  scientific_name VARCHAR(255),
  description TEXT,
  symptoms TEXT,
  causes TEXT,
  prevention_methods JSONB DEFAULT '[]'::jsonb,
  treatment_methods JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Disease Predictions Table
CREATE TABLE public.disease_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  disease_id UUID REFERENCES public.diseases(id) ON DELETE SET NULL,
  image_url VARCHAR(500) NOT NULL,
  image_size_bytes INT,
  predicted_disease VARCHAR(255) NOT NULL,
  confidence_score DECIMAL(5,4) NOT NULL,
  model_version VARCHAR(100) NOT NULL,
  crop_type VARCHAR(100) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(50) DEFAULT 'pending',
  expert_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Prediction Feedback Table
CREATE TABLE public.prediction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.disease_predictions(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('correct', 'incorrect')),
  actual_disease_id UUID REFERENCES public.diseases(id) ON DELETE SET NULL,
  actual_disease_name VARCHAR(255),
  explanation TEXT,
  confidence_in_correction INT,
  is_training_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Schemes Table
CREATE TABLE public.schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  agency VARCHAR(255),
  eligible_states TEXT[] DEFAULT '{}'::text[],
  eligible_roles TEXT[] DEFAULT '{}'::text[],
  min_land_size DECIMAL(10,2),
  max_income_limit DECIMAL(12,2),
  subsidy_amount DECIMAL(12,2),
  subsidy_type VARCHAR(100),
  benefits_description TEXT,
  launch_date TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  application_start_date TIMESTAMPTZ,
  application_end_date TIMESTAMPTZ,
  application_process TEXT,
  required_documents TEXT[] DEFAULT '{}'::text[],
  official_website VARCHAR(500),
  contact_details TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  year_applicable VARCHAR(10),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Scheme Applications Table
CREATE TABLE public.scheme_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'disbursed')),
  land_size_at_application DECIMAL(10,2),
  income_at_application DECIMAL(12,2),
  documents_submitted JSONB DEFAULT '[]'::jsonb,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  disbursed_amount DECIMAL(12,2),
  disbursed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Articles Table
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  featured_image_url VARCHAR(500),
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}'::text[],
  relevant_crops TEXT[] DEFAULT '{}'::text[],
  relevant_states TEXT[] DEFAULT '{}'::text[],
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  source_url VARCHAR(500),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Alerts Table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(50),
  relevant_states TEXT[] DEFAULT '{}'::text[],
  relevant_districts TEXT[] DEFAULT '{}'::text[],
  relevant_crops TEXT[] DEFAULT '{}'::text[],
  action_url VARCHAR(500),
  external_link VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Chat Sessions Table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'New Farming Conversation',
  topic VARCHAR(255),
  context JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Chat Messages Table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INT,
  generation_time_ms INT,
  model_version VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
--                          INDEXES
-- =====================================================================
CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active, created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_vendor ON public.order_items(vendor_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX idx_orders_user ON public.orders(user_id, status);
CREATE INDEX idx_payment_history_order ON public.payment_history(order_id);
CREATE INDEX idx_payment_history_razorpay ON public.payment_history(razorpay_order_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_predictions_farmer ON public.disease_predictions(farmer_id);
CREATE INDEX idx_schemes_slug ON public.schemes(slug);
CREATE INDEX idx_scheme_apps_farmer ON public.scheme_applications(farmer_id);
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_published ON public.articles(is_published, published_at DESC);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);

-- =====================================================================
--                   FUNCTIONS & STORED PROCEDURES
-- =====================================================================

-- Auto-sync auth.users to public.profiles safely with fixed search_path
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic inventory decrease function
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

-- Atomic article view counter function
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

-- =====================================================================
--                   ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles can be viewed by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Vendors
CREATE POLICY "Public vendors can be viewed by all" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Vendors can insert their own profile" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = user_id);
CREATE POLICY "Vendors can update their own profile" ON public.vendors FOR UPDATE USING (auth.uid() = id OR auth.uid() = user_id);

-- Categories: Public read
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Products: Public view active, vendor manage own
CREATE POLICY "Active products viewable by everyone" ON public.products FOR SELECT USING (is_active = true OR auth.uid() = vendor_id);
CREATE POLICY "Vendors manage their products" ON public.products FOR ALL USING (auth.uid() = vendor_id);

-- Cart: Users manage only their own cart
CREATE POLICY "Users manage their own cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id);

-- Orders: Users view own orders, insert own orders
CREATE POLICY "Users view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vendors view assigned order items" ON public.order_items FOR SELECT USING (
  auth.uid() = vendor_id OR EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  )
);

-- Reviews: Viewable by everyone, created/updated by review owner
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users manage their own reviews" ON public.reviews FOR ALL USING (auth.uid() = user_id);

-- Disease Predictions & Feedback
CREATE POLICY "Users view their predictions" ON public.disease_predictions FOR ALL USING (auth.uid() = farmer_id);
CREATE POLICY "Users view their prediction feedback" ON public.prediction_feedback FOR ALL USING (auth.uid() = farmer_id);

-- Chat Sessions & Messages
CREATE POLICY "Users view their chat sessions" ON public.chat_sessions FOR ALL USING (auth.uid() = farmer_id);
CREATE POLICY "Users view their chat messages" ON public.chat_messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.farmer_id = auth.uid()
  )
);

-- Schemes & Applications
CREATE POLICY "Schemes viewable by everyone" ON public.schemes FOR SELECT USING (true);
CREATE POLICY "Farmers manage their scheme applications" ON public.scheme_applications FOR ALL USING (auth.uid() = farmer_id);

-- Articles & Alerts
CREATE POLICY "Articles viewable by everyone" ON public.articles FOR SELECT USING (is_published = true OR auth.uid() = author_id);
CREATE POLICY "Alerts viewable by everyone" ON public.alerts FOR SELECT USING (is_active = true);

-- Messages
CREATE POLICY "Users view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Storage Buckets & Policies
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('disease-images', 'disease-images', false),
  ('product-images', 'product-images', true),
  ('scheme-documents', 'scheme-documents', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload disease images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'disease-images');
CREATE POLICY "Users can access their disease images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'disease-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public product images read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Vendors can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
