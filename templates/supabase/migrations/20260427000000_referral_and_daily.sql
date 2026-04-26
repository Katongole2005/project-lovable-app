-- 1. Add referral and daily claim columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_claimed_at timestamp with time zone;

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- 3. Function to claim daily points
CREATE OR REPLACE FUNCTION public.claim_daily_points(user_id uuid)
RETURNS json AS $$
DECLARE
  last_claim timestamp with time zone;
  points_to_add integer := 100;
BEGIN
  -- Get last claim time
  SELECT last_claimed_at INTO last_claim FROM public.profiles WHERE id = user_id;
  
  -- Check if 24 hours have passed or if first time
  IF last_claim IS NULL OR last_claim < now() - interval '24 hours' THEN
    -- Update profile
    UPDATE public.profiles 
    SET 
      activity_points = activity_points + points_to_add,
      last_claimed_at = now(),
      updated_at = now()
    WHERE id = user_id;
    
    RETURN json_build_object('success', true, 'message', '100 points claimed!', 'new_points', points_to_add);
  ELSE
    RETURN json_build_object('success', false, 'message', 'Already claimed today. Try again later.', 'next_claim', (last_claim + interval '24 hours'));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update handle_new_user to process referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  referrer_id uuid;
  signup_referral_code text;
BEGIN
  -- Extract referral code from metadata if it exists
  signup_referral_code := new.raw_user_meta_data->>'referral_code';

  -- Find referrer
  IF signup_referral_code IS NOT NULL THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = signup_referral_code;
  END IF;

  -- Create the user profile
  INSERT INTO public.profiles (id, display_name, avatar_url, referred_by)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'first_name', 'User'),
    new.raw_user_meta_data->>'avatar_url',
    referrer_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Credit referrer if found (500 points)
  IF referrer_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET activity_points = activity_points + 500 
    WHERE id = referrer_id;
  END IF;

  -- Trigger welcome email for manual signups
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
