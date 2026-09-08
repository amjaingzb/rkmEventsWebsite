-- Fix: reject_registration (0002) released the seat back to the pool via
-- seats_taken but left seat_number set on the rejected row itself. That
-- number gets reassigned to a future registration, so the admin dashboard
-- could show two different people with the same seat number -- exactly the
-- collision seat number is meant to prevent as a lookup key. Null it out on
-- reject, and backfill any rejected rows already affected.

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

  if v_reg.seat_number is not null then
    update events
      set seats_taken = seats_taken - v_reg.num_attendees
      where id = v_reg.event_id;

    update registrations
      set seat_number = null
      where id = v_reg.id;

    v_reg.seat_number := null;
  end if;

  return v_reg;
end;
$$;

grant execute on function reject_registration(uuid, uuid) to service_role;

-- Backfill: clear seat_number on any rows already rejected under the old
-- (buggy) version of this function.
update registrations set seat_number = null where status = 'rejected' and seat_number is not null;
