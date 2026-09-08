import Ornament from "./Ornament";

const AGENDA = [
  { time: "5:00 PM", title: "Gates & Check-in Open" },
  { time: "5:45 PM", title: "Please Be Seated" },
  { time: "6:00 PM", title: "Discourse by Swami Sarvapriyananda" },
  { time: "7:30 PM", title: "Programme Concludes" },
];

export default function AgendaSection() {
  return (
    <section id="agenda" className="max-w-4xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
        Agenda
      </h2>
      <Ornament />
      <div className="mt-8 space-y-0">
        {AGENDA.map((item, i) => (
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
