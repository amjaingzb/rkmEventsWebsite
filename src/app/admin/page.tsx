import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export default async function AdminEntryPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/admin/dashboard" : "/admin/login");
}
