import Image from "next/image";
import Ornament from "./Ornament";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-saffron/15 via-cream to-cream border-b border-gold/30"
    >
      {/* subtle decorative motif, purely visual */}
      <svg
        aria-hidden="true"
        className="absolute -top-10 -right-10 w-64 h-64 text-saffron/10 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <circle cx="100" cy="100" r="100" />
      </svg>

      <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="relative w-full h-56 sm:h-72 rounded-lg mb-8 overflow-hidden border border-gold/30 bg-white/50">
          <Image
            src="/images/rkm-halasuru.png"
            alt="Ramakrishna Math, Halasuru"
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-contain"
            priority
          />
        </div>

        <Ornament />

        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-maroon mb-4">
          Swami Sarvapriyananda at Ramakrishna Math Halasuru
        </h1>
        <p className="text-lg text-ink/80 mb-1">
          31 October 2026 &middot; 6:00 PM – 7:30 PM
        </p>
        <p className="text-ink/60 mb-10">
          Ramakrishna Math, Halasuru, Bangalore
        </p>
        <a
          href="#register"
          className="inline-block bg-maroon text-white px-8 py-3 rounded-full font-medium hover:bg-maroon-dark transition shadow-sm"
        >
          Register Now
        </a>
      </div>
    </section>
  );
}
