import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { EnvironmentBanner } from "@/components/EnvironmentBanner";
import { shouldShowEnvironmentBanner } from "@/lib/environmentBanner";
import "./globals.css";

export const dynamic = "force-dynamic";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Swami Sarvapriyananda at Ramakrishna Math Halasuru",
  description: "Registration for Swami Sarvapriyananda's visit, 31 Oct 2026",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const showBanner = await shouldShowEnvironmentBanner();

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-cream text-ink font-sans">
        {showBanner && <EnvironmentBanner />}
        {children}
      </body>
    </html>
  );
}
