-- Reinstate plumbing (internal only -- not a separate admin-facing action;
-- the admin dashboard reuses the existing "Verify" button on a rejected
-- row, which calls this first then falls through to the normal verify
-- flow -- see src/app/api/admin/verify/route.ts).
alter table registrations add column reinstated_by uuid;
alter table registrations add column reinstated_at timestamptz;

create or replace function reinstate_registration(
  p_registration_id uuid,
  p_reinstated_by uuid
) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg registrations;
begin
  update registrations
    set status = 'pending',
        reinstated_by = p_reinstated_by,
        reinstated_at = now()
    where id = p_registration_id
      and status = 'rejected'
    returning * into v_reg;

  if not found then
    return null;
  end if;

  return v_reg;
end;
$$;

grant execute on function reinstate_registration(uuid, uuid) to service_role;

-- Optional reject reason, captured in the same click that sends the
-- rejection email (no separate manual "send email" step needed anymore).
alter table registrations add column rejection_reason text;

-- CREATE OR REPLACE does NOT replace a function whose parameter list
-- changed (Postgres identifies a function by name + argument types) --
-- it would silently create a second overload and leave the old 2-arg
-- version callable too, which breaks PostgREST/supabase-js's .rpc() call
-- (ambiguous match). Drop the old signature explicitly first.
drop function if exists reject_registration(uuid, uuid);

create or replace function reject_registration(
  p_registration_id uuid,
  p_rejected_by uuid,
  p_rejection_reason text default null
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
        rejected_at = now(),
        rejection_reason = p_rejection_reason
    where id = p_registration_id
      and status = 'pending'
    returning * into v_reg;

  if not found then
    return null;
  end if;

  if v_reg.registration_number is not null then
    update events set seats_taken = seats_taken - v_reg.num_attendees where id = v_reg.event_id;
    update registrations set registration_number = null where id = v_reg.id;
    v_reg.registration_number := null;
  end if;

  return v_reg;
end;
$$;

-- Registration source, stamped at creation time (not derived from the
-- event's current payment_mode toggle, which can change later and would
-- misjudge older rows). Also the dashboard's missing "how was this
-- submitted" column. Nullable -- existing rows predate this and are
-- treated as 'manual' (ungated) wherever read.
alter table registrations add column registration_mode text
  check (registration_mode in ('manual', 'phonepe', 'walkin'));

-- register_attendee gains the same registration_mode param, stamped at
-- submission time by its callers. Same overload-drop reasoning as above.
drop function if exists register_attendee(uuid, text, text, text, int, text, numeric);

create or replace function register_attendee(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_num_attendees int,
  p_payment_reference text,
  p_payment_amount numeric,
  p_registration_mode text default null
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
    payment_reference, payment_amount, status, registration_mode
  ) values (
    p_event_id, p_full_name, p_email, p_phone, p_num_attendees,
    p_payment_reference, p_payment_amount, 'pending', p_registration_mode
  ) returning * into v_reg;

  return v_reg;
end;
$$;
