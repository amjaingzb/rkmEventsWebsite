import { createServiceClient } from "@/lib/supabase/server";

const PHONEPE_GATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour, flat constant

/**
 * A `pending` PhonePe registration is meant to resolve automatically via
 * the webhook/status-check path -- a manual admin Verify/Reject during
 * that window could race it (e.g. reject a row PhonePe is about to
 * confirm, silently stranding a genuine payer once claim_and_verify_registration
 * no-ops on a non-pending row). Blocks manual action for
 * PHONEPE_GATE_WINDOW_MS after creation, then opens up as a manual
 * override/fallback in case the automation genuinely got stuck -- a
 * permanent block would be worse than the rare race it guards against.
 *
 * Fails open (returns false/"not blocked") on any unexpected error -- a
 * bug in this check is low-stakes (one row, one admin click) and should
 * never permanently strand an admin action.
 */
export async function isPhonePeGateBlocking(registrationId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("registrations")
      .select("status, registration_mode, created_at")
      .eq("id", registrationId)
      .single();

    if (error || !data) return false;
    if (data.status !== "pending" || data.registration_mode !== "phonepe") return false;

    const ageMs = Date.now() - new Date(data.created_at).getTime();
    return ageMs < PHONEPE_GATE_WINDOW_MS;
  } catch (err) {
    console.error("PhonePe gate check failed, failing open:", err);
    return false;
  }
}
