"use client";

// Package Imports
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import {
  ConnectionState,
  createLocalAudioTrack,
  LocalAudioTrack,
  RoomEvent,
} from "livekit-client";
import * as Icon from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// Lib Imports
import { audioService } from "@/lib/audioService";
import * as CommunicationValue from "@/lib/communicationValues";

// Context Imports
import { usePageContext } from "@/context/page";
import { useSocketContext } from "@/context/socket";
import { rawDebugLog, useStorageContext } from "@/context/storage";
import { useUserContext } from "@/context/user";

// Components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Types
import { UserAvatar } from "@/components/modals/raw";
import { User } from "@/lib/types";

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
  const { get, currentReceiverId } = useUserContext();
  const { setPage } = usePageContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");
  const [dontSendInvite, setDontSendInvite] = useState(false);
  const [callId, setCallId] = useState("");

  // Connect functions
  const connectPromiseRef = useRef<{
    resolve: (() => void) | null;
    reject: ((error?: { message: string }) => void) | null;
  } | null>(null);
  const performConnect = useCallback(
    (token: string, callId: string) => {
      rawDebugLog("Call Context", "Connecting...");
      setOuterState("CONNECTING");
      setToken(token);
      setCallId(callId);
      setShouldConnect(true);

      // Cancel pending connect
      if (connectPromiseRef.current && connectPromiseRef.current.reject) {
        connectPromiseRef.current.reject({
          message: "replaced by new connect",
        });
      }

      return new Promise<void>((resolve, reject) => {
        connectPromiseRef.current = { resolve, reject };
      });
    },
    [setToken],
  );
  const [switchCallDialogOpen, setSwitchCallDialogOpen] = useState(false);
  const [pendingCall, setPendingCall] = useState<{
    token: string;
    callId: string;
  } | null>(null);
  const connect = useCallback(
    (token: string, newCallId: string) => {
      if (shouldConnect && callId !== newCallId) {
        setPendingCall({ token, callId: newCallId });
        setSwitchCallDialogOpen(true);
        return Promise.resolve();
      }
      return performConnect(token, newCallId);
    },
    [shouldConnect, callId, performConnect],
  );

  // Handle call switching
  const handleSwitchCall = useCallback(() => {
    if (pendingCall) {
      performConnect(pendingCall.token, pendingCall.callId);
      setSwitchCallDialogOpen(false);
      setPendingCall(null);
    }
  }, [pendingCall, performConnect]);

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
    sender_id: number;
  } | null>(null);
  const [newCaller, setNewCaller] = useState<User | null>(null);
  useEffect(() => {
    if (lastMessage?.type === "call_invite") {
      const data = lastMessage.data as CommunicationValue.call_invite;
      rawDebugLog("Call Context", "Incoming Invite", data);
      setNewCallData({
        call_id: data.call_id,
        sender_id: data.sender_id,
      });
      get(data.sender_id, false).then((user) => {
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
      })
        .then((raw) => {
          const data = raw as CommunicationValue.call_token;
          rawDebugLog("Call Context", "Got call token", { callId, data });
          return data.call_token;
        })
        .catch(() => {
          toast.error("Failed to get call token");
          return "";
        });
    },
    [send],
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
        callId,
      }}
    >
      <AlertDialog
        open={switchCallDialogOpen}
        onOpenChange={setSwitchCallDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Call?</AlertDialogTitle>
            <AlertDialogDescription>
              You are already in a call. Do you want to leave the current call
              and join the new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCall(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSwitchCall}>
              Switch Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              receiver_id: currentReceiverId,
              call_id: callId,
            })
              .then(() => {
                toast.success("Call invite sent successfully");
              })
              .catch(() => {
                toast.error("Failed to send call invite");
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

  const storedUserVolumes = data.call_userVolumes as number[] | null;

  // User Volume Management
  useEffect(() => {
    if (!room) return;
    const handleParticipantConnected = (participant: {
      identity: string;
      setVolume: (volume: number) => void;
    }) => {
      const storedVolume = storedUserVolumes?.[Number(participant.identity)];
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
          // Setup audio track
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

          // Apply noise suppression
          if (enableNoiseSuppression) {
            const audioContext = audioService.getAudioContext();
            createdTrack.setAudioContext(audioContext);

            // Calc threshold
            // 0.0 -> -20dB
            // 0.5 -> -55dB
            // 1.0 -> -90dB
            const sensitivity = (data.call_noiseSensitivity as number) ?? 0.5;
            const threshold = -20 - sensitivity * 70;
            const inputGain = (data.call_inputGain as number) ?? 1.0;

            // Set processor
            const processor = audioService.getProcessor({
              enableNoiseGate: (data.call_enableNoiseGate as boolean) ?? true,
              algorithm: "rnnoise",
              maxChannels: (data.call_channelCount as number) ?? 2,
              sensitivity: threshold,
              inputGain: inputGain,
            });
            await createdTrack.setProcessor(processor);
          }

          // Publish track
          await localParticipant.publishTrack(createdTrack);
          setLocalTrack(createdTrack);
          setIsMuted(createdTrack.isMuted);
        } catch (error) {
          rawDebugLog(
            "Sub Call Context",
            "Failed to initialize audio",
            error,
            "red",
          );
          toast.error("Failed to initialize audio.");
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
    let isMounted = true;

    const cleanup = async () => {
      if (localTrack) {
        rawDebugLog("Sub Call Context", "Cleanup Track");
        try {
          if (localParticipant?.unpublishTrack) {
            await localParticipant.unpublishTrack(localTrack);
          }
        } catch (err) {
          rawDebugLog("Sub Call Context", "Error during unpublish", err, "red");
        }
        try {
          localTrack.stop();
        } catch (err) {
          rawDebugLog("Sub Call Context", "Error stopping track", err, "red");
        }
        audioService.cleanup();

        if (isMounted) {
          setLocalTrack(null);
          setIsMuted(true);
        }
      }
    };

    if (!shouldConnect && localTrack) {
      void cleanup();
    }

    return () => {
      isMounted = false;
      if (localTrack) {
        try {
          localTrack.stop();
        } catch {}
        audioService.cleanup();
      }
    };
  }, [shouldConnect, localTrack, localParticipant]);

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
  callId: string;
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
