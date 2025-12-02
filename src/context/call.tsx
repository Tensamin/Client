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
  useConnectionState,
} from "@livekit/components-react";
import {
  RoomEvent,
  LocalAudioTrack,
  ConnectionState,
  createLocalAudioTrack,
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
  const { data, debugLog } = useStorageContext();
  const { lastMessage, send } = useSocketContext();
  const { get, currentReceiverUuid } = useUserContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");
  const [dontSendInvite, setDontSendInvite] = useState(false);
  const [callId, setCallId] = useState("");

  // Connect function
  const connectPromiseRef = useRef<{
    resolve: (() => void) | null;
    reject: ((err?: any) => void) | null;
  } | null>(null);

  const connect = useCallback(
    (token: string, callId: string) => {
      debugLog("CALL_PROVIDER", "CONNECTING");
      setOuterState("CONNECTING");
      setToken(token);
      setCallId(callId);
      setShouldConnect(true);

      // If there is a pending connect promise, cancel it
      if (connectPromiseRef.current && connectPromiseRef.current.reject) {
        connectPromiseRef.current.reject({ message: "replaced by new connect" });
      }

      return new Promise<void>((resolve, reject) => {
        connectPromiseRef.current = { resolve, reject };
      });
    },
    [debugLog, setToken]
  );

  // Disconnect function
  const disconnect = useCallback(() => {
    debugLog("CALL_PROVIDER", "DISCONNECT_START");
    setOuterState("DISCONNECTED");
    setShouldConnect(false);
    setToken("");
    if (connectPromiseRef.current && connectPromiseRef.current.reject) {
      connectPromiseRef.current.reject({ message: "disconnect" });
      connectPromiseRef.current = null;
    }
    debugLog("CALL_PROVIDER", "DISCONNECT_END");
  }, [debugLog, setToken]);

  // Call invites
  const [newCallWidgetOpen, setNewCallWidgetOpen] = useState(false);
  const [newCallData, setNewCallData] = useState<{
    call_id: string;
    sender_id: string;
  } | null>(null);
  const [newCaller, setNewCaller] = useState<User | null>(null);
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
  }, [lastMessage, get, debugLog]);

  // Call tokens
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
    [send, debugLog]
  );

  const handleAcceptCall = useCallback(() => {
    debugLog("CALL_PROVIDER", "ACCEPT_CALL", { newCallData });
    setNewCallWidgetOpen(false);
    if (!newCallData?.call_id) return;
    getCallToken(newCallData.call_id).then((token) => {
      setDontSendInvite(true);
      connect(token, newCallData.call_id);
    });
  }, [newCallData, getCallToken, connect, debugLog]);

  return (
    <CallContext.Provider
      value={{
        setDontSendInvite,
        disconnect,
        getCallToken,
        shouldConnect,
        outerState,
        connect,
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
                  el.target.dispatchEvent(new Event("play"));
                }}
                onClick={handleAcceptCall}
              >
                <Icon.PhoneForwarded />
              </Button>
            </div>
            <audio loop hidden autoPlay src="/assets/sounds/call2.wav" />
          </DialogContent>
        </Dialog>
      )}

      <LiveKitRoom
        token={token}
        serverUrl="wss://call.tensamin.net"
        connect={shouldConnect}
        audio={false}
        video={false}
        screen={false}
        simulateParticipants={
          (data.call_amountOfSimulatedParticipants as number) ?? 0
        }
        onConnected={() => {
          debugLog("CALL_PROVIDER", "ROOM_CONNECTED", { token });
          setOuterState("CONNECTED");
          if (!dontSendInvite) {
            send("call_invite", {
              receiver_id: currentReceiverUuid,
              call_id: callId,
            }).then((data) => {
              if (data.type !== "error") {
                toast.success("Call invite sent successfully");
              } else {
                toast.error("Failed to send call invite");
              }
            });
          }
          setDontSendInvite(false);

          // Resolve the pending connect promise if one exists
          if (connectPromiseRef.current && connectPromiseRef.current.resolve) {
            connectPromiseRef.current.resolve();
            connectPromiseRef.current = null;
          }
        }}
        onDisconnected={() => {
          debugLog("CALL_PROVIDER", "ROOM_DISCONNECTED");
          setOuterState("DISCONNECTED");
          // If we had a pending connection, reject its promise
          if (connectPromiseRef.current && connectPromiseRef.current.reject) {
            connectPromiseRef.current.reject({ message: "Room disconnected before connect finished" });
            connectPromiseRef.current = null;
          }
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
  const { shouldConnect } = useCallContext();
  const { data, debugLog } = useStorageContext();

  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();

  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const [isDeafened, setIsDeafened] = useState(false);

  const storedUserVolumes = data.call_userVolumes as UserAudioSettings | null;

  // User Volume Management
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
  }, [room, storedUserVolumes, debugLog]);

  // Custom Audio Init for Noise Suppression
  useEffect(() => {
    let mounted = true;
    let createdTrack: LocalAudioTrack | null = null;

    const initAudio = async () => {
      if (
        connectionState === ConnectionState.Connected &&
        shouldConnect &&
        localParticipant &&
        !localTrack
      ) {
        try {
          createdTrack = await createLocalAudioTrack({
            echoCancellation:
              (data.call_enableEchoCancellation as boolean) ?? true,
            noiseSuppression:
              (data.call_enableNoiseSuppression as boolean) ?? true,
            autoGainControl:
              (data.call_enableAutoGainControl as boolean) ?? true,
            deviceId: (data.call_inputDeviceID as string) ?? "default",
            sampleRate: (data.call_sampleRate as number) ?? 48000,
            channelCount: (data.call_channelCount as number) || 2,
          });

          if (!mounted) {
            createdTrack.stop();
            return;
          }

          const audioContext = audioService.getAudioContext();
          createdTrack.setAudioContext(audioContext);

          const processor = audioService.getProcessor({
            algorithm: "rnnoise",
            maxChannels: (data.call_channelCount as number) ?? 2,
            sensitivity: (data.call_noiseSensitivity as number) ?? 0.5,
          });
          await createdTrack.setProcessor(processor);

          await localParticipant.publishTrack(createdTrack);
          setLocalTrack(createdTrack);
        } catch (error) {
          debugLog("SUB_CALL_CONTEXT", "INIT_AUDIO_ERROR", error);
          toast.error("Failed to initialize microphone.");
          if (createdTrack) createdTrack.stop();
        }
      }
    };

    initAudio();

    return () => {
      mounted = false;
    };
  }, [
    connectionState,
    shouldConnect,
    localParticipant,
    localTrack,
    data,
    debugLog,
  ]);

  // Deafen logic
  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isDeafened;
    });
    if (localParticipant && shouldConnect && connectionState === "connected") {
      localParticipant
        .setMetadata(JSON.stringify({ deafened: isDeafened }))
        .catch(() => {});
    }
  }, [isDeafened, localParticipant, shouldConnect, connectionState, debugLog]);

  // Toggle Mute
  const toggleMute = useCallback(async () => {
    if (!localTrack) return;

    debugLog("SUB_CALL", "TOGGLE_MUTE", { currentMuted: localTrack.isMuted });

    if (localTrack.isMuted) {
      await localTrack.unmute();
    } else {
      await localTrack.mute();
    }

    setLocalTrack(
      Object.assign(
        Object.create(Object.getPrototypeOf(localTrack)),
        localTrack
      )
    );

    if (localTrack.isMuted && isDeafened) {
      setIsDeafened(false);
    }
  }, [localTrack, isDeafened, debugLog]);

  // Toggle Deafen
  const toggleDeafen = useCallback(async () => {
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);

    if (localTrack) {
      if (newDeafenedState && !localTrack.isMuted) {
        await localTrack.mute();
      } else if (!newDeafenedState && localTrack.isMuted) {
        await localTrack.unmute();
      }

      setLocalTrack(
        Object.assign(
          Object.create(Object.getPrototypeOf(localTrack)),
          localTrack
        )
      );
    }
  }, [isDeafened, localTrack]);

  // Cleanup
  useEffect(() => {
    if (!shouldConnect && localTrack) {
      debugLog("SUB_CALL_CONTEXT", "CLEANUP_TRACK");
      localTrack.stop();
      setLocalTrack(null);
      audioService.cleanup();
    }
  }, [shouldConnect, localTrack, debugLog]);

  useEffect(() => {
    if (!shouldConnect && localTrack) {
      debugLog("SUB_CALL_CONTEXT", "CLEANUP_TRACK");
      (async () => {
        try {
          if (localParticipant && localParticipant?.unpublishTrack) {
            await localParticipant.unpublishTrack(localTrack);
          }
        } catch (err) {
          debugLog("SUB_CALL_CONTEXT", "UNPUBLISH_ERROR", err);
        }
        try {
          localTrack.stop();
        } catch (err) {
          debugLog("SUB_CALL_CONTEXT", "STOP_TRACK_ERROR", err);
        }
        setLocalTrack(null);
        audioService.cleanup();
      })();
    }
  }, [shouldConnect, localTrack, localParticipant, debugLog]);

  useEffect(() => {
    return () => {
      if (localTrack) {
        try {
          if (localParticipant && localParticipant?.unpublishTrack) {
            localParticipant.unpublishTrack(localTrack).catch(() => {});
          }
        } catch {}
        try {
          localTrack.stop();
        } catch {}
        audioService.cleanup();
        setLocalTrack(null);
      }
    };
  }, [localParticipant, localTrack]);

  return (
    <SubCallContext.Provider
      value={{
        toggleMute,
        isDeafened,
        toggleDeafen,
        isMuted: localTrack ? localTrack.isMuted : true,
        connectionState,
      }}
    >
      {children}
    </SubCallContext.Provider>
  );
}

// Types
type CallContextValue = {
  setDontSendInvite: (input: boolean) => void;
  getCallToken: (callId: string, sendInvite?: boolean) => Promise<string>;
  shouldConnect: boolean;
  outerState: string;
  connect: (token: string, callId: string) => Promise<void>;
  setOuterState: (input: string) => void;
  setShouldConnect: (input: boolean) => void;
  disconnect: () => void;
};

type SubCallContextValue = {
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
