-- Gategrind: one-time RESET of all analysis data.
-- Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
--
-- WHAT THIS DELETES (for ALL users, cannot be undone):
--   * every saved session            (public.sessions)
--   * every saved answer             (public.attempts)
--   * every paused test kept online  (public.user_state, key 'active-session')
-- WHAT IT KEEPS: user accounts, saved questions (bookmarks), tutor answers and chat history.
--
-- From now on the app only saves SETS THAT ARE COMPLETED. A test the user exits is never saved,
-- so it never appears in the analysis.
--
-- ORDER: run this first, then upload the new site files (so old results waiting on devices
-- are not sent back after the wipe; the new site also drops them once on each device).

begin;

truncate table public.attempts, public.sessions restart identity;
delete from public.user_state where key = 'active-session';

-- OPTIONAL, remove the two dashes at the start of a line to also wipe that data:
-- delete from public.saved_questions;                       -- all bookmarks
-- delete from public.user_state;                            -- paused tests, tutor answers, chat history

commit;

-- Access for signed-in users (safe to run again; fixes "permission denied for table ..."):
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.saved_questions, public.sessions, public.attempts, public.user_state
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Check: every count below should be 0.
select 'sessions' as table_name, count(*) from public.sessions
union all select 'attempts', count(*) from public.attempts
union all select 'active-session rows', count(*) from public.user_state where key = 'active-session';