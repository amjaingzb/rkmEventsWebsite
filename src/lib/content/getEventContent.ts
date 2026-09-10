import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgendaItem, EventContent, FaqCategory, ParkingBullet } from "./types";

const CONTENT_COLUMNS =
  "title, speaker, venue_name, venue_address, hero_photo_url, hero_cta_text, " +
  "hero_badge_text, hero_date_label, hero_time_label, hero_venue_label, " +
  "agenda_json, speaker_json, faq_json, venue_maps_embed_url, parking_info, " +
  "contact_email, contact_phone, contact_whatsapp_number";

type ContentRow = {
  title: string;
  speaker: string;
  venue_name: string;
  venue_address: string;
  hero_photo_url: string | null;
  hero_cta_text: string | null;
  hero_badge_text: string | null;
  hero_date_label: string | null;
  hero_time_label: string | null;
  hero_venue_label: string | null;
  agenda_json: AgendaItem[];
  speaker_json: { highlights: string[]; fullBio: string[]; photoUrl: string } | null;
  faq_json: FaqCategory[];
  venue_maps_embed_url: string | null;
  parking_info: ParkingBullet[];
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp_number: string | null;
};

/**
 * Fetches the DB-backed content for one event (Hero/Agenda/Speaker/FAQ/
 * Venue & Parking/Contact settings — see docs/content-editability-design.md).
 * Deliberately separate from the capacity/payment-mode query in page.tsx,
 * which must stay always-fresh — this one is the eventual home for the
 * per-area caching from that doc's step 5, not written yet.
 */
export async function getEventContent(
  supabase: SupabaseClient,
  slug: string
): Promise<EventContent | null> {
  const { data } = await supabase
    .from("events")
    .select(CONTENT_COLUMNS)
    .eq("slug", slug)
    .single<ContentRow>();

  if (!data) return null;

  return {
    title: data.title,
    speaker: data.speaker,
    venueName: data.venue_name,
    venueAddress: data.venue_address,
    heroPhotoUrl: data.hero_photo_url ?? "",
    heroCtaText: data.hero_cta_text ?? "Register Now",
    heroBadgeText: data.hero_badge_text ?? "",
    heroDateLabel: data.hero_date_label ?? "",
    heroTimeLabel: data.hero_time_label ?? "",
    heroVenueLabel: data.hero_venue_label ?? "",
    agenda: data.agenda_json ?? [],
    speakerContent: data.speaker_json ?? { highlights: [], fullBio: [], photoUrl: "" },
    faq: data.faq_json ?? [],
    venueMapsEmbedUrl: data.venue_maps_embed_url ?? "",
    parkingInfo: data.parking_info ?? [],
    contactEmail: data.contact_email ?? "",
    contactPhone: data.contact_phone ?? "",
    contactWhatsappNumber: data.contact_whatsapp_number ?? "",
  };
}
