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
import { useStorageContext, rawDebugLog } from "@/context/storage";
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";
import { usePageContext } from "@/context/page";

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
  const { lastMessage, send } = useSocketContext();
  const { get, currentReceiverUuid } = useUserContext();
  const { setPage } = usePageContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");
  const [dontSendInvite, setDontSendInvite] = useState(false);
  const [callId, setCallId] = useState("");

  // Connect function
  const connectPromiseRef = useRef<{
    resolve: (() => void) | null;
    reject: ((error?: { message: string }) => void) | null;
  } | null>(null);

  const connect = useCallback(
    (token: string, callId: string) => {
      rawDebugLog("Call Context", "Connecting...");
      setOuterState("CONNECTING");
      setToken(token);
      setCallId(callId);
      setShouldConnect(true);

      // If there is a pending connect promise, cancel it
      if (connectPromiseRef.current && connectPromiseRef.current.reject) {
        connectPromiseRef.current.reject({
          message: "replaced by new connect",
        });
      }

      return new Promise<void>((resolve, reject) => {
        connectPromiseRef.current = { resolve, reject };
      });
    },
    [setToken]
  );

  // Disconnect function
  const disconnect = useCallback(() => {
    setPage("home");
    rawDebugLog("Call Context", "Disconnect");
    setOuterState("DISCONNECTED");
    setShouldConnect(false);
    setToken("");
    if (connectPromiseRef.current && connectPromiseRef.current.reject) {
      connectPromiseRef.current.reject({ message: "disconnect" });
      connectPromiseRef.current = null;
    }
  }, [setToken, setPage]);

  // Call invites
  const [newCallWidgetOpen, setNewCallWidgetOpen] = useState(false);
  const [newCallData, setNewCallData] = useState<{
    call_id: string;
    sender_id: string;
  } | null>(null);
  const [newCaller, setNewCaller] = useState<User | null>(null);
  useEffect(() => {
    if (lastMessage?.type === "call_invite") {
      rawDebugLog("Call Context", "Incoming Invite", lastMessage?.data);
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
  }, [lastMessage, get]);

  // Call tokens
  const getCallToken = useCallback(
    async (callId: string) => {
      rawDebugLog("Call Context", "Getting call token", { callId });
      return send("call_token", {
        call_id: callId,
      }).then((data) => {
        rawDebugLog("Call Context", "Got call token", { callId, data });
        if (data.type !== "error") {
          return data.data.call_token ?? "error";
        }
        return "error";
      });
    },
    [send]
  );

  const handleAcceptCall = useCallback(() => {
    rawDebugLog("Call Context", "Accept Call", { newCallData });
    setNewCallWidgetOpen(false);
    if (!newCallData?.call_id) return;
    getCallToken(newCallData.call_id).then((token) => {
      setDontSendInvite(true);
      connect(token, newCallData.call_id);
    });
  }, [newCallData, getCallToken, connect]);

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
        onConnected={() => {
          rawDebugLog("Call Context", "Room connected", { token });
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
          rawDebugLog("Call Context", "Room disconnected");
          setOuterState("DISCONNECTED");
          // If we had a pending connection, reject its promise
          if (connectPromiseRef.current && connectPromiseRef.current.reject) {
            connectPromiseRef.current.reject({
              message: "Room disconnected before connect finished",
            });
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
  const { data } = useStorageContext();

  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();

  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

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
  }, [room, storedUserVolumes]);

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
          const enableNoiseSuppression =
            (data.call_enableNoiseSuppression as boolean) ?? true;

          createdTrack = await createLocalAudioTrack({
            echoCancellation:
              (data.call_enableEchoCancellation as boolean) ?? false,
            noiseSuppression: false,
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

          // Only apply custom noise processor when noise suppression is enabled
          if (enableNoiseSuppression) {
            const audioContext = audioService.getAudioContext();
            createdTrack.setAudioContext(audioContext);

            // Calculate threshold from sensitivity (0-1)
            // Higher sensitivity = lower threshold (opens easier)
            // 0.0 -> -20dB
            // 0.5 -> -55dB
            // 1.0 -> -90dB
            const sensitivity = (data.call_noiseSensitivity as number) ?? 0.5;
            const threshold = -20 - sensitivity * 70;
            const inputGain = (data.call_inputGain as number) ?? 1.0;

            const processor = audioService.getProcessor({
              enableNoiseGate: (data.call_enableNoiseGate as boolean) ?? true,
              algorithm: "rnnoise",
              maxChannels: (data.call_channelCount as number) ?? 2,
              sensitivity: threshold,
              inputGain: inputGain,
            });
            await createdTrack.setProcessor(processor);
          }

          await localParticipant.publishTrack(createdTrack);
          setLocalTrack(createdTrack);
          setIsMuted(createdTrack.isMuted);
        } catch (error) {
          rawDebugLog("Sub Call Context", "INIT_AUDIO_ERROR", error);
          toast.error("Failed to initialize microphone.");
          if (createdTrack) createdTrack.stop();
        }
      }
    };

    initAudio();

    return () => {
      mounted = false;
    };
  }, [connectionState, shouldConnect, localParticipant, localTrack, data]);

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
  }, [isDeafened, localParticipant, shouldConnect, connectionState]);

  // Toggle Mute
  const toggleMute = useCallback(async () => {
    if (!localTrack) return;

    rawDebugLog("SUB_CALL", "TOGGLE_MUTE", {
      currentMuted: localTrack.isMuted,
    });

    if (localTrack.isMuted) {
      await localTrack.unmute();
      if (isDeafened) {
        setIsDeafened(false);
      }
    } else {
      await localTrack.mute();
    }

    setIsMuted(localTrack.isMuted);
  }, [localTrack, isDeafened]);

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

      setIsMuted(localTrack.isMuted);
    }
  }, [isDeafened, localTrack]);

  // Cleanup
  useEffect(() => {
    if (!shouldConnect && localTrack) {
      rawDebugLog("Sub Call Context", "Cleanup Track");
      localTrack.stop();
      setLocalTrack(null);
      setIsMuted(true);
      audioService.cleanup();
    }
  }, [shouldConnect, localTrack]);

  useEffect(() => {
    if (!shouldConnect && localTrack) {
      rawDebugLog("Sub Call Context", "Cleanup Track");
      (async () => {
        try {
          if (localParticipant && localParticipant?.unpublishTrack) {
            await localParticipant.unpublishTrack(localTrack);
          }
        } catch (err) {
          toast.error("Error during track unpublish!");
          rawDebugLog("Sub Call Context", "Error during unpublish", err, "red");
        }
        try {
          localTrack.stop();
        } catch (err) {
          rawDebugLog("Sub Call Context", "Error stopping track", err, "red");
        }
        setLocalTrack(null);
        setIsMuted(true);
        audioService.cleanup();
      })();
    }
  }, [shouldConnect, localTrack, localParticipant]);

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
        setIsMuted(true);
      }
    };
  }, [localParticipant, localTrack]);

  return (
    <SubCallContext.Provider
      value={{
        toggleMute,
        isDeafened,
        toggleDeafen,
        isMuted,
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
