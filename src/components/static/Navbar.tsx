"use client";

import { useState } from "react";

const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#agenda", label: "Agenda" },
  { href: "#speakers", label: "Speakers" },
  { href: "#venue", label: "Venue" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur border-b border-gold/30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#home" className="font-display text-xl font-semibold text-maroon">
          Ramakrishna Math Halasuru
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/80 hover:text-maroon transition"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#register"
            className="text-sm font-medium bg-saffron hover:bg-saffron-dark text-white px-4 py-2 rounded-full transition"
          >
            Register
          </a>
        </nav>

        <button
          type="button"
          className="md:hidden text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-gold/30 bg-cream px-4 py-3 flex flex-col gap-3">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/80"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#register"
            className="text-sm font-medium bg-saffron text-white px-4 py-2 rounded-full text-center"
            onClick={() => setOpen(false)}
          >
            Register
          </a>
        </nav>
      )}
    </header>
  );
}
