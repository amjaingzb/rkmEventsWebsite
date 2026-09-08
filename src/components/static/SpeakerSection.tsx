import Image from "next/image";
import Ornament from "./Ornament";

export default function SpeakerSection() {
  return (
    <section id="speakers" className="max-w-4xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
        Speaker
      </h2>
      <Ornament />
      <div className="mt-8 flex flex-col sm:flex-row gap-8 items-start justify-center">
        <div className="relative w-32 h-32 shrink-0 rounded-full overflow-hidden border border-gold/30 mx-auto sm:mx-0">
          <Image
            src="/images/swami-sarvapriyananda.jpg"
            alt="Swami Sarvapriyananda"
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
        <div className="max-w-xl space-y-4">
          <h3 className="font-display text-xl font-medium text-maroon">
            Swami Sarvapriyananda
          </h3>
          <p className="text-ink/80 leading-relaxed italic">
            Resident Minister and Spiritual Leader of the Vedanta Society of
            New York — the historic first Vedanta center in the West,
            founded by Swami Vivekananda in 1894. Widely regarded for his
            systematic, modern approach to Advaita Vedanta, bridging ancient
            Eastern philosophy and contemporary Western thought.
          </p>
          <p className="text-ink/70 leading-relaxed">
            He joined the Ramakrishna Math in 1994 and received sannyasa
            (monastic ordination) in 2004. Over his three decades of
            monastic service, he has served the Ramakrishna Math and
            Mission in various administrative and educational capacities,
            including Assistant Minister of the Vedanta Society of
            Southern California, Acharya at the Monastic Probationers&apos;
            Training Center at Belur Math, Vice Principal of the Deoghar
            Vidyapith Higher Secondary School, Principal of the Shikshana
            Mandira Teacher Education College at Belur Math, and First
            Registrar of the Ramakrishna Mission Vivekananda University at
            Belur Math.
          </p>
          <p className="text-ink/70 leading-relaxed">
            He holds a degree in Business Management from the Xavier
            Institute of Management, Bhubaneswar. During 2019–2020, he was
            appointed as a Nagral Fellow at the Harvard Divinity School.
            Swami Sarvapriyananda has spoken at prestigious global forums,
            including TEDx, Google Talk, the World Parliament of Religions,
            and the United Nations Headquarters. His dialogues with
            prominent scientists, philosophers, and thinkers have made the
            profound concepts of non-dual consciousness accessible to a
            contemporary global audience.
          </p>
        </div>
      </div>
    </section>
  );
}
