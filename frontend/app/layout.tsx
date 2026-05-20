import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Syne } from "next/font/google";
import CursorTrail from "./CursorTrail";
import "./globals.css";

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const serifFont = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Ghosla — Find your perfect home",
  description:
    "Describe your ideal rental once. We search 99acres, NoBroker, and MagicBricks and return your best matches.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${serifFont.variable} min-h-full`}
      >
        <CursorTrail />
        {children}
      </body>
    </html>
  );
}
