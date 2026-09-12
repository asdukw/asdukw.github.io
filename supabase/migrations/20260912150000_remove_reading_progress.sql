-- Reading progress is not used by the application. Remove its API and storage.
drop function if exists public.get_progress(text, text);
drop function if exists public.set_progress(text, text, integer);
drop table if exists public.reading_progress;

-- Supabase Auth manages sessions in auth.sessions; this application table is unused.
drop table if exists public.auth_sessions;
