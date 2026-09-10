"use client";

import { useState } from "react";
import Image from "next/image";
import Ornament from "./Ornament";
import type { SpeakerContent } from "@/lib/content/types";

type SpeakerSectionProps = {
  name: string;
} & SpeakerContent;

export default function SpeakerSection({
  name,
  highlights,
  fullBio,
  photoUrl,
}: SpeakerSectionProps) {
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
              src={photoUrl}
              alt={name}
              fill
              sizes="160px"
              className="object-cover object-top"
            />
          </div>
          <div className="flex-1 space-y-4">
            <h3 className="font-display text-2xl font-medium text-maroon text-center sm:text-left">
              {name}
            </h3>

            <ul className="space-y-2.5">
              {highlights.map((point) => (
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
                {fullBio.map((para, i) => (
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
