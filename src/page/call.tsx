"use client";

// Package Imports
import { useCallback, useEffect, useMemo, useState } from "react";
import { Track } from "livekit-client";
import {
  useTracks,
  useMaybeTrackRefContext,
  useIsSpeaking,
} from "@livekit/components-react";
import { isTrackReference } from "@livekit/components-core";
import type {
  TrackReferenceOrPlaceholder,
  ParticipantClickEvent,
} from "@livekit/components-core";
import * as Icon from "lucide-react";

// Components
import { CallUserModal } from "@/components/modals/call";
import { CallGrid } from "./call/grid";
import { CallFocus } from "./call/focus";

// Helper Functions
function mergeParticipantTracks(
  tracks: TrackReferenceOrPlaceholder[]
): TrackReferenceOrPlaceholder[] {
  const merged = new Map<string, TrackReferenceOrPlaceholder>();

  tracks.forEach((track) => {
    const identity = track.participant.identity;
    const existing = merged.get(identity);

    if (!existing || getTrackPriority(track) > getTrackPriority(existing)) {
      merged.set(identity, track);
    }
  });

  return Array.from(merged.values());
}

function getTrackPriority(track: TrackReferenceOrPlaceholder) {
  if (track.source === Track.Source.ScreenShare) {
    return 3;
  }

  if (track.source === Track.Source.Camera && isTrackReference(track)) {
    return 2;
  }

  if (track.source === Track.Source.Camera) {
    return 1;
  }

  return 0;
}

// Main
export default function Page() {
  // track management
  const trackReferences = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  const participantTracks = useMemo(
    () => mergeParticipantTracks(trackReferences),
    [trackReferences]
  );

  // focus stuff
  const [focusedTrackSid, setFocusedTrackSid] = useState<string | null>(null);

  const focusedTrackRef = useMemo(() => {
    if (!focusedTrackSid) {
      return undefined;
    }

    return participantTracks.find(
      (track) =>
        isTrackReference(track) &&
        track.publication?.trackSid === focusedTrackSid
    );
  }, [participantTracks, focusedTrackSid]);

  useEffect(() => {
    if (focusedTrackSid && !focusedTrackRef) {
      setFocusedTrackSid(null);
    }
  }, [focusedTrackRef, focusedTrackSid]);

  // click handling
  const resolveTrackSid = useCallback(
    (participantIdentity: string, publicationSid?: string | null) => {
      if (publicationSid) {
        return publicationSid;
      }

      const fallbackTrack = participantTracks.find(
        (track) =>
          isTrackReference(track) &&
          track.participant.identity === participantIdentity
      );

      return fallbackTrack?.publication?.trackSid ?? null;
    },
    [participantTracks]
  );

  const handleParticipantClick = useCallback(
    (event: ParticipantClickEvent) => {
      const trackSid = resolveTrackSid(
        event.participant.identity,
        event.track?.trackSid
      );
      if (!trackSid) {
        return;
      }

      setFocusedTrackSid((current) => (current === trackSid ? null : trackSid));
    },
    [resolveTrackSid]
  );

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <div className="flex-1">
        {focusedTrackRef ? (
          <CallFocus
            focusedTrackRef={focusedTrackRef}
            participantTracks={participantTracks}
            focusedTrackSid={focusedTrackSid}
            onParticipantClick={handleParticipantClick}
          />
        ) : (
          <CallGrid
            participantTracks={participantTracks}
            onParticipantClick={handleParticipantClick}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}

export function TileContent({ hideBadges }: { hideBadges?: boolean } = {}) {
  const isSpeaking = useIsSpeaking();
  return (
    <div className="relative w-full h-full">
      <div
        className={`absolute inset-0 rounded-xl transition-all ease-in-out duration-400 pointer-events-none z-20 ${
          isSpeaking && "ring-3 ring-primary ring-inset"
        }`}
      />

      <div className="w-full h-full flex items-center justify-center rounded-xl z-10">
        <CallUserModal hideBadges={hideBadges} />
      </div>
    </div>
  );
}

export function FocusDuplicateOverlay({
  focusedTrackSid,
}: {
  focusedTrackSid: string | null;
}) {
  const trackRef = useMaybeTrackRefContext();
  if (!focusedTrackSid || !trackRef || !isTrackReference(trackRef)) {
    return null;
  }

  const isDuplicate = trackRef.publication?.trackSid === focusedTrackSid;
  if (!isDuplicate) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/75 z-20 text-white flex items-center justify-center">
      <Icon.ScanEye className="h-6 w-6" />
    </div>
  );
}
