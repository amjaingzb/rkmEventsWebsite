import { CONTACT_EMAIL } from "@/lib/contact";

export default function Footer() {
  return (
    <footer className="bg-maroon-dark text-cream/80">
      <div className="max-w-4xl mx-auto px-4 py-8 text-sm flex flex-col sm:flex-row justify-between gap-2">
        <p>Ramakrishna Math, Halasuru, Bangalore</p>
        <p>Queries: {CONTACT_EMAIL}</p>
      </div>
    </footer>
  );
}
