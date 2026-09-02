"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * WebGL context budget.
 *
 * This page has nine canvases. Browsers cap live WebGL contexts (commonly
 * 8–16) and silently drop the oldest ones past that limit, which shows up as a
 * blank canvas with no error anywhere. So only the nearest few canvases stay
 * mounted: each one claims a slot while it is on screen and releases it when it
 * scrolls away, keeping the live context count bounded.
 *
 * Claims are re-asserted on scroll, so a canvas the user returns to always wins
 * the slot back from one that is now off screen.
 */
const MAX_LIVE_CONTEXTS = 4;
const SLOT_EVENT = "rudra:canvas-slot";

const order: symbol[] = [];

function claim(id: symbol) {
  const at = order.indexOf(id);
  if (at !== -1) order.splice(at, 1);
  order.push(id);
  order.splice(0, Math.max(0, order.length - MAX_LIVE_CONTEXTS));
}

function release(id: symbol) {
  const at = order.indexOf(id);
  if (at !== -1) order.splice(at, 1);
}

function announce() {
  window.dispatchEvent(new Event(SLOT_EVENT));
}

export function useContextGate<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const id = useRef<symbol>(Symbol("canvas"));
  const visible = useRef(false);
  const [active, setActive] = useState(false);

  const evaluate = useCallback(() => {
    if (visible.current && !order.includes(id.current)) {
      claim(id.current);
      announce();
    }
    setActive(order.includes(id.current));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const myId = id.current;

    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        evaluate();
      },
      { rootMargin: "8% 0px 8% 0px", threshold: 0 },
    );
    io.observe(el);

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        evaluate();
      });
    };

    window.addEventListener(SLOT_EVENT, evaluate);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener(SLOT_EVENT, evaluate);
      window.removeEventListener("scroll", onScroll);
      release(myId);
      announce();
    };
  }, [evaluate]);

  return { ref, active };
}

export const contextBudget = MAX_LIVE_CONTEXTS;
