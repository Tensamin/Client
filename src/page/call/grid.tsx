// Package Imports
import { ParticipantTile } from "@livekit/components-react";
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { getTrackReferenceId } from "@livekit/components-core";

// Lib Imports
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

// Components
import { TileContent } from "@/page/call";

// Main
export function CallGrid({
  participantTracks,
  onParticipantClick,
  className,
  tileClassName,
}: {
  participantTracks: TrackReferenceOrPlaceholder[];
  onParticipantClick: (event: ParticipantClickEvent) => void;
  className?: string;
  tileClassName?: string;
}) {
  // container ref to handle responsive layout calculations
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = useMemo(() => {
    const n = participantTracks.length;
    if (n <= 1) return 1;
    if (n === 2) return containerSize.width > containerSize.height ? 2 : 1;
    // prefer square-ish grid, but increase columns on wide screens
    const base = Math.ceil(Math.sqrt(n));
    if (containerSize.width > containerSize.height * 1.25) {
      return Math.min(n, Math.max(2, Math.ceil(n / 2)));
    }
    return base;
  }, [participantTracks.length, containerSize]);

  return (
    <div className={cn("h-full w-full flex items-center justify-center py-6", className)}>
      {/*
        Use a simple responsive CSS grid for track tiles. Compute columns
        dynamically based on number of tracks. Passing `trackRef` and
        `key` for each `ParticipantTile` ensures React properly re-renders
        tiles when `participantTracks` changes (no remount needed).
      */}
      <div
        ref={containerRef}
        className="h-full w-full grid gap-4 items-stretch"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
        }}
      >
        {participantTracks.map((track) => (
          <ParticipantTile
            key={getTrackReferenceId(track)}
            trackRef={track}
            disableSpeakingIndicator
            onParticipantClick={onParticipantClick}
            className={cn("aspect-video relative border-0", tileClassName)}
          >
            <TileContent />
          </ParticipantTile>
        ))}
      </div>
    </div>
  );
}
