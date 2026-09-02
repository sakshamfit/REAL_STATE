import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { company } from "@/lib/data/content";

export const metadata: Metadata = {
  title: {
    default: `${company.name} — Engineering Trust. Constructing Excellence.`,
    template: `%s · ${company.shortName}`,
  },
  description:
    "Rudra Constructions & Suppliers — civil & structural construction, residential and commercial projects, infrastructure, solar & renewable energy, renovation and building-material supply.",
  keywords: [
    "Rudra Constructions & Suppliers",
    "civil construction Bihar",
    "infrastructure construction",
    "solar installation Assam",
    "building material supplier Patna",
  ],
  applicationName: company.shortName,
  openGraph: {
    title: company.name,
    description: company.tagline,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <head>
        {/* Local-only font stack: no third-party font requests. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{
              --font-display:"Inter","Helvetica Neue",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
              --font-tech:ui-monospace,"SF Mono","JetBrains Mono","IBM Plex Mono",Menlo,Consolas,monospace;
            }`,
          }}
        />
      </head>
      <body className="min-h-full bg-ink text-chalk">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
