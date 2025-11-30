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
  ConnectionState,
  Room,
} from "livekit-client";
import { toast } from "sonner";
import * as Icon from "lucide-react";

// Lib Imports
import { audioService } from "@/lib/audioService";

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
  const { lastMessage, send } = useSocketContext();
  const { get, ownUserHasPremium } = useUserContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");

  // Disconnect function
  const disconnect = useCallback(() => {
    console.trace("Disconnect called");
    debugLog("CALL_PROVIDER", "DISCONNECT_START");
    setOuterState("DISCONNECTED");
    setShouldConnect(false);
    debugLog("CALL_PROVIDER", "DISCONNECT_END");
  }, []);

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
      debugLog("CALL_PROVIDER", "INCOMING_INVITE", lastMessage?.data);
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
    debugLog("CALL_PROVIDER", "CONNECT_INIT", { shouldConnect, token });
    setOuterState("CONNECTING");
    setShouldConnect(true);
  }, []);

  const getCallToken = useCallback(
    async (callId: string) => {
      debugLog("CALL_PROVIDER", "GET_CALL_TOKEN", { callId });
      return send("call_token", {
        call_id: callId,
      }).then((data) => {
        debugLog("CALL_PROVIDER", "GET_CALL_TOKEN_RESULT", { callId, data });
        if (data.type !== "error") {
          return data.data.call_token ?? "error";
        }
        return "error";
      });
    },
    [send]
  );

  const handleAcceptCall = useCallback(() => {
    debugLog("CALL_PROVIDER", "ACCEPT_CALL", { newCallData });
    setNewCallWidgetOpen(false);
    if (!newCallData?.call_id) return;
    getCallToken(newCallData.call_id).then((token) => {
      setToken(token);
      connect();
    });
  }, [newCallData, getCallToken, connect]);

  // Custom room for audio processing
  const roomRef = useRef<Room | null>(null);
  if (!roomRef.current) {
    roomRef.current = new Room({
      dynacast: (data.call_enableDynacast as boolean) ?? true,
      adaptiveStream: (data.call_enableAdaptiveStream as boolean) ?? true,
      audioCaptureDefaults: {
        echoCancellation: (data.call_enableEchoCancellation as boolean) ?? true,
        noiseSuppression: (data.call_enableNoiseSuppression as boolean) ?? true,
        autoGainControl: (data.call_enableAutoGainControl as boolean) ?? true,
        voiceIsolation: (data.call_enabeVoiceIsolation as boolean) ?? true,
        latency: (data.call_latency as number) ?? 0.02,
        channelCount: (data.call_channelCount as number) || 2,
        sampleRate: (data.call_sampleRate as number) ?? 48000,
        sampleSize: (data.call_sampleSize as number) ?? 16,
        deviceId: (data.call_inputDeviceID as string) ?? "default",
      },
      audioOutput: {
        deviceId: (data.call_outputDeviceID as string) ?? "default",
      },
      webAudioMix: {
        audioContext: audioService.getAudioContext(),
      },
      loggerName: "CALL_CONTEXT",
    });
    debugLog("CALL_XONTEXT", "ROOM_CREATED", roomRef.current);
  }
  const room = roomRef.current!;
  useEffect(() => {
    return () => {
      try {
        roomRef.current?.disconnect();
      } finally {
        roomRef.current = null;
      }
    };
  }, []);

  return (
    <CallContext.Provider
      value={{
        disconnect,
        getCallToken,
        shouldConnect,
        outerState,
        setToken,
        connect,
        setUserVolumes,
        setOuterState,
        setShouldConnect,
        room,
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
                  el.target.dispatchEvent(new Event("play"));
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

      <LiveKitRoom
        token={token}
        room={room}
        serverUrl="wss://call.tensamin.net"
        connect={shouldConnect}
        audio={true}
        simulateParticipants={
          (data.call_amountOfSimulatedParticipants as number) ?? 0
        }
        onConnected={() => {
          debugLog("CALL_PROVIDER", "ROOM_CONNECTED", { token });
          setOuterState("CONNECTED");
        }}
        onDisconnected={() => {
          debugLog("CALL_PROVIDER", "ROOM_DISCONNECTED");
          setOuterState("DISCONNECTED");
        }}
      >
        <RoomAudioRenderer />
        <SubCallProvider>{children}</SubCallProvider>
      </LiveKitRoom>
    </CallContext.Provider>
  );
}

// Sub Provider Component
function SubCallProvider({ children }: { children: React.ReactNode }) {
  const { connect, shouldConnect } = useCallContext();
  const { data, debugLog } = useStorageContext();

  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
  });

  const [isDeafened, setIsDeafened] = useState(false);
  const [audioTrackPublished, setAudioTrackPublished] = useState(false);

  const publishedTrackRef = useRef<LocalAudioTrack | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  const storedUserVolumes = data.call_userVolumes as UserAudioSettings | null;

  // Inital Volumes
  useEffect(() => {
    if (!room) return;
    const handleParticipantConnected = (participant: {
      identity: string;
      setVolume: (volume: number) => void;
    }) => {
      debugLog("SUB_CALL", "PARTICIPANT_CONNECTED", {
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

  // Mute audio tags on deafen
  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isDeafened;
    });
    if (localParticipant && shouldConnect && connectionState === "connected") {
      debugLog("SUB_CALL", "SET_LOCAL_METADATA", { deafened: isDeafened });
      localParticipant
        .setMetadata(JSON.stringify({ deafened: isDeafened }))
        .catch(() => {});
    }
  }, [isDeafened, localParticipant, shouldConnect]);

  // Cleanup
  useEffect(() => {
    if (!shouldConnect) {
      debugLog("SUB_CALL", "CLEANUP_START", { audioTrackPublished });
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
      debugLog("SUB_CALL", "CLEANUP_DONE");
    }
  }, [shouldConnect]);

  // Toggle Mute
  const toggleMute = useCallback(async () => {
    debugLog("SUB_CALL", "TOGGLE_MUTE_START", { isMicrophoneEnabled });
    if (microphoneToggle.toggle) {
      await microphoneToggle.toggle();
    } else if (localParticipant) {
      const newState = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
    }
    if (!isMicrophoneEnabled && isDeafened) {
      setIsDeafened(false);
    }
    debugLog("SUB_CALL", "TOGGLE_MUTE_END", {
      isMicrophoneEnabled: !isMicrophoneEnabled,
    });
  }, [microphoneToggle, localParticipant, isMicrophoneEnabled, isDeafened]);

  // Toggle Deafen
  const toggleDeafen = useCallback(async () => {
    debugLog("SUB_CALL", "TOGGLE_DEAFEN_START", {
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
    debugLog("SUB_CALL", "TOGGLE_DEAFEN_END", { newDeafenedState });
  }, [isDeafened, isMicrophoneEnabled, localParticipant]);

  // Room Event Subscriptions
  useEffect(() => {
    if (!room) return;
    const events: Array<{
      event: RoomEvent;
      handler: (...args: any[]) => void;
    }> = [
      {
        event: RoomEvent.ParticipantConnected,
        handler: (p) =>
          debugLog("SUB_CALL", "EVENT_PARTICIPANT_CONNECTED", {
            identity: p.identity,
          }),
      },
      {
        event: RoomEvent.ParticipantDisconnected,
        handler: (p) =>
          debugLog("SUB_CALL", "EVENT_PARTICIPANT_DISCONNECTED", {
            identity: p.identity,
          }),
      },
      {
        event: RoomEvent.TrackPublished,
        handler: (p, tx) =>
          debugLog("SUB_CALL", "EVENT_TRACK_PUBLISHED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.TrackUnpublished,
        handler: (p, tx) =>
          debugLog("SUB_CALL", "EVENT_TRACK_UNPUBLISHED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.TrackMuted,
        handler: (p, tx) =>
          debugLog("SUB_CALL", "EVENT_TRACK_MUTED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.TrackUnmuted,
        handler: (p, tx) =>
          debugLog("SUB_CALL", "EVENT_TRACK_UNMUTED", {
            participant: p?.identity,
            track: tx?.name,
          }),
      },
      {
        event: RoomEvent.ActiveSpeakersChanged,
        handler: (speakers) =>
          debugLog("SUB_CALL", "EVENT_ACTIVE_SPEAKERS", { speakers }),
      },
      {
        event: RoomEvent.ConnectionQualityChanged,
        handler: (participant, quality) =>
          debugLog("SUB_CALL", "EVENT_CONN_QUALITY", {
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
  room: Room;
  disconnect: () => void;
};

type SubCallContextValue = {
  connect: () => void;
  toggleMute: () => void;
  isDeafened: boolean;
  toggleDeafen: () => void;
  isMuted: boolean;
  connectionState: ConnectionState;
};

/*

  connect?: boolean;
  options?: RoomOptions;
  connectOptions?: RoomConnectOptions;
  onConnected?: () => void;
  onDisconnected?: (reason?: DisconnectReason) => void;
  onError?: (error: Error) => void;
  onMediaDeviceFailure?: (failure?: MediaDeviceFailure, kind?: MediaDeviceKind) => void;
  onEncryptionError?: (error: Error) => void;
  featureFlags?: FeatureFlags;

*/
