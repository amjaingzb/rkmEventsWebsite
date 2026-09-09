-- Terminology rename (registration-integrity.md): seat_number implied
-- theater-style assigned seating that doesn't exist -- actual seating is
-- volunteer-assisted, first-come-first-served on the day. Renamed to
-- registration_number and removed from all user-facing surfaces (ticket
-- email, confirmation page) -- kept only as an internal admin/volunteer
-- reference (AdminTable, CSV export). Logic is unchanged here: still
-- claimed at submission time (that changes in the next migration, Item 3).

alter table registrations rename column seat_number to registration_number;

create or replace function register_attendee(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_num_attendees int,
  p_payment_reference text,
  p_payment_amount numeric
) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_seats_taken int;
  v_registration_number int;
  v_status registration_status;
  v_reg registrations;
begin
  if p_num_attendees < 1 or p_num_attendees > 4 then
    raise exception 'num_attendees must be between 1 and 4';
  end if;

  update events
    set seats_taken = seats_taken + p_num_attendees
    where id = p_event_id
      and is_registration_open = true
      and seats_taken + p_num_attendees <= guaranteed_seat_cap
    returning seats_taken into v_new_seats_taken;

  if found then
    v_registration_number := v_new_seats_taken;
    v_status := 'pending';
  else
    v_registration_number := null;
    v_status := 'waitlisted';
  end if;

  insert into registrations (
    event_id, full_name, email, phone, num_attendees,
    payment_reference, payment_amount, status, registration_number
  ) values (
    p_event_id, p_full_name, p_email, p_phone, p_num_attendees,
    p_payment_reference, p_payment_amount, v_status, v_registration_number
  ) returning * into v_reg;

  return v_reg;
end;
$$;

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

  if v_reg.registration_number is not null then
    update events
      set seats_taken = seats_taken - v_reg.num_attendees
      where id = v_reg.event_id;

    update registrations
      set registration_number = null
      where id = v_reg.id;

    v_reg.registration_number := null;
  end if;

  return v_reg;
end;
$$;

grant execute on function reject_registration(uuid, uuid) to service_role;
