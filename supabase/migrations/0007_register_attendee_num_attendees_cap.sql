-- Item 2 (registration-integrity.md): per-submission cap of 4 attendees.
-- Client-side this is enforced by a 1-4 dropdown in RegistrationForm.tsx
-- (src/lib/registration/limits.ts, MAX_ATTENDEES_PER_SUBMISSION -- keep the
-- literal below in sync if that ever changes); this is defense-in-depth
-- against direct API/RPC calls. Rejects (raises), doesn't clamp, matching
-- the existing lower-bound guard's style.
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
  v_seat_number int;
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
    v_seat_number := v_new_seats_taken;
    v_status := 'pending';
  else
    v_seat_number := null;
    v_status := 'waitlisted';
  end if;

  insert into registrations (
    event_id, full_name, email, phone, num_attendees,
    payment_reference, payment_amount, status, seat_number
  ) values (
    p_event_id, p_full_name, p_email, p_phone, p_num_attendees,
    p_payment_reference, p_payment_amount, v_status, v_seat_number
  ) returning * into v_reg;

  return v_reg;
end;
$$;
