// Package Imports
import { FocusLayout, ParticipantTile } from "@livekit/components-react";
import { Track } from "livekit-client";
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { isTrackReference } from "@livekit/components-core";

// Components
import { TileContent, FocusDuplicateOverlay } from "@/page/call";

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
  if (!focusedTrackRef) return;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-6">
        <FocusLayout
        trackRef={focusedTrackRef}
        onParticipantClick={onParticipantClick}
        className="relative aspect-video w-full max-w-5xl border-0"
      >
        <TileContent hideBadges />
      </FocusLayout>
      <div className="w-full max-w-5xl">
        <div className="h-32 flex items-center justify-center gap-3 overflow-x-auto px-2">
          {participantTracks.map((track) => (
            <ParticipantTile
              key={getTrackKey(track)}
              trackRef={track}
              disableSpeakingIndicator
              onParticipantClick={onParticipantClick}
              className="relative h-full aspect-video flex-none rounded-lg"
            >
              {/* CallModal from @/.../raw.tsx */}
              <TileContent />
              <FocusDuplicateOverlay focusedTrackSid={focusedTrackSid} />
            </ParticipantTile>
          ))}
        </div>
      </div>
    </div>
  );
}
