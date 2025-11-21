"use client";

// Package Imports
import { createContext, useContext, useState, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";
import { useDisconnectButton } from "@livekit/components-react";

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
  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");

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
  const { setOuterState, setShouldConnect, connect } = useCallContext();
  const { buttonProps } = useDisconnectButton({});
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const [isDeafened, setIsDeafened] = useState(false);

  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isDeafened;
    });
    if (localParticipant) {
      localParticipant.setMetadata(JSON.stringify({ deafened: isDeafened }));
    }
  }, [isDeafened, localParticipant]);

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
  shouldConnect: boolean;
  outerState: string;
  setToken: (input: string) => void;
  connect: () => void;

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
