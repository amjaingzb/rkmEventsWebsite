"use client";

import { useState } from "react";
import Image from "next/image";
import Ornament from "./Ornament";

const HIGHLIGHTS = [
  "Resident Minister and Spiritual Leader of the Vedanta Society of New York — the historic first Vedanta center in the West, founded by Swami Vivekananda in 1894.",
  "Three decades of monastic service across the Ramakrishna Math and Mission, including as Principal of the Shikshana Mandira Teacher Education College and First Registrar of Ramakrishna Mission Vivekananda University, Belur Math.",
  "Spoken at TEDx, Google Talk, the World Parliament of Religions, and the United Nations Headquarters, making non-dual consciousness accessible to a global audience.",
];

const FULL_BIO = [
  "Resident Minister and Spiritual Leader of the Vedanta Society of New York — the historic first Vedanta center in the West, founded by Swami Vivekananda in 1894. Widely regarded for his systematic, modern approach to Advaita Vedanta, bridging ancient Eastern philosophy and contemporary Western thought.",
  "He joined the Ramakrishna Math in 1994 and received sannyasa (monastic ordination) in 2004. Over his three decades of monastic service, he has served the Ramakrishna Math and Mission in various administrative and educational capacities, including Assistant Minister of the Vedanta Society of Southern California, Acharya at the Monastic Probationers' Training Center at Belur Math, Vice Principal of the Deoghar Vidyapith Higher Secondary School, Principal of the Shikshana Mandira Teacher Education College at Belur Math, and First Registrar of the Ramakrishna Mission Vivekananda University at Belur Math.",
  "He holds a degree in Business Management from the Xavier Institute of Management, Bhubaneswar. During 2019–2020, he was appointed as a Nagral Fellow at the Harvard Divinity School. Swami Sarvapriyananda has spoken at prestigious global forums, including TEDx, Google Talk, the World Parliament of Religions, and the United Nations Headquarters. His dialogues with prominent scientists, philosophers, and thinkers have made the profound concepts of non-dual consciousness accessible to a contemporary global audience.",
];

export default function SpeakerSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="speakers" className="max-w-4xl mx-auto px-4 py-16 md:py-24 scroll-mt-16">
      <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
        Keynote Speaker
      </h2>
      <Ornament />

      <div className="mt-8 rounded-2xl border border-gold/30 bg-gradient-to-br from-saffron/10 via-cream to-white p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto sm:mx-0">
            <Image
              src="/images/swami-sarvapriyananda.jpg"
              alt="Swami Sarvapriyananda"
              fill
              sizes="160px"
              className="object-cover object-top"
            />
          </div>
          <div className="flex-1 space-y-4">
            <h3 className="font-display text-2xl font-medium text-maroon text-center sm:text-left">
              Swami Sarvapriyananda
            </h3>

            <ul className="space-y-2.5">
              {HIGHLIGHTS.map((point) => (
                <li key={point} className="flex gap-2.5 text-ink/80 leading-relaxed">
                  <span className="text-saffron-dark shrink-0 mt-1" aria-hidden="true">
                    ✦
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {expanded && (
              <div className="space-y-4 pt-2 border-t border-gold/20">
                {FULL_BIO.map((para, i) => (
                  <p key={i} className="text-ink/70 leading-relaxed text-sm">
                    {para}
                  </p>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="text-sm font-medium text-saffron-dark hover:text-maroon transition inline-flex items-center gap-1"
            >
              {expanded ? "Show less" : "Read full bio"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
