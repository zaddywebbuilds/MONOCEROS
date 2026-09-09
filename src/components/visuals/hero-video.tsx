"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Footage panels.
 *
 * Decorative throughout: the copy beside each one carries the meaning, so the
 * video is hidden from assistive technology and taken out of the tab order.
 *
 * Every clip is muted — by attribute and again by property, and the audio track
 * is stripped from the files themselves — because nothing on a marketing page
 * should ever make noise. A poster frame stands in until the video has loaded so
 * a panel is never empty, and anyone who has asked for reduced motion keeps that
 * still frame instead of playback.
 *
 * The source files are portrait, so panels crop rather than stretch them.
 */
export function VideoPanel({
  src,
  poster,
  className,
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // React does not reliably reflect the muted attribute onto the property, and
    // an unmuted video is refused autoplay anyway. Set it directly.
    el.muted = true;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      if (query.matches) {
        el.pause();
        el.currentTime = 0;
      } else {
        // Autoplay can still be refused; the poster simply remains, which is fine.
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
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export function HeroVideo({ className }: { className?: string }) {
  return (
    <VideoPanel
      src="/media/hero.mp4"
      poster="/media/hero-poster.jpg"
      className={className}
    />
  );
}
