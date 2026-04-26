
-- Create profiles table to track user statistics and leaderboard data
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  watch_time integer DEFAULT 0, -- in minutes
  downloads integer DEFAULT 0,
  activity_points integer DEFAULT 0,
  level integer DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Function to handle profile creation and welcome email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Create the user profile
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'first_name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Trigger welcome email only for manual (email) signups
  -- Note: This requires the pg_net extension to be enabled in Supabase
  IF new.raw_app_meta_data->>'provider' = 'email' THEN
    PERFORM
      net.http_post(
        url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'email', new.email,
          'display_name', COALESCE(new.raw_user_meta_data->>'full_name', 'Movie Lover')
        )
      );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC Function to increment stats safely and update levels
CREATE OR REPLACE FUNCTION public.increment_user_stat(user_id uuid, metric_name text, increment_by integer)
RETURNS void AS $$
DECLARE
  current_points integer;
  new_level integer;
BEGIN
  -- First, ensure the profile exists (safety for existing users who might have been missed)
  INSERT INTO public.profiles (id, display_name, level)
  SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Member'), 1
  FROM auth.users WHERE id = user_id
  ON CONFLICT (id) DO NOTHING;

  -- Update the specific metric
  EXECUTE format('UPDATE public.profiles SET %I = %I + $1, updated_at = now() WHERE id = $2', metric_name, metric_name)
  USING increment_by, user_id;

  -- Recalculate level if activity points changed
  IF metric_name = 'activity_points' THEN
    SELECT activity_points INTO current_points FROM public.profiles WHERE id = user_id;
    -- Formula: Level = floor(sqrt(points / 50)) + 1
    -- This means Level 2 at 50pts, Level 3 at 200pts, Level 10 at 4050pts
    new_level := floor(sqrt(current_points / 50)) + 1;
    
    UPDATE public.profiles SET level = new_level WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant administrative access to the main mail
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the user ID for the main admin email
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'shelvinjoe11@gmail.com';
  
  -- If the user exists, ensure they have the admin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

