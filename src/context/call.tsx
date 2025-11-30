"use client";

// Package Imports
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useDisconnectButton,
  useTrackToggle,
  useConnectionState,
} from "@livekit/components-react";
import {
  RoomEvent,
  Track,
  LocalAudioTrack,
  createLocalAudioTrack,
  ConnectionState,
} from "livekit-client";
import { toast } from "sonner";
import * as Icon from "lucide-react";

// Lib Imports
import {
  audioService,
  type NoiseSuppressionAlgorithm,
} from "@/lib/audioService";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";

// Components
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Types
import { User, UserAudioSettings } from "@/lib/types";
import { UserAvatar } from "@/components/modals/raw";

// Main Contexts
const SubCallContext = createContext<SubCallContextValue | null>(null);
const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within CallProvider");
  }
  return context;
}

export function useSubCallContext() {
  const context = useContext(SubCallContext);
  if (!context) {
    throw new Error("useSubCallContext must be used within SubCallProvider");
  }
  return context;
}

// Main Provider Component
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { data, set } = useStorageContext();
  const { lastMessage, send } = useSocketContext();
  const { get } = useUserContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");

  // User volume management
  const setUserVolumes = useCallback(
    (userId: string, volume: number) => {
      set("call_userVolumes", {
        ...(data.call_userVolumes as object),
        [userId]: volume,
      });
    },
    [data.call_userVolumes, set],
  );

  // Incoming call state
  const [newCallWidgetOpen, setNewCallWidgetOpen] = useState(false);
  const [newCallData, setNewCallData] = useState<{
    call_id: string;
    sender_id: string;
  } | null>(null);
  const [newCaller, setNewCaller] = useState<User | null>(null);

  // Handle incoming call invites
  useEffect(() => {
    if (lastMessage?.type === "call_invite") {
      if (!lastMessage.data.sender_id || !lastMessage.data.call_id) {
        toast.error("Failed joining call");
        return;
      }
      setNewCallData({
        call_id: lastMessage.data.call_id,
        sender_id: lastMessage.data.sender_id,
      });
      if (!lastMessage.data?.sender_id) return;
      get(lastMessage.data.sender_id, false).then((user) => {
        setNewCaller(user);
        setNewCallWidgetOpen(true);
      });
    }
  }, [
    lastMessage?.type,
    get,
    lastMessage?.data.call_id,
    lastMessage?.data.sender_id,
  ]);

  const connect = useCallback(() => {
    setOuterState("CONNECTING");
    setShouldConnect(true);
  }, []);

  const getCallToken = useCallback(
    async (callId: string) => {
      return send("call_token", {
        call_id: callId,
      }).then((data) => {
        if (data.type !== "error") {
          return data.data.call_token ?? "error";
        }
        return "error";
      });
    },
    [send],
  );

  const handleAcceptCall = useCallback(() => {
    setNewCallWidgetOpen(false);
    if (!newCallData?.call_id) return;
    getCallToken(newCallData.call_id).then((token) => {
      setToken(token);
      connect();
    });
  }, [newCallData, getCallToken, connect]);

  return (
    <CallContext.Provider
      value={{
        getCallToken,
        shouldConnect,
        outerState,
        setToken,
        connect,
        setUserVolumes,
        setOuterState,
        setShouldConnect,
      }}
    >
      {/* Incoming Call Dialog */}
      {newCaller && (
        <Dialog open={newCallWidgetOpen} onOpenChange={setNewCallWidgetOpen}>
          <DialogContent
            aria-describedby={undefined}
            showCloseButton={false}
            className="flex flex-col gap-12 w-75 justify-center items-center"
          >
            <div className="flex flex-col gap-5 justify-center items-center">
              <UserAvatar
                icon={newCaller.avatar}
                title={newCaller.display}
                size="gigantica"
                border
              />
              <DialogTitle className="text-2xl">
                {newCaller.display}
              </DialogTitle>
            </div>
            <div className="flex gap-10">
              <Button
                className="w-12 h-12"
                variant="outline"
                onClick={() => setNewCallWidgetOpen(false)}
              >
                <Icon.PhoneOff />
              </Button>
              <Button
                className="w-12 h-12"
                onLoad={(el) => {
                  // @ts-expect-error Types missing
                  el.target.focus();
                }}
                onClick={handleAcceptCall}
              >
                <Icon.PhoneForwarded />
              </Button>
            </div>
            <audio
              loop
              hidden
              autoPlay
              onPlay={(el) => {
                // @ts-expect-error Types missing
                el.target.volume = 0.2;
              }}
              src="/assets/sounds/call.wav"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* LiveKit Room - audio={false} because we manage our own audio track */}
      <LiveKitRoom
        token={token}
        serverUrl="wss://call.tensamin.net"
        connect={shouldConnect}
        audio={false}
        video={false}
        onConnected={() => setOuterState("CONNECTED")}
        onDisconnected={() => setOuterState("DISCONNECTED")}
      >
        <RoomAudioRenderer />
        <SubCallProvider>{children}</SubCallProvider>
      </LiveKitRoom>
    </CallContext.Provider>
  );
}

// Sub Provider Component - handles call functionality within room context
function SubCallProvider({ children }: { children: React.ReactNode }) {
  const { setOuterState, setShouldConnect, connect, shouldConnect } =
    useCallContext();
  const { data, debugLog } = useStorageContext();

  // LiveKit hooks
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { buttonProps: disconnectButtonProps } = useDisconnectButton({});
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  // Track toggle using LiveKit's hook for microphone
  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
  });

  // Local state
  const [noiseSuppressionSupported, setNoiseSuppressionSupported] =
    useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [audioTrackPublished, setAudioTrackPublished] = useState(false);

  // Refs for audio track management
  const publishedTrackRef = useRef<LocalAudioTrack | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  // Get stored user volumes
  const storedUserVolumes = data.call_userVolumes as UserAudioSettings | null;

  // Check noise suppression support on mount
  useEffect(() => {
    setNoiseSuppressionSupported(audioService.isSupported());
  }, []);

  // Apply stored volumes to participants when they connect
  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant: {
      identity: string;
      setVolume: (volume: number) => void;
    }) => {
      const storedVolume = storedUserVolumes?.[participant.identity];
      if (storedVolume) {
        participant.setVolume(storedVolume as number);
      }
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [room, storedUserVolumes]);

  // Handle deafened state - mute all audio elements
  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isDeafened;
    });

    // Update participant metadata
    if (localParticipant && shouldConnect) {
      localParticipant
        .setMetadata(JSON.stringify({ deafened: isDeafened }))
        .catch((error) => {
          if (
            error instanceof Error &&
            error.message?.includes(
              "Request to update local metadata timed out",
            )
          ) {
            return;
          }
          throw error;
        });
    }
  }, [isDeafened, localParticipant, shouldConnect]);

  // Helper function to get processed audio stream with noise suppression
  const getProcessedAudioStream =
    useCallback(async (): Promise<MediaStream> => {
      const nsState = (data.nsState as number) ?? 0;
      const channelCount = (data.call_channelCount as number) || 2;

      debugLog("NOISE_SUPPRESSION", "NS_GET_STREAM", {
        nsState,
        noiseSuppressionSupported,
      });

      // Define audio constraints based on noise suppression mode
      const rawConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount,
      };

      const builtInConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount,
      };

      // Determine which constraints to use
      const constraints: MediaStreamConstraints = {
        audio: nsState === 1 ? builtInConstraints : rawConstraints,
        video: false,
      };

      // Get raw stream
      const rawStream = await navigator.mediaDevices.getUserMedia(constraints);
      rawStreamRef.current = rawStream;

      debugLog("CALL_CONTEXT", "RAW_STREAM_ACQUIRED", {
        tracks: rawStream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
        nsState,
      });

      // Apply custom noise suppression if enabled and supported
      // nsState: 2 = speex, 3 = rnnoise
      if (nsState >= 2 && nsState <= 3 && noiseSuppressionSupported) {
        try {
          let algorithm: NoiseSuppressionAlgorithm;
          switch (nsState) {
            case 2:
              algorithm = "speex";
              debugLog("CALL_CONTEXT", "NS_ALGORITHM", "speex");
              break;
            case 3:
              algorithm = "rnnoise";
              debugLog("CALL_CONTEXT", "NS_ALGORITHM", "rnnoise");
              break;
            default:
              debugLog("CALL_CONTEXT", "NS_INVALID_STATE", nsState);
              return rawStream;
          }

          const processedStream = await audioService.processStream(rawStream, {
            algorithm,
            maxChannels: channelCount,
          });

          debugLog("CALL_CONTEXT", "NS_STREAM_PROCESSED", algorithm);
          return processedStream;
        } catch (err) {
          debugLog("CALL_CONTEXT", "NS_ERROR", err);
          return rawStream;
        }
      }

      return rawStream;
    }, [
      data.nsState,
      data.call_channelCount,
      noiseSuppressionSupported,
      debugLog,
    ]);

  // Publish audio track when connected
  useEffect(() => {
    if (!localParticipant || !shouldConnect || audioTrackPublished) return;
    if (connectionState !== ConnectionState.Connected) return;

    let isMounted = true;

    const publishAudioTrack = async () => {
      try {
        debugLog("NOISE_SUPPRESSION", "NS_PUBLISHING_TRACK", {
          nsState: data.nsState,
          noiseSuppressionSupported,
        });

        // Get the processed audio stream
        const processedStream = await getProcessedAudioStream();
        if (!processedStream || !isMounted) return;

        // Get the audio track from the stream
        const audioTrack = processedStream.getAudioTracks()[0];
        if (!audioTrack) {
          debugLog(
            "NOISE_SUPPRESSION",
            "NS_NO_AUDIO_TRACK",
            "No audio track found",
          );
          return;
        }

        // Create a LiveKit LocalAudioTrack
        const localAudioTrack = await createLocalAudioTrack({
          deviceId: audioTrack.getSettings().deviceId,
        });

        if (!isMounted) {
          localAudioTrack.stop();
          return;
        }

        // Replace the track's mediaStreamTrack with our processed one
        await localAudioTrack.replaceTrack(audioTrack);

        // Publish the track
        await localParticipant.publishTrack(localAudioTrack, {
          name: "microphone",
          source: Track.Source.Microphone,
        });

        publishedTrackRef.current = localAudioTrack;
        setAudioTrackPublished(true);

        debugLog(
          "NOISE_SUPPRESSION",
          "NS_TRACK_PUBLISHED",
          "Audio track published successfully",
        );
      } catch (err) {
        debugLog("NOISE_SUPPRESSION", "NS_PUBLISH_ERROR", err);
      }
    };

    publishAudioTrack();

    return () => {
      isMounted = false;
    };
  }, [
    localParticipant,
    shouldConnect,
    connectionState,
    audioTrackPublished,
    data.nsState,
    noiseSuppressionSupported,
    getProcessedAudioStream,
    debugLog,
  ]);

  // Cleanup when disconnecting
  useEffect(() => {
    if (!shouldConnect && publishedTrackRef.current) {
      try {
        publishedTrackRef.current.stop();
        publishedTrackRef.current = null;
        setAudioTrackPublished(false);

        if (rawStreamRef.current) {
          rawStreamRef.current.getTracks().forEach((t) => t.stop());
          rawStreamRef.current = null;
        }

        audioService.cleanup();
      } catch {
        // Track may already be stopped
      }
    }
  }, [shouldConnect]);

  // Re-publish track when noise suppression settings change
  useEffect(() => {
    if (!shouldConnect || !audioTrackPublished || !localParticipant) return;
    if (connectionState !== ConnectionState.Connected) return;

    const republishTrack = async () => {
      try {
        // Unpublish current track
        if (publishedTrackRef.current) {
          await localParticipant.unpublishTrack(publishedTrackRef.current);
          publishedTrackRef.current.stop();
          publishedTrackRef.current = null;
        }

        if (rawStreamRef.current) {
          rawStreamRef.current.getTracks().forEach((t) => t.stop());
          rawStreamRef.current = null;
        }

        audioService.cleanup();

        // Get new processed stream
        const processedStream = await getProcessedAudioStream();
        if (!processedStream) return;

        const audioTrack = processedStream.getAudioTracks()[0];
        if (!audioTrack) return;

        // Create and publish new track
        const localAudioTrack = await createLocalAudioTrack({
          deviceId: audioTrack.getSettings().deviceId,
        });

        await localAudioTrack.replaceTrack(audioTrack);

        await localParticipant.publishTrack(localAudioTrack, {
          name: "microphone",
          source: Track.Source.Microphone,
        });

        publishedTrackRef.current = localAudioTrack;

        debugLog(
          "NOISE_SUPPRESSION",
          "NS_TRACK_REPUBLISHED",
          "Audio track republished with new settings",
        );
      } catch (err) {
        debugLog("NOISE_SUPPRESSION", "NS_REPUBLISH_ERROR", err);
      }
    };

    // Debounce to avoid rapid changes
    const timeoutId = setTimeout(republishTrack, 200);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.nsState]);

  // Toggle mute using LiveKit's track toggle when available, fallback to manual
  const toggleMute = useCallback(async () => {
    if (microphoneToggle.toggle) {
      await microphoneToggle.toggle();
    } else if (localParticipant) {
      const newState = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
    }

    // If unmuting while deafened, undeafen
    if (!isMicrophoneEnabled && isDeafened) {
      setIsDeafened(false);
    }
  }, [microphoneToggle, localParticipant, isMicrophoneEnabled, isDeafened]);

  // Toggle deafen
  const toggleDeafen = useCallback(async () => {
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);

    // Mute mic when deafening, unmute when undeafening
    if (newDeafenedState && isMicrophoneEnabled) {
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(false);
      }
    } else if (!newDeafenedState && !isMicrophoneEnabled) {
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(true);
      }
    }
  }, [isDeafened, isMicrophoneEnabled, localParticipant]);

  // Disconnect handler
  const disconnect = useCallback(() => {
    disconnectButtonProps.onClick();
    setOuterState("DISCONNECTED");
    setShouldConnect(false);
    setAudioTrackPublished(false);

    // Cleanup
    if (publishedTrackRef.current) {
      publishedTrackRef.current.stop();
      publishedTrackRef.current = null;
    }

    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }

    audioService.cleanup();
  }, [disconnectButtonProps, setOuterState, setShouldConnect]);

  return (
    <SubCallContext.Provider
      value={{
        disconnect,
        connect: () => connect(),
        toggleMute,
        isDeafened,
        toggleDeafen,
        isMuted: !isMicrophoneEnabled,
        connectionState,
      }}
    >
      {children}
    </SubCallContext.Provider>
  );
}

// Types
type CallContextValue = {
  getCallToken: (callId: string) => Promise<string>;
  shouldConnect: boolean;
  outerState: string;
  setToken: (input: string) => void;
  connect: () => void;
  setUserVolumes: (userId: string, volume: number) => void;
  setOuterState: (input: string) => void;
  setShouldConnect: (input: boolean) => void;
};

type SubCallContextValue = {
  disconnect: () => void;
  connect: () => void;
  toggleMute: () => void;
  isDeafened: boolean;
  toggleDeafen: () => void;
  isMuted: boolean;
  connectionState: ConnectionState;
};
