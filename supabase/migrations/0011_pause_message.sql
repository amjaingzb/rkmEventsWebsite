-- Item 6 (registration-integrity.md): the message shown on the public site
-- when registration is Paused (manual_pause OR auto_pause -- one field
-- covers both triggers for now, per the doc).
alter table events add column pause_message text;
