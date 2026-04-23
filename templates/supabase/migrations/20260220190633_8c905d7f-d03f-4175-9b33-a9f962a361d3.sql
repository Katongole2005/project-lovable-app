
-- Table to track the single active session per user
CREATE TABLE public.active_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own session
CREATE POLICY "Users can read own session"
ON public.active_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can upsert their own session
CREATE POLICY "Users can upsert own session"
ON public.active_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session"
ON public.active_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
