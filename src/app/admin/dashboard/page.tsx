import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import AdminTable from "@/components/AdminTable";
import AdminLogoutButton from "@/components/AdminLogoutButton";

export default async function AdminDashboardPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Registrations</h1>
        <AdminLogoutButton />
      </div>
      <AdminTable />
    </main>
  );
}
