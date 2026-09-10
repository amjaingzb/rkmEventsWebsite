import { redirect } from "next/navigation";
import { createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { getRawEventContent } from "@/lib/content/getEventContent";
import AdminContentEditor from "@/components/AdminContentEditor";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export default async function AdminContentPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const serviceClient = createServiceClient();
  const content = await getRawEventContent(serviceClient, EVENT_SLUG);

  if (!content) {
    throw new Error(`No events row found for slug "${EVENT_SLUG}"`);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Site content</h1>
          <p className="text-sm text-gray-500">
            Edits go live immediately — no deploy needed.
          </p>
        </div>
        <a href="/admin/dashboard" className="text-sm text-saffron-dark hover:underline">
          ← Back to registrations
        </a>
      </div>
      <AdminContentEditor initial={content} />
    </main>
  );
}
