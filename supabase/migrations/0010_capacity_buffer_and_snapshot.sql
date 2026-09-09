-- Item 5 (registration-integrity.md): repurpose the existing unused
-- waitlist_alert_threshold column as the admin-editable reserve buffer
-- (default 10, was 200 and never read by any app code). Also adds a
-- read-only snapshot function so both the public page (Item 6's
-- auto_pause/full checks) and the admin settings panel (live numbers
-- display) compute confirmedBooking/outstanding identically -- one
-- definition, not duplicated in two places.

alter table events alter column waitlist_alert_threshold set default 10;
update events set waitlist_alert_threshold = 10 where waitlist_alert_threshold = 200;

create or replace function event_capacity_snapshot(p_event_id uuid)
returns table(confirmed_booking int, outstanding int, cap int, buffer int)
language sql
stable
as $$
  select
    e.seats_taken as confirmed_booking,
    coalesce(
      (select sum(r.num_attendees) from registrations r
        where r.event_id = e.id and r.status = 'pending'),
      0
    )::int as outstanding,
    e.guaranteed_seat_cap as cap,
    e.waitlist_alert_threshold as buffer
  from events e
  where e.id = p_event_id
$$;

grant execute on function event_capacity_snapshot(uuid) to service_role;
