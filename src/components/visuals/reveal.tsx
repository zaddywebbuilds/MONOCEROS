"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Reveals its subtree the first time it scrolls into view.
 *
 * The children stay server-rendered: this only flips `data-revealed` on the
 * wrapper, and `globals.css` drives the transitions from the `data-reveal`
 * markers placed inside. Each marked element reads a `--reveal-delay` custom
 * property, which is how a section staggers its children.
 *
 * Content is revealed by default and only hidden once this has mounted and
 * confirmed the block is still below the fold. Hiding something the reader
 * cannot see yet costs nothing, and it means no failure of ours can leave the
 * page blank: without JavaScript, without an IntersectionObserver, or with
 * hydration broken by a browser extension, the markup shows as rendered.
 * `prefers-reduced-motion` is honoured in the stylesheet.
 */
export function Reveal({
  children,
  className,
  rootMargin = "0px 0px -10% 0px",
}: {
  children: React.ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = React.useState(true);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    // Already on screen: it has been seen, so there is nothing left to reveal.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    setRevealed(false);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} data-revealed={revealed} className={cn("reveal", className)}>
      {children}
    </div>
  );
}
