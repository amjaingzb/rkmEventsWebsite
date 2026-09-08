-- Adds the reject action for admin dashboard (docs/BACKLOG.md item 4 / 5a).
-- Rejection is scoped to `pending` registrations only, matching the documented
-- lifecycle (pending -> verified or rejected). A pending row may already hold
-- a seat (seat_number set), so rejecting it must atomically release that seat
-- back to the cap -- same atomicity requirement as the claim in
-- register_attendee, so this follows the same single-UPDATE-with-guard shape
-- rather than a read-then-write decrement.

alter table registrations add column rejected_by uuid;
alter table registrations add column rejected_at timestamptz;

create or replace function reject_registration(
  p_registration_id uuid,
  p_rejected_by uuid
) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg registrations;
begin
  update registrations
    set status = 'rejected',
        rejected_by = p_rejected_by,
        rejected_at = now()
    where id = p_registration_id
      and status = 'pending'
    returning * into v_reg;

  if not found then
    return null;
  end if;

  -- Only pending rows with a claimed seat need the cap released; waitlisted
  -- rows never had one, but reject_registration only ever matches pending
  -- rows above so this is really just "if it had a seat".
  if v_reg.seat_number is not null then
    update events
      set seats_taken = seats_taken - v_reg.num_attendees
      where id = v_reg.event_id;
  end if;

  return v_reg;
end;
$$;

grant execute on function reject_registration(uuid, uuid) to service_role;
