/**
 * Throwaway concurrency test for the atomic seat-cap claim.
 * NOT part of the production build — run manually with:
 *   npx tsx --env-file=.env.local scripts/load-test-register.ts <baseUrl> <concurrentRequests>
 *
 * Point this at a TEST event row with a small guaranteed_seat_cap (e.g. 5),
 * never at the real Halasuru event — it creates junk registrations.
 *
 * Since registration-integrity.md Item 3, the atomic seat claim happens at
 * *verification* time (claim_and_verify_registration), not at submission
 * time — register_attendee just inserts a `pending` row unconditionally.
 * So this test now has two phases: (1) submit N registrations concurrently
 * via POST /api/register (all land `pending`, none claim capacity), then
 * (2) "verify" all of them concurrently by calling
 * claim_and_verify_registration directly via a service-role Supabase client
 * — the same RPC markVerifiedAndIssueTicket calls, exercised the same way
 * an admin double-clicking Verify or a PhonePe webhook race would. Needs
 * NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment
 * (--env-file=.env.local above, or export them manually) since it talks to
 * Supabase directly rather than through an authenticated admin API route.
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const baseUrl = process.argv[2] ?? "http://localhost:3000";
  const n = Number(process.argv[3] ?? 20);

  const registerRequests = Array.from({ length: n }, (_, i) =>
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

  const registered = await Promise.all(registerRequests);
  const registerErrors = registered.filter((r) => r.error || r.duplicate);
  const pendingIds = registered.filter((r) => r.id).map((r) => r.id as string);

  console.log(`Submitted ${n} registrations — ${pendingIds.length} landed pending`);
  if (registerErrors.length) {
    console.log(`  submission errors/duplicates: ${registerErrors.length}`, registerErrors);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — " +
        "re-run with `tsx --env-file=.env.local` or export them manually."
    );
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const claimResults = await Promise.all(
    pendingIds.map((id) =>
      supabase
        .rpc("claim_and_verify_registration", {
          p_registration_id: id,
          p_verified_by: null,
          p_verified_at: new Date().toISOString(),
        })
        .single()
    )
  );

  const claimed = claimResults.map((r) => r.data as { status: string } | null);
  const verified = claimed.filter((c) => c?.status === "verified");
  const waitlisted = claimed.filter((c) => c?.status === "waitlisted");
  const claimErrors = claimResults.filter((r) => r.error);

  console.log(`\nClaimed ${pendingIds.length} concurrently at "verification" time`);
  console.log(`  verified (seat assigned): ${verified.length}`);
  console.log(`  waitlisted: ${waitlisted.length}`);
  console.log(`  errors: ${claimErrors.length}`);
  if (claimErrors.length) console.log(claimErrors.map((r) => r.error));

  console.log(
    "\nCheck events.seats_taken in Supabase — it must equal exactly " +
      "min(pendingIds.length, guaranteed_seat_cap) for the test event, never more."
  );
}

main();
