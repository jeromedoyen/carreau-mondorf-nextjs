import type { Metadata, Viewport } from "next";
import { Fraunces, Bebas_Neue, Work_Sans } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-worksans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Carreau Mondorf — Compétition",
    template: "%s — Carreau Mondorf",
  },
  description: "Carreau Boules et Pétanque Mondorf a.s.b.l. — National D2 & Promotion",
};

// viewportFit: 'cover' — la barre de navigation mobile en bas d'écran
// (BottomNav.tsx) utilise env(safe-area-inset-bottom) pour respecter la
// zone de gestes iOS ; sans ce réglage, safe-area-inset-* vaut toujours 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${bebas.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-sable pb-[calc(64px+env(safe-area-inset-bottom))] text-encre md:pb-0">
        <div className="grain" />
        <div className="ribbon" />
        <NavBar />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
