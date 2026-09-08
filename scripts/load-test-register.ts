/**
 * Throwaway concurrency test for the atomic seat-cap RPC.
 * NOT part of the production build — run manually with:
 *   npx tsx scripts/load-test-register.ts <baseUrl> <concurrentRequests>
 *
 * Point this at a TEST event row with a small guaranteed_seat_cap (e.g. 5),
 * never at the real Halasuru event — it creates junk registrations.
 */

async function main() {
  const baseUrl = process.argv[2] ?? "http://localhost:3000";
  const n = Number(process.argv[3] ?? 20);

  const requests = Array.from({ length: n }, (_, i) =>
    fetch(`${baseUrl}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: `Load Test ${i}`,
        email: `loadtest${i}@example.com`,
        phone: `900000${String(i).padStart(4, "0")}`,
        numAttendees: 1,
        paymentReference: `LOADTEST-${i}`,
        paymentAmount: 100,
      }),
    }).then((r) => r.json())
  );

  const results = await Promise.all(requests);

  const pending = results.filter((r) => r.status === "pending");
  const waitlisted = results.filter((r) => r.status === "waitlisted");
  const errors = results.filter((r) => r.error);

  console.log(`Fired ${n} concurrent registrations`);
  console.log(`  pending (seat assigned): ${pending.length}`);
  console.log(`  waitlisted: ${waitlisted.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) console.log(errors);

  console.log(
    "\nCheck events.seats_taken in Supabase — it must equal exactly " +
      "min(n, guaranteed_seat_cap) for the test event, never more."
  );
}

main();
