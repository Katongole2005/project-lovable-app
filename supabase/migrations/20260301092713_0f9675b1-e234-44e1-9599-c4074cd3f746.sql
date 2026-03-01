
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Site settings table for dynamic feature flags
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for feature flags)
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can modify site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Insert default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('download_enabled', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('registration_enabled', 'true'::jsonb),
  ('hero_carousel_enabled', 'true'::jsonb),
  ('continue_watching_enabled', 'true'::jsonb),
  ('top10_enabled', 'true'::jsonb),
  ('push_notifications_enabled', 'true'::jsonb),
  ('site_announcement', '""'::jsonb);
