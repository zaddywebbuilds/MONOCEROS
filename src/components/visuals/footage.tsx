import * as React from "react";

import { cn } from "@/lib/utils";
import { VideoPanel } from "@/components/visuals/hero-video";

/**
 * Framed footage panels used through the marketing pages.
 *
 * The clips are portrait phone recordings, so each panel crops to a shape that
 * suits its column rather than stretching the source, and a gradient sinks the
 * bottom edge into the page instead of ending on a hard line.
 */
function Framed({
  src,
  poster,
  className,
  aspect = "aspect-[16/10] lg:aspect-[4/5]",
}: {
  src: string;
  poster: string;
  className?: string;
  aspect?: string;
}) {
  return (
    <div className={cn("surface relative overflow-hidden", aspect, className)}>
      <VideoPanel src={src} poster={poster} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink-600/50"
      />
    </div>
  );
}

/** Execution running on the external trading infrastructure. */
export function ExecutionFootage({ className }: { className?: string }) {
  return (
    <Framed
      src="/media/market-execution.mp4"
      poster="/media/market-execution-poster.jpg"
      className={className}
    />
  );
}

/** Positions open across the markets the external operation covers. */
export function PositionsFootage({ className }: { className?: string }) {
  return (
    <Framed
      src="/media/market-positions.mp4"
      poster="/media/market-positions-poster.jpg"
      className={className}
    />
  );
}

/** The operation being monitored. */
export function MonitoringFootage({ className }: { className?: string }) {
  return (
    <Framed
      src="/media/market-monitoring.mp4"
      poster="/media/market-monitoring-poster.jpg"
      className={className}
    />
  );
}
