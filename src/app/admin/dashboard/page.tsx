import { redirect } from "next/navigation";
import { createSessionClient, createServiceClient } from "@/lib/supabase/server";
import AdminTable from "@/components/AdminTable";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AdminPaymentModeToggle from "@/components/AdminPaymentModeToggle";
import AdminCapacitySettings from "@/components/AdminCapacitySettings";
import { getCapacitySnapshot } from "@/lib/registration/capacity";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export default async function AdminDashboardPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const serviceClient = createServiceClient();
  const { data: event } = await serviceClient
    .from("events")
    .select(
      "id, payment_mode, guaranteed_seat_cap, waitlist_alert_threshold, is_registration_open, pause_message"
    )
    .eq("slug", EVENT_SLUG)
    .single();

  const snapshot = event ? await getCapacitySnapshot(serviceClient, event.id) : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Registrations</h1>
        <div className="flex items-center gap-4">
          {event && snapshot && (
            <AdminCapacitySettings
              initialSettings={{
                guaranteed_seat_cap: event.guaranteed_seat_cap,
                waitlist_alert_threshold: event.waitlist_alert_threshold,
                is_registration_open: event.is_registration_open,
                pause_message: event.pause_message,
              }}
              initialSnapshot={snapshot}
            />
          )}
          <AdminPaymentModeToggle initialMode={event?.payment_mode ?? "manual"} />
          <a
            href="/admin/content"
            className="px-3 py-1 rounded text-sm border border-gray-300 bg-white hover:bg-gray-50"
          >
            Site content
          </a>
          <AdminLogoutButton />
        </div>
      </div>
      <AdminTable />
    </main>
  );
}
