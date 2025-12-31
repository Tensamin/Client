// Package Imports
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { isTrackReference } from "@livekit/components-core";
import { FocusLayout, ParticipantTile } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useMemo, useRef, useState } from "react";

// Lib Imports
import { calculateOptimalLayout } from "@/lib/utils";

// Components
import { FocusDuplicateOverlay, TileContent } from "./modals/wrapper";

// Helper Functions
function getTrackKey(track: TrackReferenceOrPlaceholder) {
  if (isTrackReference(track)) {
    return (
      track.publication?.trackSid ??
      `${track.participant.identity}-${track.source ?? Track.Source.Camera}`
    );
  }

  return `${track.participant.identity}-${track.source ?? Track.Source.Camera}`;
}

// Context
import { useCallPageContext } from "./context";

// Main
export function CallFocus() {
  const {
    focusedTrackRef,
    participantTracks,
    focusedTrackSid,
    handleParticipantClick,
    hideParticipants,
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
          <TileContent hideBadges />
        </FocusLayout>
        {!hideParticipants && (
          <div className="w-full max-w-5xl">
            <div className="h-37 flex items-center justify-center gap-3 overflow-x-auto px-2">
              {participantTracks.map((track) => (
                <ParticipantTile
                  key={getTrackKey(track)}
                  trackRef={track}
                  disableSpeakingIndicator
                  onParticipantClick={handleParticipantClick}
                  className="relative h-full aspect-video flex-none rounded-xl"
                >
                  <TileContent />
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
