"use client";

// Package Imports
import { createContext, useContext, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
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

  return (
    <SubCallContext.Provider
      value={{
        disconnect: () => {
          buttonProps.onClick();
          setOuterState("DISCONNECTED");
          setShouldConnect(false);
        },
        connect: () => connect(),
      }}
    >
      {children}
    </SubCallContext.Provider>
  );
}

type CallContextValue = {
  outerState: string;
  setToken: (input: string) => void;
  connect: () => void;

  setOuterState: (input: string) => void;
  setShouldConnect: (input: boolean) => void;
};

type SubCallContextValue = {
  disconnect: () => void;
  connect: () => void;
};
