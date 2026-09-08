import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import AdminTable from "@/components/AdminTable";

export default async function AdminDashboardPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-6">Pending registrations</h1>
      <AdminTable />
    </main>
  );
}
