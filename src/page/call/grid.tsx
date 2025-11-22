// Package Imports
import { GridLayout, ParticipantTile } from "@livekit/components-react";
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";

// Lib Imports
import { cn } from "@/lib/utils";

// Components
import { TileContent, FocusDuplicateOverlay } from "@/page/call";

// Main
export function CallGrid({
  participantTracks,
  focusedTrackSid,
  onParticipantClick,
  className,
  tileClassName,
}: {
  participantTracks: TrackReferenceOrPlaceholder[];
  focusedTrackSid: string | null;
  onParticipantClick: (event: ParticipantClickEvent) => void;
  className?: string;
  tileClassName?: string;
}) {
  return (
    <div className="h-full w-full flex items-center justify-center py-6">
      <GridLayout
        tracks={participantTracks}
        className={cn("h-full w-full", className)}
      >
        <ParticipantTile
          disableSpeakingIndicator
          onParticipantClick={onParticipantClick}
          className={cn("aspect-video relative border-0", tileClassName)}
        >
          <TileContent />
          <FocusDuplicateOverlay focusedTrackSid={focusedTrackSid} />
        </ParticipantTile>
      </GridLayout>
    </div>
  );
}
