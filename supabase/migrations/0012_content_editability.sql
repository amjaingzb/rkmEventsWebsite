-- Content-editability shape design (docs/content-editability-design.md,
-- "Inventory pass" + shape-design step). Adds DB storage for the content
-- areas sorted as volatile: Hero, Agenda, Speaker, FAQ (reshaped), Venue &
-- Parking, and a new shared Contact settings area. Footer/Navbar stay out
-- of scope per that doc.
--
-- No application code reads these columns yet (that's a later step in the
-- doc's implementation plan) — this migration only adds storage and
-- backfills the *current* hardcoded copy from src/components/static/*.tsx
-- so nothing regresses once the fetch is wired up.
--
-- NOT YET APPLIED to the live Supabase project as of authoring this file —
-- run in the Supabase SQL editor, same as every other unapplied migration
-- tracked in docs/nextSteps.md.

alter table events
  add column hero_photo_url          text,
  add column hero_cta_text           text,
  add column hero_badge_text         text,
  add column agenda_json             jsonb not null default '[]',
  add column speaker_json            jsonb,
  add column venue_maps_embed_url    text,
  add column contact_email           text,
  add column contact_phone           text,
  add column contact_whatsapp_number text;

-- parking_info was `text` (unused placeholder, "TBD — see docs/BACKLOG.md"
-- in seed.sql) — reshaping to jsonb per the agreed structured-list shape
-- ({label?, text} bullets, preserving the current bold-label styling).
-- Safe as a hard type change: the only existing value is the TBD
-- placeholder, overwritten below anyway.
alter table events
  alter column parking_info type jsonb using 'null'::jsonb,
  alter column parking_info set default '[]';

-- Backfill the real event row with the copy currently hardcoded in
-- src/components/static/*.tsx, verbatim, so this migration is purely
-- additive from a visitor's perspective once the fetch moves server-side.
update events
set
  hero_photo_url = '/images/hero-matha-photo.jpg',
  hero_cta_text = 'Register Now',
  hero_badge_text = 'Public Discourse',

  agenda_json = '[
    {"time": "5:00 PM", "title": "Gates & Check-in Open"},
    {"time": "5:45 PM", "title": "Please Be Seated"},
    {"time": "6:00 PM", "title": "Discourse by Swami Sarvapriyananda"},
    {"time": "7:30 PM", "title": "Programme Concludes"}
  ]'::jsonb,

  speaker_json = '{
    "photoUrl": "/images/swami-sarvapriyananda.jpg",
    "highlights": [
      "Resident Minister and Spiritual Leader of the Vedanta Society of New York — the historic first Vedanta center in the West, founded by Swami Vivekananda in 1894.",
      "Three decades of monastic service across the Ramakrishna Math and Mission, including as Principal of the Shikshana Mandira Teacher Education College and First Registrar of Ramakrishna Mission Vivekananda University, Belur Math.",
      "Spoken at TEDx, Google Talk, the World Parliament of Religions, and the United Nations Headquarters, making non-dual consciousness accessible to a global audience."
    ],
    "fullBio": [
      "Resident Minister and Spiritual Leader of the Vedanta Society of New York — the historic first Vedanta center in the West, founded by Swami Vivekananda in 1894. Widely regarded for his systematic, modern approach to Advaita Vedanta, bridging ancient Eastern philosophy and contemporary Western thought.",
      "He joined the Ramakrishna Math in 1994 and received sannyasa (monastic ordination) in 2004. Over his three decades of monastic service, he has served the Ramakrishna Math and Mission in various administrative and educational capacities, including Assistant Minister of the Vedanta Society of Southern California, Acharya at the Monastic Probationers'' Training Center at Belur Math, Vice Principal of the Deoghar Vidyapith Higher Secondary School, Principal of the Shikshana Mandira Teacher Education College at Belur Math, and First Registrar of the Ramakrishna Mission Vivekananda University at Belur Math.",
      "He holds a degree in Business Management from the Xavier Institute of Management, Bhubaneswar. During 2019–2020, he was appointed as a Nagral Fellow at the Harvard Divinity School. Swami Sarvapriyananda has spoken at prestigious global forums, including TEDx, Google Talk, the World Parliament of Religions, and the United Nations Headquarters. His dialogues with prominent scientists, philosophers, and thinkers have made the profound concepts of non-dual consciousness accessible to a contemporary global audience."
    ]
  }'::jsonb,

  faq_json = '[
    {
      "category": "Seating, Waitlists & Venue Relocation",
      "items": [
        {"q": "What is the seating capacity, and could the venue change?", "a": "Seating capacity in the main hall at Ramakrishna Math Halasuru is strictly limited to 500 attendees. If demand far exceeds this number, we may shift the lecture to a larger auditorium in Bengaluru. If this occurs, we will update this webpage and notify all registered attendees directly via email. Please check this page before heading to the venue on October 31, 2026."},
        {"q": "Can I still register if the initial 500 seats are full?", "a": "Yes, but only if you join our \"Expression of Interest\" (Waitlist) queue system. Once the initial 500 seats are reserved, we stop accepting payments. If we secure a larger external venue, we will contact waitlisted candidates in order of registration to offer them guaranteed seats."},
        {"q": "Do I need to pay to join the waitlist, and how will I be notified?", "a": "No payment is required while on the waitlist. Simply fill out your name, email, and phone number on our registration form. We will reach out to you via email or SMS with instructions if additional seating capacity becomes available."}
      ]
    },
    {
      "category": "Payment & Ticket Verification",
      "items": [
        {"q": "How do I pay and complete my registration?", "a": "While registering (if seats are under the 500 limit), you will see our bank transfer details and UPI QR code. Complete the transaction using your preferred UPI app or banking portal, copy the transaction reference number (UTR/Txn ID), and enter it in the form. Our volunteer team will manually verify this number against our bank statements before issuing your ticket."},
        {"q": "How long does it take to receive my ticket after payment?", "a": "Because our payment verification process is manual, it typically takes 24 to 48 hours. Once verified, a digital ticket containing a unique entry code/QR code will be emailed to you automatically. Please check your Spam/Promotions folder if you do not see it within 2 days."},
        {"q": "Can I register on-the-spot at the venue?", "a": "No. Registrations must be completed online in advance. Spot registrations at the venue on October 31 will not be available."},
        {"q": "Can I get a refund if I cannot attend?", "a": "Registrations are non-refundable. However, you may forward your digital ticket PDF to a friend or family member, who will be permitted entry upon presenting the ticket at the gate."}
      ]
    },
    {
      "category": "Transit, Parking & Entry Rules",
      "items": [
        {"q": "Is parking available at the venue?", "a": "Parking inside the Math premises is extremely limited and reserved exclusively for monastics, volunteers, and senior citizens. We strongly advise against bringing four-wheelers. Any vehicle parked outside the Math on SV Road or nearby streets is at the owner''s risk."},
        {"q": "What is the best way to reach the venue using public transport?", "a": "We highly encourage using the Namma Metro. The Halasuru Metro Station on the Purple Line is just 540 meters from the Math (about a 5-to-7-minute walk). You can also take any BMTC bus going towards Ulsoor/Lido and alight at the Halasuru Police Station or Trinity Circle stops."},
        {"q": "What time should I arrive, and what do I need for entry?", "a": "The gates and check-in desks open at 5:00 PM, and the lecture starts promptly at 6:00 PM. Please arrive early and be seated by 5:45 PM. Have your digital or printed ticket QR code ready at the gate for scanning."},
        {"q": "Are children allowed to attend the lecture?", "a": "To ensure a quiet and meditative environment, we request that children under the age of 10 not be brought into the lecture hall."}
      ]
    }
  ]'::jsonb,

  venue_maps_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.892601712217!2d77.62511697507657!3d12.980311087335688!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae166299999999%3A0xc3e407ea37cb4229!2sRamakrishna%20Math%20Ulsoor!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin',

  parking_info = '[
    {"text": "Parking inside the Math premises is extremely limited and reserved exclusively for monastics, volunteers, and senior citizens. Please avoid bringing four-wheelers — any vehicle parked outside the Math on SV Road or nearby streets is at the owner''s risk."},
    {"label": "Metro (recommended):", "text": "Halasuru Metro Station on the Purple Line is just 540 meters away (a 5–7 minute walk)."},
    {"label": "Bus:", "text": "Any BMTC bus toward Ulsoor/Lido — alight at Halasuru Police Station or Trinity Circle."}
  ]'::jsonb,

  contact_email = 'amjain.gzb@gmail.com',
  contact_phone = '9731007760',
  contact_whatsapp_number = '9731007760'
where slug = 'halasuru-sarvapriyananda-2026';

-- New columns join the existing events table, which already has
-- service_role SELECT/INSERT/UPDATE grants (0001_init.sql, 0005) — no new
-- grants needed here. The Supabase Storage bucket for hero/speaker photos
-- (docs/content-editability-design.md's "Photo hosting decision") is a
-- separate piece of infra, not schema — tracked as a follow-up, not part
-- of this migration. hero_photo_url/speaker_json.photoUrl above still
-- point at the existing public/images/ paths as an interim value so
-- nothing breaks visually before that bucket exists; swap them to the
-- real Storage URLs once photos are uploaded there.
