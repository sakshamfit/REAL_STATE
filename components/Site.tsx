"use client";

import { Loader } from "@/components/Loader";
import { Nav } from "@/components/Nav";
import { HeroSection } from "@/components/hero/HeroSection";
import { AboutSection } from "@/components/about/AboutSection";
import { ServicesSection } from "@/components/services/ServicesSection";
import { ProcessSection } from "@/components/process/ProcessSection";
import { TrustSection } from "@/components/trust/TrustSection";
import { ClientsSection } from "@/components/clients/ClientsSection";
import { MapSection } from "@/components/map/MapSection";
import { ContactSection } from "@/components/cta/ContactSection";

export function Site() {
  return (
    <>
      <Loader />
      <Nav />
      <main>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <ProcessSection />
        <TrustSection />
        <ClientsSection />
        <MapSection />
        <ContactSection />
      </main>
    </>
  );
}
