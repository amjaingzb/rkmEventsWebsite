-- Hotfix for a real bug in 0015_rls_policies.sql, caught by live testing
-- immediately after applying it: register_attendee had never been
-- explicitly granted to service_role in any prior migration -- it relied
-- entirely on the implicit `PUBLIC` grant every `create function` gets by
-- default. 0015 revoked that PUBLIC grant and re-granted only to anon,
-- which broke the real registration flow (src/lib/registration/register.ts
-- calls register_attendee via the service-role client) with
-- "permission denied for function register_attendee".
--
-- service_role's RLS bypass (the `bypassrls` role attribute) only exempts
-- it from row-level security -- it does NOT imply object-level EXECUTE/
-- SELECT/INSERT/etc grants, which are a separate privilege system. Every
-- other admin-only RPC already had its own explicit
-- `grant execute ... to service_role` from the migration that introduced
-- it, so only register_attendee was exposed to this gap.

grant execute on function register_attendee(uuid, text, text, text, int, text, numeric, text) to service_role;
