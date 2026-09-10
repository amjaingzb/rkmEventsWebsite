import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgendaItem, EventContent, FaqCategory, ParkingBullet } from "./types";

/**
 * One cache tag per content area (docs/content-editability-design.md,
 * "Chosen architecture") — editing FAQ should never invalidate Hero's
 * cache entry, so each area gets its own unstable_cache-wrapped fetch
 * rather than one combined cached query.
 */
export const CONTENT_AREAS = ["hero", "agenda", "speaker", "faq", "venue", "contact"] as const;
export type ContentArea = (typeof CONTENT_AREAS)[number];

export function contentTag(area: ContentArea, slug: string) {
  return `content:${area}:${slug}`;
}

/**
 * Which `events` columns each area owns — used both to build each area's
 * cached select below and, in the admin content editor, to whitelist what
 * POST /api/admin/content is allowed to write per area (never a raw
 * client-supplied column list).
 */
export const AREA_COLUMNS: Record<ContentArea, string[]> = {
  hero: [
    "title",
    "hero_photo_url",
    "hero_cta_text",
    "hero_badge_text",
    "hero_date_label",
    "hero_time_label",
    "hero_venue_label",
  ],
  agenda: ["agenda_json"],
  speaker: ["speaker", "speaker_json"],
  faq: ["faq_json"],
  venue: ["venue_name", "venue_address", "venue_maps_embed_url", "parking_info"],
  contact: ["contact_email", "contact_phone", "contact_whatsapp_number"],
};

export type RawContentRow = {
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
 * Uncached, all-columns read for the admin content editor — an editor
 * needs the true current value, never a stale cache entry, so this
 * deliberately bypasses the per-area unstable_cache reads below.
 */
export async function getRawEventContent(
  supabase: SupabaseClient,
  slug: string
): Promise<RawContentRow | null> {
  const allColumns = Array.from(new Set(Object.values(AREA_COLUMNS).flat())).join(", ");
  const { data } = await supabase
    .from("events")
    .select(allColumns)
    .eq("slug", slug)
    .single<RawContentRow>();
  return data;
}

// 5-minute backstop only, per the design doc — not the primary
// invalidation mechanism. The real trigger is revalidateTag(contentTag(...)),
// called from POST /api/admin/revalidate-content after a content edit.
const REVALIDATE_SECONDS = 300;

function cachedArea<T>(supabase: SupabaseClient, area: ContentArea, slug: string, fetcher: () => Promise<T>) {
  return unstable_cache(fetcher, [`content-${area}`, slug], {
    tags: [contentTag(area, slug)],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/**
 * Fetches the DB-backed content for one event (Hero/Agenda/Speaker/FAQ/
 * Venue & Parking/Contact settings — see docs/content-editability-design.md),
 * one independently cached+tagged read per area. Deliberately separate
 * from the capacity/payment-mode query in page.tsx, which must stay
 * always-fresh.
 */
export async function getEventContent(
  supabase: SupabaseClient,
  slug: string
): Promise<EventContent | null> {
  const [hero, agenda, speaker, faq, venue, contact] = await Promise.all([
    cachedArea(supabase, "hero", slug, async () => {
      const { data } = await supabase
        .from("events")
        .select(
          "title, hero_photo_url, hero_cta_text, hero_badge_text, hero_date_label, hero_time_label, hero_venue_label"
        )
        .eq("slug", slug)
        .single<{
          title: string;
          hero_photo_url: string | null;
          hero_cta_text: string | null;
          hero_badge_text: string | null;
          hero_date_label: string | null;
          hero_time_label: string | null;
          hero_venue_label: string | null;
        }>();
      return data;
    }),
    cachedArea(supabase, "agenda", slug, async () => {
      const { data } = await supabase
        .from("events")
        .select("agenda_json")
        .eq("slug", slug)
        .single<{ agenda_json: AgendaItem[] }>();
      return data;
    }),
    cachedArea(supabase, "speaker", slug, async () => {
      const { data } = await supabase
        .from("events")
        .select("speaker, speaker_json")
        .eq("slug", slug)
        .single<{
          speaker: string;
          speaker_json: { highlights: string[]; fullBio: string[]; photoUrl: string } | null;
        }>();
      return data;
    }),
    cachedArea(supabase, "faq", slug, async () => {
      const { data } = await supabase
        .from("events")
        .select("faq_json")
        .eq("slug", slug)
        .single<{ faq_json: FaqCategory[] }>();
      return data;
    }),
    cachedArea(supabase, "venue", slug, async () => {
      const { data } = await supabase
        .from("events")
        .select("venue_name, venue_address, venue_maps_embed_url, parking_info")
        .eq("slug", slug)
        .single<{
          venue_name: string;
          venue_address: string;
          venue_maps_embed_url: string | null;
          parking_info: ParkingBullet[];
        }>();
      return data;
    }),
    cachedArea(supabase, "contact", slug, async () => {
      const { data } = await supabase
        .from("events")
        .select("contact_email, contact_phone, contact_whatsapp_number")
        .eq("slug", slug)
        .single<{
          contact_email: string | null;
          contact_phone: string | null;
          contact_whatsapp_number: string | null;
        }>();
      return data;
    }),
  ]);

  if (!hero || !agenda || !speaker || !faq || !venue || !contact) return null;

  return {
    title: hero.title,
    speaker: speaker.speaker,
    venueName: venue.venue_name,
    venueAddress: venue.venue_address,
    heroPhotoUrl: hero.hero_photo_url ?? "",
    heroCtaText: hero.hero_cta_text ?? "Register Now",
    heroBadgeText: hero.hero_badge_text ?? "",
    heroDateLabel: hero.hero_date_label ?? "",
    heroTimeLabel: hero.hero_time_label ?? "",
    heroVenueLabel: hero.hero_venue_label ?? "",
    agenda: agenda.agenda_json ?? [],
    speakerContent: speaker.speaker_json ?? { highlights: [], fullBio: [], photoUrl: "" },
    faq: faq.faq_json ?? [],
    venueMapsEmbedUrl: venue.venue_maps_embed_url ?? "",
    parkingInfo: venue.parking_info ?? [],
    contactEmail: contact.contact_email ?? "",
    contactPhone: contact.contact_phone ?? "",
    contactWhatsappNumber: contact.contact_whatsapp_number ?? "",
  };
}
