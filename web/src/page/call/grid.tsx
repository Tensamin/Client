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

// Helper Functions
function calculateOptimalLayout(
  count: number,
  containerWidth: number,
  containerHeight: number,
  gap: number = 16,
  aspectRatio: number = 16 / 9,
) {
  if (count === 0) return { width: 0, height: 0, cols: 0 };

  let bestWidth = 0;
  let bestHeight = 0;
  let bestCols = 1;

  // Try all possible column counts
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);

    // Calculate max width based on column constraints
    const maxW = (containerWidth - (cols - 1) * gap) / cols;

    // Calculate max height based on row constraints
    const maxH = (containerHeight - (rows - 1) * gap) / rows;

    if (maxW <= 0 || maxH <= 0) continue;

    // Determine dimensions based on aspect ratio
    let w = maxW;
    let h = w / aspectRatio;

    // Check if height fits, if not, scale down
    if (h > maxH) {
      h = maxH;
      w = h * aspectRatio;
    }

    // Maximize area
    if (w > bestWidth) {
      bestWidth = w;
      bestHeight = h;
      bestCols = cols;
    }
  }

  return { width: bestWidth, height: bestHeight, cols: bestCols };
}

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
        className="absolute inset-0 flex items-center justify-center py-6 overflow-hidden"
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
