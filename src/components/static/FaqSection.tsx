"use client";

import { useState } from "react";
import Ornament from "./Ornament";

const FAQ_CATEGORIES = [
  {
    category: "Seating, Waitlists & Venue Relocation",
    items: [
      {
        q: "What is the seating capacity, and could the venue change?",
        a: "Seating capacity in the main hall at Ramakrishna Math Halasuru is strictly limited to 500 attendees. If demand far exceeds this number, we may shift the lecture to a larger auditorium in Bengaluru. If this occurs, we will update this webpage and notify all registered attendees directly via email. Please check this page before heading to the venue on October 31, 2026.",
      },
      {
        q: "Can I still register if the initial 500 seats are full?",
        a: "Yes, but only if you join our \"Expression of Interest\" (Waitlist) queue system. Once the initial 500 seats are reserved, we stop accepting payments. If we secure a larger external venue, we will contact waitlisted candidates in order of registration to offer them guaranteed seats.",
      },
      {
        q: "Do I need to pay to join the waitlist, and how will I be notified?",
        a: "No payment is required while on the waitlist. Simply fill out your name, email, and phone number on our registration form. We will reach out to you via email or SMS with instructions if additional seating capacity becomes available.",
      },
    ],
  },
  {
    category: "Payment & Ticket Verification",
    items: [
      {
        q: "How do I pay and complete my registration?",
        a: "While registering (if seats are under the 500 limit), you will see our bank transfer details and UPI QR code. Complete the transaction using your preferred UPI app or banking portal, copy the transaction reference number (UTR/Txn ID), and enter it in the form. Our volunteer team will manually verify this number against our bank statements before issuing your ticket.",
      },
      {
        q: "How long does it take to receive my ticket after payment?",
        a: "Because our payment verification process is manual, it typically takes 24 to 48 hours. Once verified, a digital ticket containing a unique entry code/QR code will be emailed to you automatically. Please check your Spam/Promotions folder if you do not see it within 2 days.",
      },
      {
        q: "Can I register on-the-spot at the venue?",
        a: "No. Registrations must be completed online in advance. Spot registrations at the venue on October 31 will not be available.",
      },
      {
        q: "Can I get a refund if I cannot attend?",
        a: "Registrations are non-refundable. However, you may forward your digital ticket PDF to a friend or family member, who will be permitted entry upon presenting the ticket at the gate.",
      },
    ],
  },
  {
    category: "Transit, Parking & Entry Rules",
    items: [
      {
        q: "Is parking available at the venue?",
        a: "Parking inside the Math premises is extremely limited and reserved exclusively for monastics, volunteers, and senior citizens. We strongly advise against bringing four-wheelers. Any vehicle parked outside the Math on SV Road or nearby streets is at the owner's risk.",
      },
      {
        q: "What is the best way to reach the venue using public transport?",
        a: "We highly encourage using the Namma Metro. The Halasuru Metro Station on the Purple Line is just 540 meters from the Math (about a 5-to-7-minute walk). You can also take any BMTC bus going towards Ulsoor/Lido and alight at the Halasuru Police Station or Trinity Circle stops.",
      },
      {
        q: "What time should I arrive, and what do I need for entry?",
        a: "The gates and check-in desks open at 5:00 PM, and the lecture starts promptly at 6:00 PM. Please arrive early and be seated by 5:45 PM. Have your digital or printed ticket QR code ready at the gate for scanning.",
      },
      {
        q: "Are children allowed to attend the lecture?",
        a: "To ensure a quiet and meditative environment, we request that children under the age of 10 not be brought into the lecture hall.",
      },
    ],
  },
];

export default function FaqSection() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section id="faq" className="max-w-4xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-semibold text-maroon text-center mb-2">
        Frequently Asked Questions
      </h2>
      <Ornament />
      <div className="mt-8 space-y-10">
        {FAQ_CATEGORIES.map((group) => (
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
                      <span className="text-gold shrink-0 text-lg">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <p className="text-ink/70 pb-4 pr-8">{item.a}</p>
                    )}
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
