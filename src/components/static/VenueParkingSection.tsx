import Ornament from "./Ornament";
import type { ParkingBullet } from "@/lib/content/types";

type VenueParkingSectionProps = {
  venueName: string;
  venueAddress: string;
  mapsEmbedUrl: string;
  parkingInfo: ParkingBullet[];
};

export default function VenueParkingSection({
  venueName,
  venueAddress,
  mapsEmbedUrl,
  parkingInfo,
}: VenueParkingSectionProps) {
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venueName} ${venueAddress}`
  )}`;

  return (
    <section id="venue" className="bg-maroon/5 border-y border-gold/30 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
        <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
          Venue &amp; Logistics
        </h2>
        <Ornament />
        <div className="mt-8 grid sm:grid-cols-2 gap-10">
          <div>
            <h3 className="font-display text-lg font-medium text-maroon mb-3">Venue</h3>
            <p className="text-ink/70 mb-1">{venueName}</p>
            <p className="text-ink/70 mb-4">{venueAddress}</p>
            <div className="w-full h-48 rounded-lg overflow-hidden border border-gold/30 mb-2">
              <iframe
                src={mapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${venueName} location`}
              />
            </div>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-saffron-dark hover:underline"
            >
              Open in Google Maps →
            </a>
          </div>
          <div>
            <h3 className="font-display text-lg font-medium text-maroon mb-3">
              Parking &amp; Getting There
            </h3>
            <ul className="list-disc list-inside text-ink/70 space-y-2">
              {parkingInfo.map((bullet, i) => (
                <li key={i}>
                  {bullet.label && <strong>{bullet.label} </strong>}
                  {bullet.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
