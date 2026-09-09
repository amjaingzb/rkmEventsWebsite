// Per-submission attendee cap (registration-integrity.md Item 2). Kept in
// sync manually with the `> 4` guard in register_attendee (Postgres
// functions can't import a TS constant) -- see
// supabase/migrations/0007_register_attendee_num_attendees_cap.sql.
export const MAX_ATTENDEES_PER_SUBMISSION = 4;
