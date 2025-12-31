// Package Imports
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { isTrackReference } from "@livekit/components-core";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Context Imports
import { useSubCallContext } from "@/context/call";

// Types
type CallPageContextValue = {
  participantTracks: TrackReferenceOrPlaceholder[];
  focusedTrackSid: string | null;
  focusedTrackRef: TrackReferenceOrPlaceholder | undefined;
  setFocusedTrackSid: (sid: string | null) => void;
  handleParticipantClick: (event: ParticipantClickEvent) => void;
  hideParticipants: boolean;
  setHideParticipants: (hide: boolean) => void;
};

const CallPageContext = createContext<CallPageContextValue | null>(null);

// Helper Functions
function mergeParticipantTracks(
  tracks: TrackReferenceOrPlaceholder[],
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
export function CallPageProvider({ children }: { children: ReactNode }) {
  const { startWatching } = useSubCallContext();

  // track management
  const trackReferences = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const participantTracks = useMemo(
    () => mergeParticipantTracks(trackReferences),
    [trackReferences],
  );

  // focus stuff
  const [focusedTrackSid, setFocusedTrackSid] = useState<string | null>(null);

  const [hideParticipants, setHideParticipants] = useState(false);

  const focusedTrackRef = useMemo(() => {
    if (!focusedTrackSid) {
      return undefined;
    }

    return participantTracks.find(
      (track) =>
        isTrackReference(track) &&
        track.publication?.trackSid === focusedTrackSid,
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
          track.participant.identity === participantIdentity,
      );

      return fallbackTrack?.publication?.trackSid ?? null;
    },
    [participantTracks],
  );

  const handleParticipantClick = useCallback(
    (event: ParticipantClickEvent) => {
      const trackSid = resolveTrackSid(
        event.participant.identity,
        event.track?.trackSid,
      );
      if (!trackSid) {
        return;
      }

      startWatching(Number(event.participant.identity));
      setFocusedTrackSid((current) => (current === trackSid ? null : trackSid));
    },
    [resolveTrackSid, startWatching],
  );

  const value: CallPageContextValue = {
    participantTracks,
    focusedTrackSid,
    focusedTrackRef,
    setFocusedTrackSid,
    handleParticipantClick,
    hideParticipants,
    setHideParticipants,
  };

  return (
    <CallPageContext.Provider value={value}>
      {children}
    </CallPageContext.Provider>
  );
}

export function useCallPageContext() {
  const context = useContext(CallPageContext);
  if (!context) {
    throw new Error("useCallPageContext must be used within CallPageProvider");
  }
  return context;
}
