import type { Metadata } from "next";
import { Fraunces, Bebas_Neue, Work_Sans } from "next/font/google";
import { NavBar } from "@/components/NavBar";
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
      <body className="flex min-h-full flex-col bg-sable text-encre">
        <div className="grain" />
        <div className="ribbon" />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
