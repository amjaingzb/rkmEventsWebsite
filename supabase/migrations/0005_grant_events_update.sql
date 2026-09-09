-- The admin payment-mode toggle (POST /api/admin/payment-mode) is the first
-- code path that does a direct application-level UPDATE on `events` — every
-- prior write went through register_attendee/reject_registration, both
-- SECURITY DEFINER functions that don't need the caller to hold table
-- grants. That gap was never hit until now: service_role had SELECT on
-- `events` (dashboard reads payment_mode fine) but not UPDATE, causing
-- "permission denied for table events" (Postgres 42501) when toggling.
grant update on events to service_role;
