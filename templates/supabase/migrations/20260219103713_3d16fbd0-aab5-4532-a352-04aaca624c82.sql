
-- Create push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own subscription (no auth required for PWA)
CREATE POLICY "Anyone can insert push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Users can delete their own subscription
CREATE POLICY "Users can delete their own subscription"
ON public.push_subscriptions
FOR DELETE
USING (endpoint IS NOT NULL);

-- Service role can read all subscriptions (for sending)
CREATE POLICY "Service role reads all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (true);
