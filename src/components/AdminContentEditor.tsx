"use client";

import { useState } from "react";
import type { ContentArea, RawContentRow } from "@/lib/content/getEventContent";
import type { AgendaItem, FaqCategory, ParkingBullet } from "@/lib/content/types";

const TABS: { area: ContentArea; label: string }[] = [
  { area: "hero", label: "Hero" },
  { area: "agenda", label: "Agenda" },
  { area: "speaker", label: "Speaker" },
  { area: "faq", label: "FAQ" },
  { area: "venue", label: "Venue & Parking" },
  { area: "contact", label: "Contact" },
];

const inputClass = "w-full border rounded px-2 py-1.5 text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const sectionClass = "border rounded-lg p-3 space-y-2 bg-gray-50";
const smallBtn = "text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100";

async function saveArea(area: ContentArea, data: Record<string, unknown>) {
  const res = await fetch("/api/admin/content", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ area, data }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Save failed");
}

function SaveBar({
  saving,
  error,
  saved,
  onSave,
}: {
  saving: boolean;
  error: string | null;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-4 py-1.5 rounded bg-maroon text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      {saved && <span className="text-green-700 text-xs">Saved — live immediately.</span>}
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  );
}

function useAreaSave(area: ContentArea) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function run(data: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveArea(area, data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, saved, run };
}

function HeroTab({ initial }: { initial: RawContentRow }) {
  const [title, setTitle] = useState(initial.title);
  const [badge, setBadge] = useState(initial.hero_badge_text ?? "");
  const [date, setDate] = useState(initial.hero_date_label ?? "");
  const [time, setTime] = useState(initial.hero_time_label ?? "");
  const [venue, setVenue] = useState(initial.hero_venue_label ?? "");
  const [cta, setCta] = useState(initial.hero_cta_text ?? "");
  const [photo, setPhoto] = useState(initial.hero_photo_url ?? "");
  const { saving, error, saved, run } = useAreaSave("hero");

  return (
    <div className="space-y-3">
      <label className={labelClass}>
        Title (H1)
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className={labelClass}>
        Badge text (small eyebrow above the title)
        <input className={inputClass} value={badge} onChange={(e) => setBadge(e.target.value)} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className={labelClass}>
          Date chip
          <input className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className={labelClass}>
          Time chip
          <input className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className={labelClass}>
          Venue chip
          <input className={inputClass} value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
      </div>
      <label className={labelClass}>
        CTA button text
        <input className={inputClass} value={cta} onChange={(e) => setCta(e.target.value)} />
      </label>
      <label className={labelClass}>
        Hero photo URL (path under public/images, or a full URL)
        <input className={inputClass} value={photo} onChange={(e) => setPhoto(e.target.value)} />
      </label>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run({
            title,
            hero_badge_text: badge,
            hero_date_label: date,
            hero_time_label: time,
            hero_venue_label: venue,
            hero_cta_text: cta,
            hero_photo_url: photo,
          })
        }
      />
    </div>
  );
}

function AgendaTab({ initial }: { initial: RawContentRow }) {
  const [items, setItems] = useState<AgendaItem[]>(initial.agenda_json ?? []);
  const { saving, error, saved, run } = useAreaSave("agenda");

  function update(i: number, patch: Partial<AgendaItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className={`${sectionClass} flex gap-2 items-start`}>
          <input
            className={`${inputClass} w-32`}
            value={item.time}
            onChange={(e) => update(i, { time: e.target.value })}
            placeholder="5:00 PM"
          />
          <input
            className={inputClass}
            value={item.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Gates & Check-in Open"
          />
          <button
            type="button"
            className={smallBtn}
            onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={smallBtn}
        onClick={() => setItems((prev) => [...prev, { time: "", title: "" }])}
      >
        + Add row
      </button>
      <SaveBar saving={saving} error={error} saved={saved} onSave={() => run({ agenda_json: items })} />
    </div>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
  multiline,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      {items.map((val, i) => (
        <div key={i} className="flex gap-2 items-start">
          {multiline ? (
            <textarea
              className={inputClass}
              rows={3}
              value={val}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
            />
          ) : (
            <input
              className={inputClass}
              value={val}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
            />
          )}
          <button
            type="button"
            className={smallBtn}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={smallBtn} onClick={() => onChange([...items, ""])}>
        + Add
      </button>
    </div>
  );
}

function SpeakerTab({ initial }: { initial: RawContentRow }) {
  const [name, setName] = useState(initial.speaker);
  const [photo, setPhoto] = useState(initial.speaker_json?.photoUrl ?? "");
  const [highlights, setHighlights] = useState(initial.speaker_json?.highlights ?? []);
  const [fullBio, setFullBio] = useState(initial.speaker_json?.fullBio ?? []);
  const { saving, error, saved, run } = useAreaSave("speaker");

  return (
    <div className="space-y-4">
      <label className={labelClass}>
        Name
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={labelClass}>
        Photo URL
        <input className={inputClass} value={photo} onChange={(e) => setPhoto(e.target.value)} />
      </label>
      <div>
        <p className={labelClass}>Highlight bullets</p>
        <ListEditor items={highlights} onChange={setHighlights} multiline />
      </div>
      <div>
        <p className={labelClass}>Full bio paragraphs (shown on &quot;Read full bio&quot;)</p>
        <ListEditor items={fullBio} onChange={setFullBio} multiline />
      </div>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run({
            speaker: name,
            speaker_json: { highlights, fullBio, photoUrl: photo },
          })
        }
      />
    </div>
  );
}

function FaqTab({ initial }: { initial: RawContentRow }) {
  const [categories, setCategories] = useState<FaqCategory[]>(initial.faq_json ?? []);
  const { saving, error, saved, run } = useAreaSave("faq");

  function updateCategory(ci: number, patch: Partial<FaqCategory>) {
    setCategories((prev) => prev.map((c, i) => (i === ci ? { ...c, ...patch } : c)));
  }

  function updateItem(ci: number, ii: number, patch: Partial<{ q: string; a: string }>) {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, items: c.items.map((it, idx) => (idx === ii ? { ...it, ...patch } : it)) } : c
      )
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((cat, ci) => (
        <div key={ci} className={sectionClass}>
          <div className="flex gap-2 items-center">
            <input
              className={`${inputClass} font-medium`}
              value={cat.category}
              onChange={(e) => updateCategory(ci, { category: e.target.value })}
            />
            <button
              type="button"
              className={smallBtn}
              onClick={() => setCategories((prev) => prev.filter((_, i) => i !== ci))}
            >
              Remove category
            </button>
          </div>
          <div className="space-y-3 pl-3 border-l-2 border-gold/30">
            {cat.items.map((item, ii) => (
              <div key={ii} className="space-y-1">
                <input
                  className={inputClass}
                  value={item.q}
                  placeholder="Question"
                  onChange={(e) => updateItem(ci, ii, { q: e.target.value })}
                />
                <textarea
                  className={inputClass}
                  rows={2}
                  value={item.a}
                  placeholder="Answer"
                  onChange={(e) => updateItem(ci, ii, { a: e.target.value })}
                />
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() =>
                    updateCategory(ci, { items: cat.items.filter((_, idx) => idx !== ii) })
                  }
                >
                  Remove question
                </button>
              </div>
            ))}
            <button
              type="button"
              className={smallBtn}
              onClick={() => updateCategory(ci, { items: [...cat.items, { q: "", a: "" }] })}
            >
              + Add question
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={smallBtn}
        onClick={() => setCategories((prev) => [...prev, { category: "", items: [] }])}
      >
        + Add category
      </button>
      <SaveBar saving={saving} error={error} saved={saved} onSave={() => run({ faq_json: categories })} />
    </div>
  );
}

function VenueTab({ initial }: { initial: RawContentRow }) {
  const [venueName, setVenueName] = useState(initial.venue_name);
  const [venueAddress, setVenueAddress] = useState(initial.venue_address);
  const [mapsUrl, setMapsUrl] = useState(initial.venue_maps_embed_url ?? "");
  const [parking, setParking] = useState<ParkingBullet[]>(initial.parking_info ?? []);
  const { saving, error, saved, run } = useAreaSave("venue");

  function update(i: number, patch: Partial<ParkingBullet>) {
    setParking((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-3">
      <label className={labelClass}>
        Venue name
        <input className={inputClass} value={venueName} onChange={(e) => setVenueName(e.target.value)} />
      </label>
      <label className={labelClass}>
        Venue address
        <input
          className={inputClass}
          value={venueAddress}
          onChange={(e) => setVenueAddress(e.target.value)}
        />
      </label>
      <label className={labelClass}>
        Google Maps embed URL
        <input className={inputClass} value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
      </label>
      <div>
        <p className={labelClass}>Parking & transit bullets</p>
        <div className="space-y-2">
          {parking.map((bullet, i) => (
            <div key={i} className={`${sectionClass} space-y-1`}>
              <input
                className={inputClass}
                value={bullet.label ?? ""}
                placeholder="Label (optional, e.g. 'Metro (recommended):')"
                onChange={(e) => update(i, { label: e.target.value || undefined })}
              />
              <textarea
                className={inputClass}
                rows={2}
                value={bullet.text}
                placeholder="Bullet text"
                onChange={(e) => update(i, { text: e.target.value })}
              />
              <button
                type="button"
                className={smallBtn}
                onClick={() => setParking((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className={smallBtn}
            onClick={() => setParking((prev) => [...prev, { text: "" }])}
          >
            + Add bullet
          </button>
        </div>
      </div>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run({
            venue_name: venueName,
            venue_address: venueAddress,
            venue_maps_embed_url: mapsUrl,
            parking_info: parking,
          })
        }
      />
    </div>
  );
}

function ContactTab({ initial }: { initial: RawContentRow }) {
  const [email, setEmail] = useState(initial.contact_email ?? "");
  const [phone, setPhone] = useState(initial.contact_phone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial.contact_whatsapp_number ?? "");
  const { saving, error, saved, run } = useAreaSave("contact");

  return (
    <div className="space-y-3">
      <label className={labelClass}>
        Email
        <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className={labelClass}>
        Phone (10 digits, no country code)
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label className={labelClass}>
        WhatsApp number (10 digits, no country code)
        <input className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      </label>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run({ contact_email: email, contact_phone: phone, contact_whatsapp_number: whatsapp })
        }
      />
    </div>
  );
}

export default function AdminContentEditor({ initial }: { initial: RawContentRow }) {
  const [tab, setTab] = useState<ContentArea>("hero");

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex gap-1 border-b mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.area}
            type="button"
            onClick={() => setTab(t.area)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.area
                ? "border-maroon text-maroon"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "hero" && <HeroTab initial={initial} />}
      {tab === "agenda" && <AgendaTab initial={initial} />}
      {tab === "speaker" && <SpeakerTab initial={initial} />}
      {tab === "faq" && <FaqTab initial={initial} />}
      {tab === "venue" && <VenueTab initial={initial} />}
      {tab === "contact" && <ContactTab initial={initial} />}
    </div>
  );
}
