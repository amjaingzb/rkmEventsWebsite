"use client";

import { useState } from "react";
import Ornament from "./Ornament";
import type { FaqCategory } from "@/lib/content/types";

export default function FaqSection({ categories }: { categories: FaqCategory[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section id="faq" className="max-w-4xl mx-auto px-4 py-16 md:py-24 scroll-mt-16">
      <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
        Frequently Asked Questions
      </h2>
      <Ornament />
      <div className="mt-8 space-y-10">
        {categories.map((group) => (
          <div key={group.category}>
            <h3 className="font-display text-lg font-medium text-saffron-dark mb-2">
              {group.category}
            </h3>
            <div className="divide-y divide-gold/20 border-t border-b border-gold/20">
              {group.items.map((item) => {
                const key = `${group.category}::${item.q}`;
                const isOpen = openKey === key;
                return (
                  <div key={key}>
                    <button
                      type="button"
                      className="w-full text-left py-4 flex justify-between items-center gap-4"
                      onClick={() => setOpenKey(isOpen ? null : key)}
                      aria-expanded={isOpen}
                    >
                      <span className="font-medium text-maroon">{item.q}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`text-gold shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-ink/70 pb-4 pr-8">{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
