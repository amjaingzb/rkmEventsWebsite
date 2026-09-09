import Image from "next/image";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-maroon bg-white/70 border border-gold/40 rounded-full px-3.5 py-1.5">
      {children}
    </span>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-saffron/15 via-cream to-cream border-b border-gold/30 scroll-mt-16"
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

      <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="text-center lg:text-left">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-saffron-dark bg-saffron/10 border border-saffron/30 rounded-full px-3 py-1 mb-5">
            Public Discourse
          </span>

          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-maroon mb-5 leading-tight">
            Swami Sarvapriyananda at Ramakrishna Math Halasuru
          </h1>

          <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 mb-8">
            <Chip>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
              31 October 2026
            </Chip>
            <Chip>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              6:00 PM – 7:30 PM
            </Chip>
            <Chip>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 21s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z" strokeLinejoin="round" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              Halasuru, Bangalore
            </Chip>
          </div>

          <a
            href="#register"
            className="inline-block bg-maroon text-white px-8 py-3 rounded-full font-medium hover:bg-maroon-dark transition shadow-sm"
          >
            Register Now
          </a>
        </div>

        <div className="relative w-full aspect-[4/3] rounded-2xl shadow-xl overflow-hidden border border-gold/30 bg-white/50">
          <Image
            src="/images/rkm-halasuru.png"
            alt="Ramakrishna Math, Halasuru"
            fill
            sizes="(max-width: 1024px) 100vw, 576px"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </section>
  );
}
