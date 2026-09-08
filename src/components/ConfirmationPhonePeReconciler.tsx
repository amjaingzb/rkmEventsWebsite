"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mounted only when a PhonePe-mode registration is still `pending` on load
 * — covers the race where the browser's redirect back from PhonePe lands
 * before the S2S webhook does. Calls the status-reconciliation route once
 * and refreshes the page if it flips to verified.
 */
export default function ConfirmationPhonePeReconciler({
  registrationId,
}: {
  registrationId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/phonepe/status?registrationId=${registrationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "verified") {
          router.refresh();
        }
      })
      .catch(() => {});
  }, [registrationId, router]);

  return null;
}
