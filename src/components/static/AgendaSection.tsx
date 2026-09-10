import Ornament from "./Ornament";
import type { AgendaItem } from "@/lib/content/types";

export default function AgendaSection({ items }: { items: AgendaItem[] }) {
  return (
    <section id="agenda" className="max-w-4xl mx-auto px-4 py-16 md:py-24 scroll-mt-16">
      <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
        Agenda
      </h2>
      <Ornament />
      <div className="mt-8 space-y-0">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4 sm:gap-6 py-4 border-b border-gold/20 last:border-0">
            <div className="w-24 sm:w-28 shrink-0 text-sm font-medium text-saffron-dark pt-0.5">
              {item.time}
            </div>
            <div className="text-ink/80">{item.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
