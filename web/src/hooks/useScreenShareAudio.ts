/**
 * Screen Share Audio Hook
 *
 * React hook for managing system audio capture during screen sharing.
 * Integrates with LiveKit for track publishing and management.
 *
 * Usage:
 * ```tsx
 * const {
 *   audioSources,
 *   selectedAudioSource,
 *   setSelectedAudioSource,
 *   isAudioEnabled,
 *   setIsAudioEnabled,
 *   publishScreenShareWithAudio,
 *   stopScreenShare,
 * } = useScreenShareAudio();
 * ```
 */

import { useLocalParticipant } from "@livekit/components-react";
import {
  LocalAudioTrack,
  LocalVideoTrack,
  Track,
  VideoPresets,
} from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { debugLog } from "@/lib/logger";
import {
  AudioSource,
  captureSystemAudio,
  detectPlatform,
  getAudioSources,
  handleAudioCaptureError,
  isSystemAudioCaptureAvailable,
} from "@/lib/systemAudioCapture";

// ============================================================================
// Types
// ============================================================================

export interface ScreenShareAudioState {
  /** Available audio sources */
  audioSources: AudioSource[];
  /** Currently selected audio source ID */
  selectedAudioSource: string;
  /** Whether audio is enabled for screen share */
  isAudioEnabled: boolean;
  /** Whether system audio capture is available on this platform */
  isAudioCaptureAvailable: boolean;
  /** Whether audio sources are being loaded */
  isLoadingAudioSources: boolean;
  /** Current platform */
  platform: ReturnType<typeof detectPlatform>;
}

export interface ScreenShareAudioActions {
  /** Set the selected audio source */
  setSelectedAudioSource: (sourceId: string) => void;
  /** Toggle audio enabled state */
  setIsAudioEnabled: (enabled: boolean) => void;
  /** Refresh available audio sources */
  refreshAudioSources: () => Promise<void>;
  /** Start screen share with optional audio */
  startScreenShareWithAudio: (
    videoSourceId: string,
    videoConstraints: ScreenShareVideoConstraints,
  ) => Promise<boolean>;
  /** Stop screen share and audio */
  stopScreenShare: () => Promise<void>;
  /** Check if currently screen sharing with audio */
  hasAudioTrack: () => boolean;
}

export interface ScreenShareVideoConstraints {
  width: number;
  height: number;
  frameRate: number;
}

export type UseScreenShareAudioReturn = ScreenShareAudioState &
  ScreenShareAudioActions;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useScreenShareAudio(): UseScreenShareAudioReturn {
  const { localParticipant } = useLocalParticipant();

  // State
  const [audioSources, setAudioSources] = useState<AudioSource[]>([
    { id: "none", name: "No Audio", type: "none" },
  ]);
  const [selectedAudioSource, setSelectedAudioSource] =
    useState<string>("none");
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [isLoadingAudioSources, setIsLoadingAudioSources] =
    useState<boolean>(false);

  // Refs for tracking published tracks
  const screenShareVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const screenShareAudioTrackRef = useRef<LocalAudioTrack | null>(null);

  // Derived state
  const platform = useMemo(() => detectPlatform(), []);
  const isAudioCaptureAvailable = useMemo(
    () => isSystemAudioCaptureAvailable(),
    [],
  );

  // ============================================================================
  // Audio Source Management
  // ============================================================================

  /**
   * Refresh the list of available audio sources.
   */
  const refreshAudioSources = useCallback(async () => {
    setIsLoadingAudioSources(true);
    try {
      const sources = await getAudioSources();
      setAudioSources(sources);
      debugLog(
        "ScreenShareAudio",
        "Loaded audio sources",
        { count: sources.length, sources },
        "purple",
      );
    } catch (error) {
      console.error("[ScreenShareAudio] Failed to load audio sources:", error);
      toast.error("Failed to load audio sources");
    } finally {
      setIsLoadingAudioSources(false);
    }
  }, []);

  // Load audio sources on mount if available
  useEffect(() => {
    if (isAudioCaptureAvailable) {
      refreshAudioSources();
    }
  }, [isAudioCaptureAvailable, refreshAudioSources]);

  // ============================================================================
  // Screen Share with Audio
  // ============================================================================

  /**
   * Start screen sharing with optional system audio.
   *
   * IMPORTANT: If audio capture fails, we continue with video-only.
   * We do NOT fall back to microphone to avoid users hearing audio twice.
   */
  const startScreenShareWithAudio = useCallback(
    async (
      videoSourceId: string,
      videoConstraints: ScreenShareVideoConstraints,
    ): Promise<boolean> => {
      if (!localParticipant) {
        toast.error("Not connected to call");
        return false;
      }

      try {
        // Step 1: Capture video
        debugLog(
          "ScreenShareAudio",
          "Starting screen share",
          { videoSourceId, videoConstraints, audioEnabled: isAudioEnabled },
          "purple",
        );

        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: videoSourceId,
              minWidth: videoConstraints.width,
              maxWidth: videoConstraints.width,
              minHeight: videoConstraints.height,
              maxHeight: videoConstraints.height,
              minFrameRate: videoConstraints.frameRate,
              maxFrameRate: videoConstraints.frameRate,
            },
          },
        } as MediaStreamConstraints);

        const videoMediaTrack = videoStream.getVideoTracks()[0];
        if (!videoMediaTrack) {
          toast.error("Failed to capture screen video");
          return false;
        }

        // Step 2: Create and publish video track
        const localVideoTrack = new LocalVideoTrack(videoMediaTrack);
        await localParticipant.publishTrack(localVideoTrack, {
          source: Track.Source.ScreenShare,
          ...VideoPresets.h1440,
          simulcast: false,
          videoEncoding: {
            ...VideoPresets.h1440.encoding,
            maxFramerate: videoConstraints.frameRate,
          },
        });

        screenShareVideoTrackRef.current = localVideoTrack;
        debugLog(
          "ScreenShareAudio",
          "Video track published",
          undefined,
          "green",
        );

        // Step 3: Capture and publish audio (if enabled)
        if (isAudioEnabled && selectedAudioSource !== "none") {
          try {
            const audioResult = await captureSystemAudio({
              sourceId: selectedAudioSource,
              videoSourceId: videoSourceId,
            });

            if (audioResult.success && audioResult.track) {
              const localAudioTrack = new LocalAudioTrack(audioResult.track);
              await localParticipant.publishTrack(localAudioTrack, {
                source: Track.Source.ScreenShareAudio,
              });

              screenShareAudioTrackRef.current = localAudioTrack;
              debugLog(
                "ScreenShareAudio",
                "Audio track published",
                { sourceId: selectedAudioSource },
                "green",
              );
            } else if (audioResult.error) {
              // Audio failed, but continue with video-only
              handleAudioCaptureError(audioResult.error);
            }
          } catch (audioError) {
            // Audio failed, but continue with video-only
            const errorMessage =
              audioError instanceof Error
                ? audioError.message
                : String(audioError);
            handleAudioCaptureError(errorMessage);
          }
        }

        return true;
      } catch (error) {
        console.error("[ScreenShareAudio] Screen share failed:", error);
        toast.error("Failed to start screen share");

        // Clean up any partial state
        if (screenShareVideoTrackRef.current) {
          try {
            await localParticipant.unpublishTrack(
              screenShareVideoTrackRef.current,
            );
            screenShareVideoTrackRef.current.stop();
          } catch {
            // Ignore cleanup errors
          }
          screenShareVideoTrackRef.current = null;
        }

        return false;
      }
    },
    [localParticipant, isAudioEnabled, selectedAudioSource],
  );

  /**
   * Stop screen sharing and clean up tracks.
   */
  const stopScreenShare = useCallback(async () => {
    if (!localParticipant) return;

    try {
      // Stop audio track
      if (screenShareAudioTrackRef.current) {
        try {
          await localParticipant.unpublishTrack(
            screenShareAudioTrackRef.current,
          );
          screenShareAudioTrackRef.current.stop();
        } catch (error) {
          console.error(
            "[ScreenShareAudio] Error stopping audio track:",
            error,
          );
        }
        screenShareAudioTrackRef.current = null;
      }

      // Stop video track
      if (screenShareVideoTrackRef.current) {
        try {
          await localParticipant.unpublishTrack(
            screenShareVideoTrackRef.current,
          );
          screenShareVideoTrackRef.current.stop();
        } catch (error) {
          console.error(
            "[ScreenShareAudio] Error stopping video track:",
            error,
          );
        }
        screenShareVideoTrackRef.current = null;
      }

      // Also try the standard LiveKit method as fallback
      await localParticipant.setScreenShareEnabled(false);

      debugLog("ScreenShareAudio", "Screen share stopped", undefined, "purple");
    } catch (error) {
      console.error("[ScreenShareAudio] Error stopping screen share:", error);
      toast.error("Failed to stop screen share");
    }
  }, [localParticipant]);

  /**
   * Check if there's an active screen share audio track.
   */
  const hasAudioTrack = useCallback(() => {
    return screenShareAudioTrackRef.current !== null;
  }, []);

  // ============================================================================
  // Cleanup on unmount or disconnect
  // ============================================================================

  useEffect(() => {
    return () => {
      // Clean up tracks on unmount
      if (screenShareAudioTrackRef.current) {
        screenShareAudioTrackRef.current.stop();
        screenShareAudioTrackRef.current = null;
      }
      if (screenShareVideoTrackRef.current) {
        screenShareVideoTrackRef.current.stop();
        screenShareVideoTrackRef.current = null;
      }
    };
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    audioSources,
    selectedAudioSource,
    isAudioEnabled,
    isAudioCaptureAvailable,
    isLoadingAudioSources,
    platform,

    // Actions
    setSelectedAudioSource,
    setIsAudioEnabled,
    refreshAudioSources,
    startScreenShareWithAudio,
    stopScreenShare,
    hasAudioTrack,
  };
}
