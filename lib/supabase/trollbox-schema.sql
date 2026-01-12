-- Trollbox Messages Table
CREATE TABLE IF NOT EXISTS public.trollbox_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trollbox_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to trollbox messages"
    ON public.trollbox_messages FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to send messages"
    ON public.trollbox_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trollbox_messages;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_trollbox_messages_created_at ON public.trollbox_messages(created_at DESC);
