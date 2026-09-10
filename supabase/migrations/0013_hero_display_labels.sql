-- Follow-up to 0012_content_editability.sql: the project owner flagged
-- that reusing events.venue_name for Hero's venue chip would visibly
-- change its text ("Halasuru, Bangalore" -> "Ramakrishna Math Halasuru",
-- repetitive next to the page title) and that deriving formatted date/time
-- chip text from event_date/start_time/end_time was unwanted complexity.
-- Hero's date/time/venue chips get their own free-text display labels
-- instead, independent of the columns used elsewhere (admin capacity
-- logic, Venue section, etc.) — see docs/content-editability-design.md.

alter table events
  add column hero_venue_label text,
  add column hero_date_label  text,
  add column hero_time_label  text;

update events
set
  hero_venue_label = 'Halasuru, Bangalore',
  hero_date_label = '31 October 2026',
  hero_time_label = '6:00 PM – 7:30 PM'
where slug = 'halasuru-sarvapriyananda-2026';
