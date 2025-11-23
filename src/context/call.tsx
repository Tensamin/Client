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

// Lib Imports
import { call_token } from "@/lib/endpoints";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useCryptoContext } from "@/context/crypto";
import { useSocketContext } from "@/context/socket";

// Types
import { UserAudioSettings } from "@/lib/types";
import { toast } from "sonner";

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

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");

  function setUserVolumes(userId: string, volume: number) {
    set("call_userVolumes", {
      ...(data.call_userVolumes as object),
      [userId]: volume,
    });
  }

  return (
    <CallContext.Provider
      value={{
        shouldConnect,
        outerState,
        setToken,
        connect: () => {
          setOuterState("CONNECTING");
          setShouldConnect(true);
        },
        setUserVolumes,

        setOuterState,
        setShouldConnect,
      }}
    >
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
  const { setOuterState, setShouldConnect, connect, shouldConnect, setToken } =
    useCallContext();
  const { data } = useStorageContext();
  const { send } = useSocketContext();
  const { ownUuid, privateKeyHash } = useCryptoContext();

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

  const callUser = async (uuid: string) => {
    const callId = v7();
    fetch(call_token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        call_id: callId,
        user_id: ownUuid,
        private_key_hash: privateKeyHash,
      }),
    })
      .then((data) => data.json())
      .then((data) => {
        setToken(data.data.token);
        connect();
        send("call_invite", {
          receiver_id: uuid,
          call_id: callId,
        }).then((data) => {
          if (data.type !== "error") {
            toast.success("Call invitation sent.");
          } else {
            toast.error("Failed to send call invitation.");
          }
        });
      });
  };

  return (
    <SubCallContext.Provider
      value={{
        callUser,
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
  shouldConnect: boolean;
  outerState: string;
  setToken: (input: string) => void;
  connect: () => void;
  setUserVolumes: (userId: string, volume: number) => void;

  setOuterState: (input: string) => void;
  setShouldConnect: (input: boolean) => void;
};

type SubCallContextValue = {
  callUser: (uuid: string) => void;
  disconnect: () => void;
  connect: () => void;
  toggleMute: () => void;
  isDeafened: boolean;
  toggleDeafen: () => void;
};
