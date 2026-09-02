"use client";

import { type ReactNode } from "react";
import { MotionProvider } from "@/lib/motion";
import SmoothScroll from "@/components/SmoothScroll";
import Nav from "@/components/ui/Nav";
import Loader from "@/components/ui/Loader";
import ProgressRail from "@/components/ui/ProgressRail";
import ChapterRail from "@/components/ui/ChapterRail";
import DevDiagnostics from "@/components/ui/DevDiagnostics";

/** Client-only shell: providers + persistent chrome (nav, loader, rail). */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <SmoothScroll />
      <Loader />
      <Nav />
      <ChapterRail />
      <ProgressRail />
      <DevDiagnostics />
      {children}
    </MotionProvider>
  );
}
