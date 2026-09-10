export type AgendaItem = { time: string; title: string };

export type SpeakerContent = {
  highlights: string[];
  fullBio: string[];
  photoUrl: string;
};

export type FaqCategory = {
  category: string;
  items: { q: string; a: string }[];
};

export type ParkingBullet = { label?: string; text: string };

export type EventContent = {
  title: string;
  speaker: string;
  venueName: string;
  venueAddress: string;
  heroPhotoUrl: string;
  heroCtaText: string;
  heroBadgeText: string;
  heroDateLabel: string;
  heroTimeLabel: string;
  heroVenueLabel: string;
  agenda: AgendaItem[];
  speakerContent: SpeakerContent;
  faq: FaqCategory[];
  venueMapsEmbedUrl: string;
  parkingInfo: ParkingBullet[];
  contactEmail: string;
  contactPhone: string;
  contactWhatsappNumber: string;
};
