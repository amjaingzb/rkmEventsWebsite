/**
 * Registration-integrity.md Item 6: shown instead of any form when
 * registration is Paused (manual_pause OR auto_pause) -- no form, no data
 * collection at all, just the admin-set message.
 */
export default function PausedNotice({ message }: { message: string }) {
  return <p className="max-w-md text-sm text-ink/70">{message}</p>;
}
