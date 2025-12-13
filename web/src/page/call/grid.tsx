// Package Imports
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { getTrackReferenceId } from "@livekit/components-core";
import { ParticipantTile } from "@livekit/components-react";

// Lib Imports
import { calculateOptimalLayout, cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

// Components
import { TileContent } from "@/page/call";

// Main
export function CallGrid({
  participantTracks,
  onParticipantClick,
  className,
}: {
  participantTracks: TrackReferenceOrPlaceholder[];
  onParticipantClick: (event: ParticipantClickEvent) => void;
  className?: string;
}) {
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

  const layout = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return { width: 0, height: 0, cols: 1 };
    }
    return calculateOptimalLayout(
      participantTracks.length,
      containerSize.width,
      containerSize.height,
      16, // gap-4
    );
  }, [participantTracks.length, containerSize]);

  return (
    <div className={cn("h-full w-full relative", className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center py-7 overflow-hidden"
      >
        <div className="flex flex-wrap justify-center gap-4 max-w-full max-h-full">
          {participantTracks.map((track) => (
            <div
              key={getTrackReferenceId(track)}
              style={{
                width: layout.width,
                height: layout.height,
              }}
            >
              <ParticipantTile
                trackRef={track}
                disableSpeakingIndicator
                onParticipantClick={onParticipantClick}
                className={
                  "w-full h-full relative border-0 flex justify-center items-center"
                }
              >
                <TileContent />
              </ParticipantTile>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
