/**
 * Call feature types
 * Shared type definitions for the call feature
 */

import { ConnectionState } from "livekit-client";

export type OwnMetadata = {
  isAdmin: boolean;
};

export type CallMetadata = {
  anonymousJoining: boolean;
};

export type ParticipantData = {
  deafened?: boolean;
  muted?: boolean;
  stream_preview?: string | null;
};

export type CallContextValue = {
  callId: string;
  setDontSendInvite: (input: boolean) => void;
  getCallToken: (callId: string, sendInvite?: boolean) => Promise<string>;
  shouldConnect: boolean;
  outerState: string;
  connect: (
    token: string,
    callId: string,
    receiverId?: number,
  ) => Promise<void>;
  setOuterState: (input: string) => void;
  setShouldConnect: (input: boolean) => void;
  disconnect: () => void;
  isAtMax: boolean;
  setIsAtMax: (input: boolean) => void;
  setCurrentLayout: (input: "grid" | "focus") => void;
  inGridView: boolean;
  callInvite: string | null;
  setCallInvite: (input: string | null) => void;
};

export type SubCallContextValue = {
  ownMetadata: OwnMetadata;
  callMetadata: CallMetadata;
  toggleMute: () => void;
  isDeafened: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  speakingByIdentity: Record<number, boolean>;
  connectionState: ConnectionState;
  toggleDeafen: () => void;
  isWatching: Record<number, boolean>;
  setIsWatching: (watching: Record<number, boolean>) => void;
  startWatching: (user: number) => void;
  stopWatching: (user: number) => void;
  participantData: Record<number, ParticipantData>;
  setParticipantData: React.Dispatch<
    React.SetStateAction<Record<number, ParticipantData>>
  >;
  disconnectUser: (user: number) => void;
  timeoutUser: (user: number, until: number) => void;
  streamViewers: Record<number, number[]>;
};
