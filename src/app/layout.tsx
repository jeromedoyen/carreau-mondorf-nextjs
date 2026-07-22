import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carreau Mondorf — Compétition",
  description: "Carreau Boules et Pétanque Mondorf a.s.b.l. — National D2 & Promotion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${oswald.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--fond)] text-[var(--encre)]">
        <div className="ribbon" />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
