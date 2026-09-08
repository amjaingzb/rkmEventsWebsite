import Navbar from "@/components/static/Navbar";
import Hero from "@/components/static/Hero";
import AgendaSection from "@/components/static/AgendaSection";
import SpeakerSection from "@/components/static/SpeakerSection";
import VenueParkingSection from "@/components/static/VenueParkingSection";
import FaqSection from "@/components/static/FaqSection";
import Footer from "@/components/static/Footer";
import RegistrationForm from "@/components/RegistrationForm";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AgendaSection />
        <SpeakerSection />
        <VenueParkingSection />
        <FaqSection />
        <section id="register" className="max-w-2xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-8">
            Register
          </h2>
          <RegistrationForm />
        </section>
        <Footer />
      </main>
    </>
  );
}
