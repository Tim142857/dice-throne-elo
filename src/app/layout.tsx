import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { NavigationProgress } from "@/components/layout/navigation-progress";
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
  icons: {
    icon: "/images/logo.avif",
    apple: "/images/logo.avif",
  },
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
      <body className="app-background flex min-h-full flex-col text-zinc-900">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <SiteHeader />
        <div id="contenu" className="flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
