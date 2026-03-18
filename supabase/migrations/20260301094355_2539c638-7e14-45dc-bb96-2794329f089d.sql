
-- Fix: Make SELECT policies permissive so they actually allow access

-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can modify site settings" ON public.site_settings;

-- user_roles: Allow users to read their own roles (needed for admin check)
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- user_roles: Admins can manage all roles  
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- site_settings: Anyone authenticated can read
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (true);

-- site_settings: Admins can modify
CREATE POLICY "Admins can modify site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
