-- BACKLOG Item 1 (RLS as defense-in-depth): docs/technical-concepts.md's
-- "RLS" Q&A entry (2026-09-12) and docs/BACKLOG.md Item 1 already agreed the
-- spec; this migration just implements it. No live gap exists today (the
-- browser never talks to Supabase directly except the anon-key login/logout
-- handshake on /admin/login — see src/lib/supabase/client.ts) — this is
-- purely to close off future accidental exposure (a client-side `.from()`
-- call, a copy-pasted tutorial snippet) before it can happen.
--
-- Posture:
--   anon        -- may execute register_attendee only. No table access,
--                  no other RPC.
--   authenticated -- any user with a real Supabase Auth session (that's what
--                  the `authenticated` role means at the JWT level — the
--                  anon key alone never carries it) gets full table access,
--                  matching today's single-admin-role model (see
--                  docs/BACKLOG.md item 17, roles not split yet).
--   service_role -- unaffected either way; it bypasses RLS entirely and is
--                  the only role the app's API routes actually use for data
--                  access (see src/lib/supabase/server.ts).
--
-- This migration only touches grants/policies -- no table shape, no
-- function bodies, no application code.

alter table events enable row level security;
alter table registrations enable row level security;

-- anon gets no direct table access at all -- register_attendee (a
-- SECURITY DEFINER function) is its only door in, and SECURITY DEFINER
-- functions execute with the definer's privileges, bypassing these RLS
-- policies regardless of the caller's role.
revoke all on events, registrations from anon;

-- authenticated (i.e. a logged-in admin) keeps the standard table grants
-- Supabase applies by default, gated by the policies below.
create policy "authenticated full access" on events
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on registrations
  for all to authenticated using (true) with check (true);

-- Function-level grants. `create function` grants EXECUTE to PUBLIC by
-- default, which every prior migration's explicit
-- `grant ... to service_role` never revoked -- anon could already call any
-- of these directly. Close that for every admin-only RPC; register_attendee
-- is the sole function anon may call.
revoke execute on function register_attendee(uuid, text, text, text, int, text, numeric, text) from public;
grant execute on function register_attendee(uuid, text, text, text, int, text, numeric, text) to anon;

revoke execute on function claim_and_verify_registration(uuid, uuid, timestamptz) from public;
revoke execute on function reject_registration(uuid, uuid, text) from public;
revoke execute on function reinstate_registration(uuid, uuid) from public;
revoke execute on function event_capacity_snapshot(uuid) from public;
revoke execute on function reset_event_registrations(text) from public;
