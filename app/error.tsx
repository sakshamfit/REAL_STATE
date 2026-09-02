"use client";

import { useCallback, useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      fetch("/api/client-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "app-error", message: String(error?.message ?? error), digest: error?.digest, stack: String(error?.stack ?? "").slice(0, 2000) }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [error]);

  const retry = useCallback(() => reset(), [reset]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center border border-accent/70 font-display text-3xl font-700 text-accent">R</div>
      <h1 className="mt-8 font-display text-3xl font-600 text-bone sm:text-4xl">Engineering trust — even here.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ash">
        Something interrupted the experience. Reload to continue — if it persists, reach us at
        <br />
        <span className="font-mono text-xs text-accent">rudraconstructionsupplier14@gmail.com</span>
      </p>
      <button onClick={retry} className="btn-primary mt-8">
        Reload experience
      </button>
    </div>
  );
}
