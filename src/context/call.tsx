"use client";

// Package Imports
import { createContext, useContext, useState, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useDisconnectButton,
} from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { v7 } from "uuid";
import { toast } from "sonner";
import * as Icon from "lucide-react";

// Lib Imports
import { call_token } from "@/lib/endpoints";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useCryptoContext } from "@/context/crypto";
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";

// Components
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Types
import { User, UserAudioSettings } from "@/lib/types";
import { UserAvatar } from "@/components/modals/raw";
// Main
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

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { data, set } = useStorageContext();
  const { lastMessage, send } = useSocketContext();
  const { get } = useUserContext();
  const { ownUuid, privateKeyHash } = useCryptoContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");

  function setUserVolumes(userId: string, volume: number) {
    set("call_userVolumes", {
      ...(data.call_userVolumes as object),
      [userId]: volume,
    });
  }

  const [newCallWidgetOpen, setNewCallWidgetOpen] = useState(false);
  const [newCallData, setNewCallData] = useState<{
    call_id: string;
    sender_id: string;
  } | null>(null);
  const [newCaller, setNewCaller] = useState<User | null>(null);
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

  const connect = () => {
    setOuterState("CONNECTING");
    setShouldConnect(true);
  };

  const getCallToken = async (callId: string) => {
    return send("call_token", {
      call_id: callId,
    }).then((data) => {
      if (data.type !== "error") {
        return data.data.call_token ?? "error";
      }
      return "error";
    });
  };

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
                onClick={() => {
                  setNewCallWidgetOpen(false);
                  if (!newCallData?.call_id) return;
                  getCallToken(newCallData?.call_id).then((token) => {
                    setToken(token);
                    connect();
                  });
                }}
              >
                <Icon.PhoneForwarded />
              </Button>
            </div>
            <audio
              // MAKE THE SOUND LESS LOUD AND REMOVE ONPLAY!!!! (It's very buggy)
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
        serverUrl="wss://call.tensamin.net"
        connect={shouldConnect}
        audio={true}
        onConnected={() => setOuterState("CONNECTED")}
        onDisconnected={() => setOuterState("DISCONNECTED")}
      >
        <RoomAudioRenderer />
        <SubCallProvider>{children}</SubCallProvider>
      </LiveKitRoom>
    </CallContext.Provider>
  );
}

function SubCallProvider({ children }: { children: React.ReactNode }) {
  const { setOuterState, setShouldConnect, connect, shouldConnect } =
    useCallContext();
  const { data } = useStorageContext();

  const { buttonProps } = useDisconnectButton({});
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

  const [isDeafened, setIsDeafened] = useState(false);
  const storedUserVolumes = data.call_userVolumes as UserAudioSettings | null;

  const room = useRoomContext();
  room.on(RoomEvent.ParticipantConnected, (participant) => {
    const storedVolume = storedUserVolumes?.[participant.identity];
    if (!storedVolume) return;
    participant.setVolume(storedVolume as number);
  });

  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isDeafened;
    });
    if (localParticipant && shouldConnect) {
      localParticipant
        .setMetadata(JSON.stringify({ deafened: isDeafened }))
        .catch((error) => {
          if (
            error instanceof Error &&
            error.message?.includes(
              "Request to update local metadata timed out"
            )
          ) {
            return;
          }
          throw error;
        });
    }
  }, [isDeafened, localParticipant, shouldConnect]);

  const toggleMute = async () => {
    if (localParticipant) {
      const newState = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
      if (newState && isDeafened) {
        setIsDeafened(false);
      }
    }
  };

  const toggleDeafen = async () => {
    const newState = !isDeafened;
    setIsDeafened(newState);
    if (newState) {
      if (isMicrophoneEnabled && localParticipant) {
        await localParticipant.setMicrophoneEnabled(false);
      }
    } else {
      if (!isMicrophoneEnabled && localParticipant) {
        await localParticipant.setMicrophoneEnabled(true);
      }
    }
  };

  return (
    <SubCallContext.Provider
      value={{
        disconnect: () => {
          buttonProps.onClick();
          setOuterState("DISCONNECTED");
          setShouldConnect(false);
        },
        connect: () => connect(),
        toggleMute: () => toggleMute(),
        isDeafened,
        toggleDeafen,
      }}
    >
      {children}
    </SubCallContext.Provider>
  );
}

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
};
