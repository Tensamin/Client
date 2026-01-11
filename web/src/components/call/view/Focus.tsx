// Package Imports
import { FocusLayout, ParticipantTile } from "@livekit/components-react";
import { useEffect, useMemo, useRef, useState } from "react";

// Lib Imports
import { calculateOptimalLayout } from "@/lib/utils";

// Components
import Tile, { FocusDuplicateOverlay } from "../components/Tile";

// Context
import { useCallPageContext } from "../context";

// Main
export default function Focus() {
  const {
    focusedTrackRef,
    participantTracks,
    focusedTrackSid,
    handleParticipantClick,
    hideParticipants,
    openPopout,
  } = useCallPageContext();
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
      1,
      containerSize.width,
      hideParticipants
        ? Math.max(0, containerSize.height - 70)
        : Math.max(0, containerSize.height - 230),
      16, // gap-4
    );
  }, [containerSize, hideParticipants]);

  if (!focusedTrackRef) return;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 -z-10" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <FocusLayout
          trackRef={focusedTrackRef}
          onParticipantClick={handleParticipantClick}
          className="relative border-0"
          style={{
            width: layout.width,
            height: layout.height,
          }}
        >
          <Tile
            containerSize={containerSize}
            hideBadges
            onPopout={openPopout}
          />
        </FocusLayout>
        {!hideParticipants && (
          <div className="w-full max-w-5xl">
            <div className="h-37 flex items-center justify-center gap-3 overflow-x-auto px-2">
              {participantTracks.map((track, index) => (
                <ParticipantTile
                  key={index}
                  trackRef={track}
                  disableSpeakingIndicator
                  onParticipantClick={handleParticipantClick}
                  className="relative h-full aspect-video flex-none"
                >
                  <Tile onPopout={openPopout} />
                  <FocusDuplicateOverlay focusedTrackSid={focusedTrackSid} />
                </ParticipantTile>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
