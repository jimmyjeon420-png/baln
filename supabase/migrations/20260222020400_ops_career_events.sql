-- Ensure career events table exists for lifecycle tracking.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.ops_career_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.ops_career_applications(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    event_at timestamptz NOT NULL DEFAULT now(),
    details text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ops_career_events_app
ON public.ops_career_events(application_id);
CREATE INDEX IF NOT EXISTS idx_ops_career_events_at
ON public.ops_career_events(event_at DESC);
ALTER TABLE public.ops_career_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ops_career_events'
          AND policyname = 'ops_career_events_all'
    ) THEN
        CREATE POLICY "ops_career_events_all"
        ON public.ops_career_events
        FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;
