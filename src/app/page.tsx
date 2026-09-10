import Navbar from "@/components/static/Navbar";
import Hero from "@/components/static/Hero";
import AgendaSection from "@/components/static/AgendaSection";
import SpeakerSection from "@/components/static/SpeakerSection";
import VenueParkingSection from "@/components/static/VenueParkingSection";
import FaqSection from "@/components/static/FaqSection";
import Footer from "@/components/static/Footer";
import RegistrationForm from "@/components/RegistrationForm";
import EoiForm from "@/components/EoiForm";
import PausedNotice from "@/components/PausedNotice";
import Ornament from "@/components/static/Ornament";
import { createServiceClient } from "@/lib/supabase/server";
import { getCapacitySnapshot, computeAutoPause, isFull } from "@/lib/registration/capacity";
import { getEventContent } from "@/lib/content/getEventContent";

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
    .select("id, payment_mode, is_registration_open, pause_message")
    .eq("slug", EVENT_SLUG)
    .single();

  const paymentMode = event?.payment_mode ?? "manual";

  // Open/Full-EOI/Paused gating (registration-integrity.md Item 6). This
  // only decides which form to show the public site -- admin walk-in
  // registrations (POST /api/admin/manual-register) never render this
  // page, so they bypass all three states by construction, per the doc's
  // caveat 5.
  const content = await getEventContent(supabase, EVENT_SLUG);

  const snapshot = event ? await getCapacitySnapshot(supabase, event.id) : null;
  const manualPause = event ? !event.is_registration_open : false;
  const autoPause = snapshot ? computeAutoPause(snapshot) : false;
  const paused = manualPause || autoPause;
  const full = snapshot ? isFull(snapshot) : false;
  const registrationState: "open" | "paused" | "full-eoi" = paused
    ? "paused"
    : full
      ? "full-eoi"
      : "open";

  if (!content) {
    // Single-tenant app (CLAUDE.md) — the one seeded event row should
    // always exist. Surfacing plainly rather than rendering a page with
    // sections silently missing their copy.
    throw new Error(`No events row found for slug "${EVENT_SLUG}"`);
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero
          title={content.title}
          badgeText={content.heroBadgeText}
          dateLabel={content.heroDateLabel}
          timeLabel={content.heroTimeLabel}
          venueLabel={content.heroVenueLabel}
          ctaText={content.heroCtaText}
          photoUrl={content.heroPhotoUrl}
        />
        <AgendaSection items={content.agenda} />
        <SpeakerSection name={content.speaker} {...content.speakerContent} />
        <VenueParkingSection
          venueName={content.venueName}
          venueAddress={content.venueAddress}
          mapsEmbedUrl={content.venueMapsEmbedUrl}
          parkingInfo={content.parkingInfo}
        />
        <FaqSection categories={content.faq} />
        <section id="register" className="bg-maroon/5 border-t border-gold/30 scroll-mt-16">
          <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
            <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
              Register
            </h2>
            <Ornament />
            <div className="mt-8 bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gold/30 max-w-xl mx-auto">
              {registrationState === "paused" && (
                <PausedNotice
                  message={
                    event?.pause_message ??
                    "Registration is temporarily paused. Please check back soon."
                  }
                />
              )}
              {registrationState === "full-eoi" && <EoiForm />}
              {registrationState === "open" && (
                <RegistrationForm paymentMode={paymentMode} />
              )}
            </div>
          </div>
        </section>
        <Footer
          contactEmail={content.contactEmail}
          contactPhone={content.contactPhone}
          contactWhatsappNumber={content.contactWhatsappNumber}
        />
      </main>
    </>
  );
}
