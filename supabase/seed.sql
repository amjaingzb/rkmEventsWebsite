-- Run once after 0001_init.sql to create the Halasuru event row.
-- Fill in faq_json / parking_info with real content before Phase B.

insert into events (
  slug, title, speaker, venue_name, venue_address,
  event_date, start_time, end_time,
  guaranteed_seat_cap, waitlist_alert_threshold,
  faq_json, parking_info
) values (
  'halasuru-sarvapriyananda-2026',
  'Swami Sarvapriyananda at Ramakrishna Math Halasuru',
  'Swami Sarvapriyananda',
  'Ramakrishna Math Halasuru',
  'Ramakrishna Math, Halasuru, Bangalore',
  '2026-10-31',
  '18:00',
  '19:30',
  500,
  200,
  '[]'::jsonb,
  'TBD — see docs/BACKLOG.md'
);
