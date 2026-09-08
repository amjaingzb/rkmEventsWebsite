import Navbar from "@/components/static/Navbar";
import Hero from "@/components/static/Hero";
import AgendaSection from "@/components/static/AgendaSection";
import SpeakerSection from "@/components/static/SpeakerSection";
import VenueParkingSection from "@/components/static/VenueParkingSection";
import FaqSection from "@/components/static/FaqSection";
import Footer from "@/components/static/Footer";
import RegistrationForm from "@/components/RegistrationForm";
import Ornament from "@/components/static/Ornament";
import { createServiceClient } from "@/lib/supabase/server";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

// Must render per-request, not be statically prerendered at build time —
// otherwise the admin payment-mode toggle (src/lib/registration/register.ts,
// the whole point of which is switching live with no redeploy) would only
// take effect on the next deploy, since the fetched payment_mode would be
// baked into a static shell instead.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServiceClient();
  const { data: event } = await supabase
    .from("events")
    .select("payment_mode")
    .eq("slug", EVENT_SLUG)
    .single();

  const paymentMode = event?.payment_mode ?? "manual";

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AgendaSection />
        <SpeakerSection />
        <VenueParkingSection />
        <FaqSection />
        <section id="register" className="bg-maroon/5 border-t border-gold/30">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
              Register
            </h2>
            <Ornament />
            <div className="mt-8 bg-white/70 border border-gold/30 rounded-xl p-6 sm:p-8">
              <RegistrationForm paymentMode={paymentMode} />
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
