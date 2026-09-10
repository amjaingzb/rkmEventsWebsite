type FooterProps = {
  contactEmail: string;
  contactPhone: string;
  contactWhatsappNumber: string;
};

export default function Footer({
  contactEmail,
  contactPhone,
  contactWhatsappNumber,
}: FooterProps) {
  return (
    <footer className="bg-maroon-dark text-cream/80">
      <div className="max-w-4xl mx-auto px-4 py-8 text-sm flex flex-col sm:flex-row justify-between gap-2">
        <p>© 2026 Sri Ramakrishna Math, Halasuru</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={`mailto:${contactEmail}`} className="hover:text-cream transition">
            {contactEmail}
          </a>
          <a href={`tel:+91${contactPhone}`} className="hover:text-cream transition">
            {contactPhone}
          </a>
          <a
            href={`https://wa.me/91${contactWhatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cream transition"
          >
            WhatsApp
          </a>
        </p>
      </div>
    </footer>
  );
}
