// Package Imports
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { isTrackReference } from "@livekit/components-core";
import { FocusLayout, ParticipantTile } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useMemo, useRef, useState } from "react";

// Lib Imports
import { calculateOptimalLayout } from "@/lib/utils";

// Components
import { FocusDuplicateOverlay, TileContent } from "@/page/call";

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

// Main
export function CallFocus({
  focusedTrackRef,
  participantTracks,
  focusedTrackSid,
  onParticipantClick,
}: {
  focusedTrackRef?: TrackReferenceOrPlaceholder;
  participantTracks: TrackReferenceOrPlaceholder[];
  focusedTrackSid: string | null;
  onParticipantClick: (event: ParticipantClickEvent) => void;
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
      1,
      containerSize.width,
      containerSize.height,
      16 // gap-4
    );
  }, [containerSize]);

  console.log(layout);

  if (!focusedTrackRef) return;

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3"
      ref={containerRef}
    >
      <FocusLayout
        trackRef={focusedTrackRef}
        onParticipantClick={onParticipantClick}
        className="relative aspect-video border-0"
        style={{
          width: layout.width / 1.2,
          height: layout.height / 1.2,
        }}
      >
        <TileContent hideBadges />
      </FocusLayout>
      <div className="w-full max-w-5xl">
        <div className="h-30 flex items-center justify-center gap-3 overflow-x-auto px-2">
          {participantTracks.map((track) => (
            <ParticipantTile
              key={getTrackKey(track)}
              trackRef={track}
              disableSpeakingIndicator
              onParticipantClick={onParticipantClick}
              className="relative h-full aspect-video flex-none rounded-lg"
            >
              {/* CallModal from @/.../raw.tsx */}
              <TileContent small />
              <FocusDuplicateOverlay focusedTrackSid={focusedTrackSid} />
            </ParticipantTile>
          ))}
        </div>
      </div>
    </div>
  );
}
