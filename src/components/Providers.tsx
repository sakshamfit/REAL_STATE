"use client";

import { type ReactNode } from "react";
import { MotionProvider } from "@/lib/motion";
import SmoothScroll from "@/components/SmoothScroll";
import Nav from "@/components/ui/Nav";
import BootOverlay from "@/components/ui/BootOverlay";
import ProgressRail from "@/components/ui/ProgressRail";

/** Client-only shell: providers + persistent chrome (nav, loader, rail). */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <SmoothScroll />
      <BootOverlay />
      <Nav />
      <ProgressRail />
      {children}
    </MotionProvider>
  );
}
