// Decides whether to show the "⚠ Development / Preview" banner
// (src/components/EnvironmentBanner.tsx) in the root layout. Server-only —
// reads the DB and a payment-module internal, never imported by client code.
import { isDevelopment, isLive } from "@/lib/appMode";
import { isUsingSandboxCredentials } from "@/lib/payment/phonepe";
import { createServiceClient } from "@/lib/supabase/server";

const EVENT_SLUG = process.env.EVENT_SLUG || "halasuru-sarvapriyananda-2026";

/** Shown whenever the deployment isn't fully live end-to-end: always in
 * development mode, and in live mode whenever PhonePe is still the active
 * payment mode but resolving to sandbox credentials (no real merchant
 * account set up yet). Manual/UPI payment mode has no PhonePe dependency,
 * so it's treated as fully live on its own. */
export async function shouldShowEnvironmentBanner(): Promise<boolean> {
  if (isDevelopment) return true;
  if (!isLive) return false;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("events")
    .select("payment_mode")
    .eq("slug", EVENT_SLUG)
    .single();

  return data?.payment_mode === "phonepe_sandbox" && isUsingSandboxCredentials();
}
