-- Dev-only convenience: while iterating locally/against the demo, the
-- registrations table repeatedly picks up test rows (manual admin tests,
-- PhonePe sandbox runs, etc.) that need clearing before a real demo or
-- before real registrations start. Rather than hand-writing a fresh DELETE
-- each time, this is a one-touch SECURITY DEFINER RPC, same pattern as
-- register_attendee/reject_registration: wipes all registrations for one
-- event and resets its seat counter, atomically.
--
-- NOT part of the real registration flow, not called from any app code —
-- call it manually (Supabase SQL editor `select reset_event_registrations('slug');`,
-- or via supabase-js `.rpc('reset_event_registrations', { p_event_slug: 'slug' })`
-- with the service-role key) whenever the table needs clearing during dev.
-- Only service_role can execute it — never grant this to anon.
create or replace function reset_event_registrations(p_event_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select id into v_event_id from events where slug = p_event_slug;

  if v_event_id is null then
    raise exception 'No event with slug %', p_event_slug;
  end if;

  delete from registrations where event_id = v_event_id;

  update events set seats_taken = 0 where id = v_event_id;
end;
$$;

grant execute on function reset_event_registrations(text) to service_role;
