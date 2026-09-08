import { redirect } from "next/navigation";
import { createSessionClient, createServiceClient } from "@/lib/supabase/server";
import AdminTable from "@/components/AdminTable";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AdminPaymentModeToggle from "@/components/AdminPaymentModeToggle";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export default async function AdminDashboardPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: event } = await createServiceClient()
    .from("events")
    .select("payment_mode")
    .eq("slug", EVENT_SLUG)
    .single();

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Registrations</h1>
        <div className="flex items-center gap-4">
          <AdminPaymentModeToggle initialMode={event?.payment_mode ?? "manual"} />
          <AdminLogoutButton />
        </div>
      </div>
      <AdminTable />
    </main>
  );
}
