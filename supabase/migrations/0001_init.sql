-- Phase A schema: events config, registrations, and the atomic seat-cap RPC.
-- RLS is intentionally NOT enabled here (Phase B, see 0002_rls.sql) — Phase A
-- assumes only the server (service-role key) talks to these tables directly.

create extension if not exists "pgcrypto";

create table events (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text unique not null,
  title                     text not null,
  speaker                   text not null,
  venue_name                text not null,
  venue_address             text not null,
  event_date                date not null,
  start_time                time not null,
  end_time                  time not null,
  guaranteed_seat_cap       int not null default 500,
  waitlist_alert_threshold  int not null default 200,
  seats_taken               int not null default 0,
  faq_json                  jsonb not null default '[]',
  parking_info              text,
  is_registration_open      boolean not null default true,
  created_at                timestamptz not null default now()
);

create type registration_status as enum ('pending', 'verified', 'waitlisted', 'rejected');

create table registrations (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references events(id),
  full_name          text not null,
  email              text not null,
  phone              text not null,
  num_attendees      int not null default 1,
  payment_reference  text,
  payment_amount     numeric(10, 2),
  status             registration_status not null default 'pending',
  seat_number        int,
  ticket_sent_at     timestamptz,
  verified_by        uuid,
  verified_at        timestamptz,
  qr_signature       text,
  created_at         timestamptz not null default now()
);

create index registrations_event_status_idx on registrations(event_id, status);
create index registrations_email_idx on registrations(email);

-- Atomic seat-cap reservation + registration insert.
--
-- Race-safety: the UPDATE below is a single statement guarded by
-- `seats_taken + p_num_attendees <= guaranteed_seat_cap` in its WHERE clause.
-- Postgres takes a row-level write lock for the duration of the UPDATE, so two
-- concurrent callers serialize on this row: the second transaction's UPDATE
-- blocks until the first commits, then re-evaluates the WHERE clause against
-- the now-updated seats_taken. There is no read-then-write gap for a second
-- caller to sneak into, unlike an application-level "SELECT count(*) THEN
-- INSERT if under cap" pattern. This guarantees seats_taken never exceeds cap.
--
-- Known simplification: a multi-seat booking that would overflow the cap
-- falls entirely to the waitlist rather than partially filling remaining
-- seats. Documented in docs/BACKLOG.md.
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
  if p_num_attendees < 1 then
    raise exception 'num_attendees must be at least 1';
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
