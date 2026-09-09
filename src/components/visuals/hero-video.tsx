"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The hero's background footage.
 *
 * Decorative: the headline beside it carries the meaning, so it is hidden from
 * assistive technology and taken out of the tab order. It is always muted — the
 * file has an audio track and nothing on a landing page should ever make noise —
 * and a poster frame stands in until it has loaded, so the panel is never empty.
 *
 * Anyone who has asked for reduced motion gets the still frame instead: the
 * media query is honoured on mount and again if the preference changes.
 */
export function HeroVideo({ className }: { className?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // React does not always reflect the muted attribute onto the property, and
    // an unmuted video is refused autoplay anyway. Set it directly.
    el.muted = true;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      if (query.matches) {
        el.pause();
        el.currentTime = 0;
      } else {
        // Autoplay can still be refused; the poster remains, which is fine.
        void el.play().catch(() => undefined);
      }
    };

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      className={cn("size-full object-cover", className)}
      poster="/media/hero-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      tabIndex={-1}
    >
      <source src="/media/hero.mp4" type="video/mp4" />
    </video>
  );
}
