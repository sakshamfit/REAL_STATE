import Hero from "@/sections/Hero";
import About from "@/sections/About";
import Services from "@/sections/Services";
import Process from "@/sections/Process";
import Trust from "@/sections/Trust";
import Clients from "@/sections/Clients";
import Presence from "@/sections/Presence";
import Contact from "@/sections/Contact";
import NoWebGLNote from "@/components/ui/NoWebGLNote";

/**
 * Page order follows the client-approved journey:
 * landing → 3D construction → about → services → process → quality →
 * clients → 3D India map → CTA.
 */
export default function Home() {
  return (
    <>
      <NoWebGLNote />
      <Hero />
      <About />
      <Services />
      <Process />
      <Trust />
      <Clients />
      <Presence />
      <Contact />
    </>
  );
}
