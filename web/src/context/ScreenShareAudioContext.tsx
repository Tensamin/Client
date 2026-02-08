/**
 * Screen Share Audio Context
 *
 * Provides screen share audio state and controls across the call UI.
 * This context wraps the useScreenShareAudio hook and provides additional
 * viewer-side audio muting functionality.
 */

"use client";

import { useTracks } from "@livekit/components-react";
import { RemoteTrackPublication, Track } from "livekit-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { rawDebugLog } from "@/context/StorageContext";

// ============================================================================
// Types
// ============================================================================

export interface ScreenShareAudioMuteState {
  /** Map of participant identity to mute state for their screen share audio */
  mutedParticipants: Record<string, boolean>;
}

export interface ScreenShareAudioContextValue extends ScreenShareAudioMuteState {
  /** Mute a specific participant's screen share audio (viewer-side only) */
  muteParticipantAudio: (participantIdentity: string) => void;
  /** Unmute a specific participant's screen share audio */
  unmuteParticipantAudio: (participantIdentity: string) => void;
  /** Toggle mute state for a participant */
  toggleParticipantAudioMute: (participantIdentity: string) => void;
  /** Check if a participant's screen share audio is muted */
  isParticipantAudioMuted: (participantIdentity: string) => boolean;
  /** Get the volume for a participant (1 if unmuted, 0 if muted) */
  getParticipantVolume: (participantIdentity: string) => number;
}

// ============================================================================
// Context
// ============================================================================

const ScreenShareAudioContext = createContext<ScreenShareAudioContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function ScreenShareAudioProvider({ children }: { children: ReactNode }) {
  // Track muted participants (viewer-side muting)
  const [mutedParticipants, setMutedParticipants] = useState<Record<string, boolean>>({});

  // Get all screen share audio tracks for managing volume
  const screenShareAudioTracks = useTracks([Track.Source.ScreenShareAudio], {
    onlySubscribed: true,
  });

  // Keep refs to audio elements for volume control
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  /**
   * Apply mute state to an audio track's element.
   */
  const applyMuteState = useCallback(
    (participantIdentity: string, muted: boolean) => {
      // Find the audio track for this participant
      const trackRef = screenShareAudioTracks.find(
        (t) => t.participant.identity === participantIdentity
      );

      if (trackRef?.publication && trackRef.publication instanceof RemoteTrackPublication) {
        // For remote tracks, we can control the volume/mute state
        const track = trackRef.publication.track;
        if (track) {
          // Find or create the audio element
          const audioElements = document.querySelectorAll("audio");
          audioElements.forEach((audio) => {
            // Check if this audio element is playing this track's stream
            if (audio.srcObject instanceof MediaStream) {
              const audioTracks = audio.srcObject.getAudioTracks();
              const matchingTrack = audioTracks.find(
                (t) => t.id === track.mediaStreamTrack?.id
              );
              if (matchingTrack) {
                audio.muted = muted;
                audioElementsRef.current.set(participantIdentity, audio);
              }
            }
          });
        }
      }
    },
    [screenShareAudioTracks]
  );

  /**
   * Mute a specific participant's screen share audio.
   */
  const muteParticipantAudio = useCallback(
    (participantIdentity: string) => {
      setMutedParticipants((prev) => ({
        ...prev,
        [participantIdentity]: true,
      }));
      applyMuteState(participantIdentity, true);
      rawDebugLog(
        "ScreenShareAudio",
        "Muted participant audio",
        { participantIdentity },
        "purple"
      );
    },
    [applyMuteState]
  );

  /**
   * Unmute a specific participant's screen share audio.
   */
  const unmuteParticipantAudio = useCallback(
    (participantIdentity: string) => {
      setMutedParticipants((prev) => {
        const next = { ...prev };
        delete next[participantIdentity];
        return next;
      });
      applyMuteState(participantIdentity, false);
      rawDebugLog(
        "ScreenShareAudio",
        "Unmuted participant audio",
        { participantIdentity },
        "purple"
      );
    },
    [applyMuteState]
  );

  /**
   * Toggle mute state for a participant.
   */
  const toggleParticipantAudioMute = useCallback(
    (participantIdentity: string) => {
      setMutedParticipants((prev) => {
        const currentlyMuted = prev[participantIdentity] ?? false;
        if (currentlyMuted) {
          const next = { ...prev };
          delete next[participantIdentity];
          applyMuteState(participantIdentity, false);
          return next;
        } else {
          applyMuteState(participantIdentity, true);
          return { ...prev, [participantIdentity]: true };
        }
      });
    },
    [applyMuteState]
  );

  /**
   * Check if a participant's screen share audio is muted.
   */
  const isParticipantAudioMuted = useCallback(
    (participantIdentity: string) => {
      return mutedParticipants[participantIdentity] ?? false;
    },
    [mutedParticipants]
  );

  /**
   * Get the volume for a participant (1 if unmuted, 0 if muted).
   */
  const getParticipantVolume = useCallback(
    (participantIdentity: string) => {
      return mutedParticipants[participantIdentity] ? 0 : 1;
    },
    [mutedParticipants]
  );

  // Reapply mute states when screen share audio tracks change
  useEffect(() => {
    // Apply mute states to any new audio tracks
    Object.entries(mutedParticipants).forEach(([identity, muted]) => {
      if (muted) {
        // Small delay to ensure audio elements are mounted
        const timeoutId = setTimeout(() => applyMuteState(identity, true), 100);
        return () => clearTimeout(timeoutId);
      }
    });
  }, [screenShareAudioTracks, mutedParticipants, applyMuteState]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: ScreenShareAudioContextValue = useMemo(
    () => ({
      mutedParticipants,
      muteParticipantAudio,
      unmuteParticipantAudio,
      toggleParticipantAudioMute,
      isParticipantAudioMuted,
      getParticipantVolume,
    }),
    [
      mutedParticipants,
      muteParticipantAudio,
      unmuteParticipantAudio,
      toggleParticipantAudioMute,
      isParticipantAudioMuted,
      getParticipantVolume,
    ]
  );

  return (
    <ScreenShareAudioContext.Provider value={value}>
      {children}
    </ScreenShareAudioContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useScreenShareAudioContext(): ScreenShareAudioContextValue {
  const context = useContext(ScreenShareAudioContext);
  if (!context) {
    throw new Error(
      "useScreenShareAudioContext must be used within ScreenShareAudioProvider"
    );
  }
  return context;
}
