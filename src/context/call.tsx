"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ConnectionState,
  DisconnectReason,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

// Lib Imports
import {
  audioService,
  type NoiseSuppressionAlgorithm,
} from "@/lib/audioService";
import { call_token, call } from "@/lib/endpoints";
import { useCryptoContext } from "@/context/crypto";
import { useStorageContext } from "@/context/storage";
import type { AdvancedSuccessMessage, CallUser } from "@/lib/types";
import { toast } from "sonner";

// Types
type ConnectionStatus =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "FAILED";

const DEFAULT_ICE_SERVERS = [
  {
    url: "stun:stun.l.google.com:19302",
  },
  {
    url: "stun:stun1.l.google.com:19302",
  },
  {
    url: "stun:stun2.l.google.com:19302",
  },
  {
    url: "stun:stun3.l.google.com:19302",
  },
  {
    url: "stun:stun4.l.google.com:19302",
  },
  {
    url: "turn:numb.viagenie.ca",
    credential: "muazkh",
    username: "webrtc@live.com",
  },
  {
    url: "turn:192.158.29.39:3478?transport=udp",
    credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
    username: "28224511:1379330808",
  },
  {
    url: "turn:192.158.29.39:3478?transport=tcp",
    credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
    username: "28224511:1379330808",
  },
  {
    url: "turn:turn.bistri.com:80",
    credential: "homeo",
    username: "homeo",
  },
  {
    url: "turn:turn.anyfirewall.com:443?transport=tcp",
    credential: "webrtc",
    username: "webrtc",
  },
];
const DEFAULT_CALL_ID = "019a6488-0086-7759-9bfc-9bda36d58e4f";

const CallContext = createContext<CallContextValue | null>(null);

// Main
export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within CallProvider");
  }
  return context;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  return (
    <CallContext.Provider value={{}}>
      {/* 
      {Array.from(participants.entries()).map(([userId, user]) =>
        user.stream ? (
          <audio
            key={userId}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && user.stream && el.srcObject !== user.stream) {
                el.srcObject = user.stream;
              }
            }}
          />
        ) : null
      )}
        */}
      {children}
    </CallContext.Provider>
  );
}

type CallContextValue = {};
