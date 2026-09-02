import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import { SmoothScroll } from "@/lib/smooth-scroll";

export const metadata: Metadata = {
  title: "Rudra Constructions & Suppliers — Engineering Trust. Constructing Excellence.",
  description:
    "Rudra Constructions & Suppliers — civil & structural construction, residential and commercial projects, infrastructure, solar & renewable energy, renovation and building-material supply across India.",
  keywords: [
    "Rudra Constructions",
    "construction company",
    "civil construction India",
    "infrastructure Bihar",
    "solar energy contractor",
    "building material supplier",
  ],
  openGraph: {
    title: "Rudra Constructions & Suppliers",
    description: "Engineering Trust. Constructing Excellence. Building the future with strength, integrity & innovation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ink text-bone antialiased">
      <body className="noise bg-ink text-bone">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
