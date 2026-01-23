"use client";

// Package Imports
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import {
  getTrackReferenceId,
  isTrackReference,
  TrackReference,
} from "@livekit/components-core";
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

// Core Context Imports
import { useCallSession } from "./CallSessionContext";

// Types
type PopoutScreenShare = {
  trackRef: TrackReference;
  title: string;
} | null;

type CallPageContextValue = {
  participantTracks: TrackReferenceOrPlaceholder[];
  focusedTrackSid: string | null;
  focusedTrackRef: TrackReferenceOrPlaceholder | undefined;
  setFocusedTrackSid: (sid: string | null) => void;
  handleParticipantClick: (event: ParticipantClickEvent) => void;
  hideParticipants: boolean;
  setHideParticipants: (hide: boolean) => void;
  popoutScreenShare: PopoutScreenShare;
  openPopout: (trackRef: TrackReference, title: string) => void;
  closePopout: () => void;
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

// Main Provider
export function CallPageProvider({ children }: { children: ReactNode }) {
  const { startWatching } = useCallSession();

  // Track management
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

  // Focus state
  const [focusedTrackSid, setFocusedTrackSid] = useState<string | null>(null);
  const [hideParticipants, setHideParticipants] = useState(false);

  // Popout screen share state
  const [popoutScreenShare, setPopoutScreenShare] =
    useState<PopoutScreenShare>(null);

  const openPopout = useCallback((trackRef: TrackReference, title: string) => {
    setPopoutScreenShare({ trackRef, title });
  }, []);

  const closePopout = useCallback(() => {
    setPopoutScreenShare(null);
  }, []);

  const focusedTrackRef = useMemo(() => {
    if (!focusedTrackSid) {
      return undefined;
    }

    return participantTracks.find(
      (track) => getTrackReferenceId(track) === focusedTrackSid,
    );
  }, [participantTracks, focusedTrackSid]);

  // Clear focused track if it no longer exists
  useEffect(() => {
    if (focusedTrackSid && !focusedTrackRef) {
      setFocusedTrackSid(null);
    }
  }, [focusedTrackRef, focusedTrackSid]);

  // Close popout if the track is no longer available
  useEffect(() => {
    if (popoutScreenShare) {
      const trackStillExists = trackReferences.some(
        (track) =>
          isTrackReference(track) &&
          track.publication?.trackSid ===
            popoutScreenShare.trackRef.publication?.trackSid,
      );
      if (!trackStillExists) {
        setPopoutScreenShare(null);
      }
    }
  }, [trackReferences, popoutScreenShare]);

  // Click handling
  const resolveTrackSid = useCallback(
    (participantIdentity: string) => {
      const track = participantTracks.find(
        (track) => track.participant.identity === participantIdentity,
      );

      return track ? getTrackReferenceId(track) : null;
    },
    [participantTracks],
  );

  const handleParticipantClick = useCallback(
    (event: ParticipantClickEvent) => {
      const trackSid = resolveTrackSid(event.participant.identity);
      if (!trackSid) {
        return;
      }

      const track = participantTracks.find(
        (track) => getTrackReferenceId(track) === trackSid,
      );

      if (track?.source === Track.Source.ScreenShare) {
        startWatching(Number(event.participant.identity));
      }

      setFocusedTrackSid((current) => (current === trackSid ? null : trackSid));
    },
    [resolveTrackSid, startWatching, participantTracks],
  );

  const value: CallPageContextValue = {
    participantTracks,
    focusedTrackSid,
    focusedTrackRef,
    setFocusedTrackSid,
    handleParticipantClick,
    hideParticipants,
    setHideParticipants,
    popoutScreenShare,
    openPopout,
    closePopout,
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

// Optional hook for gradual migration
export function useMaybeCallPageContext() {
  return useContext(CallPageContext);
}

// Re-export for convenience
export { CallPageContext };
