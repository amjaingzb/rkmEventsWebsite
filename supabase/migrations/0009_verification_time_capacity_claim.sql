-- Item 3 (registration-integrity.md): the seat-cap claim moves from
-- registration *submission* time to payment *verification* time. This
-- closes the "claim a slot, never pay" hole -- an abandoned/incomplete
-- checkout (manual or PhonePe) no longer squats on capacity.
--
-- register_attendee no longer touches events.seats_taken or assigns a
-- registration_number -- it just inserts a `pending` row. The atomic
-- claim-or-waitlist logic (same single-UPDATE-with-guard pattern as before)
-- moves into claim_and_verify_registration, called only from the shared
-- markVerifiedAndIssueTicket seam (src/lib/ticket/issue.ts) once a payment
-- is actually confirmed (manual admin click, or PhonePe webhook/status).
--
-- Critical: this function does NOT check events.is_registration_open.
-- That flag is repurposed by Item 6 as the manual pause switch, and pause
-- must gate new *submissions* only -- never block an admin from verifying
-- an already-pending backlog (see registration-integrity.md caveat 6).

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
  v_reg registrations;
begin
  if p_num_attendees < 1 or p_num_attendees > 4 then
    raise exception 'num_attendees must be between 1 and 4';
  end if;

  insert into registrations (
    event_id, full_name, email, phone, num_attendees,
    payment_reference, payment_amount, status
  ) values (
    p_event_id, p_full_name, p_email, p_phone, p_num_attendees,
    p_payment_reference, p_payment_amount, 'pending'
  ) returning * into v_reg;

  return v_reg;
end;
$$;

-- The claim-or-waitlist RPC. Locks the registration row first (FOR UPDATE)
-- so two concurrent verify attempts on the SAME registration -- e.g. an
-- admin double-clicking Verify while the PhonePe webhook fires for the same
-- row -- serialize on that lock rather than both passing the pending check.
-- Then does the exact same atomic UPDATE-with-guard on events.seats_taken
-- that register_attendee used to do, but now gated by payment verification
-- instead of by mere submission.
create or replace function claim_and_verify_registration(
  p_registration_id uuid,
  p_verified_by uuid,
  p_verified_at timestamptz
) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg registrations;
  v_new_seats_taken int;
  v_registration_number int;
  v_status registration_status;
begin
  select * into v_reg from registrations where id = p_registration_id for update;

  if v_reg.id is null or v_reg.status <> 'pending' then
    -- Not found, or already verified/rejected/waitlisted -- treat as a
    -- no-op (idempotency guard), same intent as the old
    -- .eq("status","pending") guard in markVerifiedAndIssueTicket.
    return null;
  end if;

  update events
    set seats_taken = seats_taken + v_reg.num_attendees
    where id = v_reg.event_id
      and seats_taken + v_reg.num_attendees <= guaranteed_seat_cap
    returning seats_taken into v_new_seats_taken;

  if found then
    v_registration_number := v_new_seats_taken;
    v_status := 'verified';
  else
    -- Rare race: capacity filled between submission and verification, even
    -- with the Item 5 buffer. Falls to waitlisted *with* payment fields
    -- already populated on the row -- distinguishable in admin from a
    -- normal Item-6 EOI waitlisted row (which has no payment_reference).
    v_registration_number := null;
    v_status := 'waitlisted';
  end if;

  update registrations
    set status = v_status,
        registration_number = v_registration_number,
        verified_by = case when v_status = 'verified' then p_verified_by else null end,
        verified_at = case when v_status = 'verified' then p_verified_at else null end
    where id = p_registration_id
    returning * into v_reg;

  return v_reg;
end;
$$;

grant execute on function claim_and_verify_registration(uuid, uuid, timestamptz) to service_role;
