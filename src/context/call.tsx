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
  const { data, set, debugLog } = useStorageContext();
  const dlog = (...args: any[]) => {
    try {
      // debugLog signature expects (section, label, payload?). We call with up to 3 args.
      // Use typed indexes to appease TypeScript.
      // @ts-ignore - ensure we don't crash if debugLog signature differs slightly
      debugLog?.(args[0] as string, args[1] as string, args[2]);
    } catch (err) {
      // ignore
    }
    // ensure something visible in console
    try {
      // eslint-disable-next-line no-console
      console.debug("CALL_PROVIDER", ...args);
    } catch (err) {}
  };
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
    [data.call_userVolumes, set]
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
      dlog("CALL_PROVIDER", "INCOMING_INVITE", lastMessage?.data);
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
    dlog("CALL_PROVIDER", "CONNECT_INIT", { shouldConnect, token });
    setOuterState("CONNECTING");
    setShouldConnect(true);
  }, []);

  const getCallToken = useCallback(
    async (callId: string) => {
      dlog("CALL_PROVIDER", "GET_CALL_TOKEN", { callId });
      return send("call_token", {
        call_id: callId,
      }).then((data) => {
        dlog("CALL_PROVIDER", "GET_CALL_TOKEN_RESULT", { callId, data });
        if (data.type !== "error") {
          return data.data.call_token ?? "error";
        }
        return "error";
      });
    },
    [send]
  );

  const handleAcceptCall = useCallback(() => {
    dlog("CALL_PROVIDER", "ACCEPT_CALL", { newCallData });
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
        onConnected={() => {
          dlog("CALL_PROVIDER", "ROOM_CONNECTED", { token });
          setOuterState("CONNECTED");
        }}
        onDisconnected={() => {
          dlog("CALL_PROVIDER", "ROOM_DISCONNECTED");
          setOuterState("DISCONNECTED");
        }}
      >
        <RoomAudioRenderer />
        <SubCallProvider>{children}</SubCallProvider>
      </LiveKitRoom>
    </CallContext.Provider>
  );
}

// Sub Provider Component - handles call functionality within room context
// ... imports stay same ...

// Sub Provider Component - handles call functionality within room context
function SubCallProvider({ children }: { children: React.ReactNode }) {
  const { setOuterState, setShouldConnect, connect, shouldConnect } =
    useCallContext();
  const { data, debugLog } = useStorageContext();
  const dlog = (...args: any[]) => {
    try {
      // @ts-ignore
      debugLog?.(args[0] as string, args[1] as string, args[2]);
    } catch (err) {}
    try {
      // eslint-disable-next-line no-console
      console.debug("SUB_CALL", ...args);
    } catch (err) {}
  };

  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { buttonProps: disconnectButtonProps } = useDisconnectButton({});
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
  });

  const [noiseSuppressionSupported, setNoiseSuppressionSupported] =
    useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [audioTrackPublished, setAudioTrackPublished] = useState(false);

  const publishedTrackRef = useRef<LocalAudioTrack | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  const storedUserVolumes = data.call_userVolumes as UserAudioSettings | null;

  useEffect(() => {
    setNoiseSuppressionSupported(audioService.isSupported());
  }, []);

  useEffect(() => {
    if (!room) return;
    const handleParticipantConnected = (participant: {
      identity: string;
      setVolume: (volume: number) => void;
    }) => {
      dlog("SUB_CALL", "PARTICIPANT_CONNECTED", {
        identity: participant.identity,
        storedVolume: storedUserVolumes?.[participant.identity],
      });
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

  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isDeafened;
    });
    if (localParticipant && shouldConnect) {
      dlog("SUB_CALL", "SET_LOCAL_METADATA", { deafened: isDeafened });
      localParticipant
        .setMetadata(JSON.stringify({ deafened: isDeafened }))
        .catch(() => {});
    }
  }, [isDeafened, localParticipant, shouldConnect]);

  const getProcessedAudioStream =
    useCallback(async (): Promise<MediaStream> => {
      // Default to RNNoise for improved suppression when not explicitly set
      const nsState = (data.nsState as number) ?? 3;
      const channelCount = (data.call_channelCount as number) || 2;
      const enableAudioGate = (data.enableAudioGate as boolean) ?? false;
      const audioThreshold = (data.audioThreshold as number) ?? -40;

      let algorithm: NoiseSuppressionAlgorithm | "off" = "off";
      let needsCustomProcessing = false;

      switch (nsState) {
        case 0:
          algorithm = "off";
          break;
        case 1:
        case 2:
          algorithm = "speex";
          needsCustomProcessing = nsState >= 2;
          break;
        case 3:
          algorithm = "rnnoise";
          needsCustomProcessing = true;
          break;
        default:
          algorithm = "off";
      }

      dlog("SUB_CALL", "GET_PROCESSED_AUDIO_STREAM_START", {
        nsState,
        channelCount,
        enableAudioGate,
        audioThreshold,
        noiseSuppressionSupported,
      });

      // 1. Get constraints
      const audioConstraints = audioService.getRecommendedConstraints(
        algorithm,
        channelCount
      );

      // Allow user override via storage: call_voiceIsolation
      const userVoiceIsolationSetting =
        (data.call_voiceIsolation as boolean) ?? true;
      const requestedAudioConstraints = {
        ...(audioConstraints as Record<string, unknown>),
      } as Record<string, unknown>;
      if (
        !userVoiceIsolationSetting &&
        "voiceIsolation" in requestedAudioConstraints
      ) {
        delete requestedAudioConstraints.voiceIsolation;
      }

      // Log if voiceIsolation is requested/available
      dlog("SUB_CALL", "VOICE_ISOLATION_SUPPORT", {
        requested:
          requestedAudioConstraints &&
          (requestedAudioConstraints as any).voiceIsolation === true,
        supported: audioService.isVoiceIsolationSupported(),
        userEnabled: userVoiceIsolationSetting,
      });

      dlog("SUB_CALL", "AUDIO_CONSTRAINTS", { audioConstraints });

      // 2. Acquire raw stream
      // We must stop previous tracks before requesting new ones to avoid device busy errors
      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const inputStream = await navigator.mediaDevices.getUserMedia({
        audio: requestedAudioConstraints,
        video: false,
      });

      dlog("SUB_CALL", "RAW_STREAM_ACQUIRED", {
        audioTracks: inputStream.getAudioTracks().map((t) => t.getSettings()),
        trackCount: inputStream.getAudioTracks().length,
      });

      rawStreamRef.current = inputStream;

      // 3. Process stream if needed
      if (
        needsCustomProcessing &&
        algorithm !== "off" &&
        noiseSuppressionSupported
      ) {
        try {
          const gateOptions = enableAudioGate
            ? { threshold: audioThreshold, maxChannels: channelCount }
            : undefined;

          const processed = await audioService.processStream(
            inputStream,
            {
              algorithm: algorithm as NoiseSuppressionAlgorithm,
              maxChannels: channelCount,
            },
            gateOptions
          );
          dlog("SUB_CALL", "PROCESSED_STREAM_WITH_NS", {
            originalTracks: inputStream
              .getAudioTracks()
              .map((t) => t.getSettings()),
            processedTracks: processed
              .getAudioTracks()
              .map((t) => t.getSettings()),
          });
          return processed;
        } catch (err) {
          dlog("CALL_CONTEXT", "NS_ERROR", err);
          return inputStream;
        }
      }

      if (enableAudioGate && noiseSuppressionSupported) {
        try {
          const processedGate = await audioService.processStreamWithGate(
            inputStream,
            {
              threshold: audioThreshold,
              maxChannels: channelCount,
            }
          );
          dlog("SUB_CALL", "PROCESSED_STREAM_WITH_GATE", {
            originalTracks: inputStream
              .getAudioTracks()
              .map((t) => t.getSettings()),
            processedTracks: processedGate
              .getAudioTracks()
              .map((t) => t.getSettings()),
          });
          return processedGate;
        } catch (err) {
          dlog("CALL_CONTEXT", "GATE_ERROR", err);
          return inputStream;
        }
      }

      dlog("SUB_CALL", "RETURN_RAW_STREAM", {
        trackCount: inputStream.getAudioTracks().length,
      });
      return inputStream;
    }, [
      data.nsState,
      data.call_channelCount,
      data.enableAudioGate,
      data.audioThreshold,
      noiseSuppressionSupported,
      debugLog,
    ]);

  // Publish audio track
  useEffect(() => {
    if (!localParticipant || !shouldConnect || audioTrackPublished) return;
    if (connectionState !== ConnectionState.Connected) return;

    let isMounted = true;

    const publishAudioTrack = async () => {
      try {
        const processedStream = await getProcessedAudioStream();
        if (!isMounted || !processedStream) return;

        const audioTrack = processedStream.getAudioTracks()[0];
        if (!audioTrack) return;

        // CRITICAL FIX: Do NOT use createLocalAudioTrack here.
        // createLocalAudioTrack attempts to open the microphone (again), but we already
        // opened it in getProcessedAudioStream. Opening it twice causes errors on many OSs.
        // Instead, wrap the existing processed track directly.
        dlog("SUB_CALL", "PUBLISHING_TRACK_START", {
          trackSettings: audioTrack.getSettings(),
        });
        const localAudioTrack = new LocalAudioTrack(audioTrack);

        const pub = await localParticipant.publishTrack(localAudioTrack, {
          name: "microphone",
          source: Track.Source.Microphone,
        });

        dlog("SUB_CALL", "TRACK_PUBLISHED", {
          name: "microphone",
          publishedTrackTrackSid: pub?.trackSid ?? null,
        });

        if (isMounted) {
          publishedTrackRef.current = localAudioTrack;
          setAudioTrackPublished(true);
        } else {
          localAudioTrack.stop();
        }
      } catch (err) {
        dlog("NOISE_SUPPRESSION", "NS_PUBLISH_ERROR", {
          err,
        });
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
    getProcessedAudioStream,
    debugLog,
  ]);

  // Cleanup
  useEffect(() => {
    if (!shouldConnect) {
      dlog("SUB_CALL", "CLEANUP_START", { audioTrackPublished });
      if (publishedTrackRef.current) {
        publishedTrackRef.current.stop();
        publishedTrackRef.current = null;
      }
      setAudioTrackPublished(false);
      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach((t) => t.stop());
        rawStreamRef.current = null;
      }
      audioService.cleanup();
      dlog("SUB_CALL", "CLEANUP_DONE");
    }
  }, [shouldConnect]);

  // Republish on settings change
  useEffect(() => {
    if (!shouldConnect || !audioTrackPublished || !localParticipant) return;
    if (connectionState !== ConnectionState.Connected) return;

    let isMounted = true;

    const republishTrack = async () => {
      try {
        dlog("SUB_CALL", "REPUBLISH_TRACK_START", {
          nsState: data.nsState,
          enableAudioGate: data.enableAudioGate,
          audioThreshold: data.audioThreshold,
        });
        // 1. Unpublish & Stop existing
        if (publishedTrackRef.current) {
          await localParticipant.unpublishTrack(publishedTrackRef.current);
          publishedTrackRef.current.stop();
          publishedTrackRef.current = null;
        }

        audioService.cleanup();

        // 2. Get new stream
        const processedStream = await getProcessedAudioStream();
        if (!processedStream || !isMounted) return;

        const audioTrack = processedStream.getAudioTracks()[0];
        if (!audioTrack) return;

        // 3. Publish new
        const localAudioTrack = new LocalAudioTrack(audioTrack);

        const newPub = await localParticipant.publishTrack(localAudioTrack, {
          name: "microphone",
          source: Track.Source.Microphone,
        });

        if (isMounted) {
          publishedTrackRef.current = localAudioTrack;
        } else {
          localAudioTrack.stop();
        }
        dlog("SUB_CALL", "REPUBLISH_TRACK_SUCCESS", {
          publishedTrackTrackSid: newPub?.trackSid ?? null,
        });
      } catch (err) {
        dlog("NOISE_SUPPRESSION", "NS_REPUBLISH_ERROR", { err });
      }
    };

    const timeoutId = setTimeout(republishTrack, 500); // Increased debounce to 500ms for safety
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [data.nsState, data.enableAudioGate, data.audioThreshold]);

  // ... toggleMute, toggleDeafen, disconnect handlers remain the same ...
  // (Assuming you have them from your original code, paste them here)

  const toggleMute = useCallback(async () => {
    dlog("SUB_CALL", "TOGGLE_MUTE_START", { isMicrophoneEnabled });
    if (microphoneToggle.toggle) {
      await microphoneToggle.toggle();
    } else if (localParticipant) {
      const newState = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
    }
    if (!isMicrophoneEnabled && isDeafened) {
      setIsDeafened(false);
    }
    dlog("SUB_CALL", "TOGGLE_MUTE_END", {
      isMicrophoneEnabled: !isMicrophoneEnabled,
    });
  }, [microphoneToggle, localParticipant, isMicrophoneEnabled, isDeafened]);

  const toggleDeafen = useCallback(async () => {
    dlog("SUB_CALL", "TOGGLE_DEAFEN_START", {
      isDeafened,
      isMicrophoneEnabled,
    });
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);
    if (newDeafenedState && isMicrophoneEnabled) {
      if (localParticipant) await localParticipant.setMicrophoneEnabled(false);
    } else if (!newDeafenedState && !isMicrophoneEnabled) {
      if (localParticipant) await localParticipant.setMicrophoneEnabled(true);
    }
    dlog("SUB_CALL", "TOGGLE_DEAFEN_END", { newDeafenedState });
  }, [isDeafened, isMicrophoneEnabled, localParticipant]);

  const disconnect = useCallback(() => {
    dlog("SUB_CALL", "DISCONNECT_START", { connectionState });
    disconnectButtonProps.onClick();
    setOuterState("DISCONNECTED");
    setShouldConnect(false);
    setAudioTrackPublished(false);

    if (publishedTrackRef.current) {
      publishedTrackRef.current.stop();
      publishedTrackRef.current = null;
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }
    audioService.cleanup();
    dlog("SUB_CALL", "DISCONNECT_END");
  }, [disconnectButtonProps, setOuterState, setShouldConnect]);

  // Verbose event listeners for the room - many events for debugging only
  useEffect(() => {
    if (!room) return;
    const events: Array<{
      event: RoomEvent;
      handler: (...args: any[]) => void;
    }> = [
      {
        event: RoomEvent.ParticipantConnected,
        handler: (p) =>
          dlog?.("SUB_CALL", "EVENT_PARTICIPANT_CONNECTED", {
            identity: p.identity,
          }),
      },
      {
        event: RoomEvent.ParticipantDisconnected,
        handler: (p) =>
          dlog?.("SUB_CALL", "EVENT_PARTICIPANT_DISCONNECTED", {
            identity: p.identity,
          }),
      },
      {
        event: RoomEvent.TrackPublished,
        handler: (p, tx) =>
          dlog?.("SUB_CALL", "EVENT_TRACK_PUBLISHED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.TrackUnpublished,
        handler: (p, tx) =>
          dlog?.("SUB_CALL", "EVENT_TRACK_UNPUBLISHED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.TrackMuted,
        handler: (p, tx) =>
          dlog?.("SUB_CALL", "EVENT_TRACK_MUTED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.TrackUnmuted,
        handler: (p, tx) =>
          dlog?.("SUB_CALL", "EVENT_TRACK_UNMUTED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.ActiveSpeakersChanged,
        handler: (speakers) =>
          dlog?.("SUB_CALL", "EVENT_ACTIVE_SPEAKERS", { speakers }),
      },
      {
        event: RoomEvent.ConnectionQualityChanged,
        handler: (participant, quality) =>
          dlog?.("SUB_CALL", "EVENT_CONN_QUALITY", {
            participant: participant?.identity,
            quality,
          }),
      },
    ];
    events.forEach(({ event, handler }) => room.on(event, handler));
    return () => {
      events.forEach(({ event, handler }) => room.off(event, handler));
    };
  }, [room]);

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
