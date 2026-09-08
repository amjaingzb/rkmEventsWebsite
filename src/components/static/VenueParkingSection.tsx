import Ornament from "./Ornament";

const MAPS_LINK =
  "https://www.google.com/maps/search/?api=1&query=Ramakrishna+Math+Halasuru+Bangalore";

export default function VenueParkingSection() {
  return (
    <section id="venue" className="bg-maroon/5 border-y border-gold/30">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
          Venue &amp; Logistics
        </h2>
        <Ornament />
        <div className="mt-8 grid sm:grid-cols-2 gap-10">
          <div>
            <h3 className="font-display text-lg font-medium text-maroon mb-3">Venue</h3>
            <p className="text-ink/70 mb-1">Ramakrishna Math, Halasuru</p>
            <p className="text-ink/70 mb-4">
              #113, Swami Vivekananda Road, Halasuru (Ulsoor), Bengaluru,
              Karnataka – 560008
            </p>
            <div className="w-full h-48 rounded-lg overflow-hidden border border-gold/30 mb-2">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.892601712217!2d77.62511697507657!3d12.980311087335688!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae166299999999%3A0xc3e407ea37cb4229!2sRamakrishna%20Math%20Ulsoor!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ramakrishna Math Halasuru location"
              />
            </div>
            <a
              href={MAPS_LINK}
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
              <li>
                Parking inside the Math premises is extremely limited and
                reserved exclusively for monastics, volunteers, and senior
                citizens. Please avoid bringing four-wheelers — any vehicle
                parked outside the Math on SV Road or nearby streets is at
                the owner&apos;s risk.
              </li>
              <li>
                <strong>Metro (recommended):</strong> Halasuru Metro Station
                on the Purple Line is just 540 meters away (a 5–7 minute
                walk).
              </li>
              <li>
                <strong>Bus:</strong> Any BMTC bus toward Ulsoor/Lido — alight
                at Halasuru Police Station or Trinity Circle.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
