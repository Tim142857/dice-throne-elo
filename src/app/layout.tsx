import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dice Throne Elo",
    template: "%s · Dice Throne Elo",
  },
  description:
    "Classements Elo publics pour Dice Throne : matchs 1 contre 1, validation mutuelle et statistiques.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <SiteHeader />
        <div id="contenu" className="flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
