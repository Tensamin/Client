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
} from "livekit-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

// Types
export type UserData = {
  id: number;
  username: string;
  display: string;
  avatar?: string | null;
  loading?: boolean;
};

export type CallSessionConfig = {
  token: string;
  serverUrl: string;
  callId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
};

export type ParticipantMetadata = {
  deafened?: boolean;
  muted?: boolean;
  stream_preview?: string | null;
};

export type CallSessionContextValue = {
  // Call info
  callId: string;

  // Audio state
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;

  // Participant data
  participantData: Record<number, ParticipantMetadata>;
  setParticipantData: React.Dispatch<
    React.SetStateAction<Record<number, ParticipantMetadata>>
  >;
  speakingByIdentity: Record<number, boolean>;

  // Screen share watching
  isWatching: Record<number, boolean>;
  setIsWatching: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  startWatching: (userId: number) => void;
  stopWatching: (userId: number) => void;
  streamViewers: Record<number, number[]>;

  // Layout
  inGridView: boolean;
  setCurrentLayout: (layout: "grid" | "focus") => void;
  isAtMax: boolean;
  setIsAtMax: (value: boolean) => void;

  // Admin functionality (simplified for anonymous)
  ownMetadata: { isAdmin: boolean };
  callMetadata: { anonymousJoining: boolean };
  disconnectUser: (userId: number) => void;
  timeoutUser: (userId: number, until: number) => void;

  // Connection
  connectionState: ConnectionState;
  disconnect: () => void;
};

const CallSessionContext = createContext<CallSessionContextValue | null>(null);

export function useCallSession() {
  const context = useContext(CallSessionContext);
  if (!context) {
    throw new Error("useCallSession must be used within CallSessionProvider");
  }
  return context;
}

// Optional hook that returns null if not in context (for gradual migration)
export function useMaybeCallSession() {
  return useContext(CallSessionContext);
}

// Inner provider that has access to LiveKit room context
function CallSessionInner({
  children,
  callId,
  onDisconnect,
  isAdmin = false,
  anonymousJoining = true,
}: {
  children: ReactNode;
  callId: string;
  onDisconnect?: () => void;
  isAdmin?: boolean;
  anonymousJoining?: boolean;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();

  // Audio state
  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, _setIsSpeaking] = useState(false);
  const [speakingByIdentity, _setSpeakingByIdentity] = useState<
    Record<number, boolean>
  >({});

  // Participant data
  const [participantData, setParticipantData] = useState<
    Record<number, ParticipantMetadata>
  >({});

  // Screen share watching
  const [isWatching, setIsWatching] = useState<Record<number, boolean>>({});
  const [streamViewers, _setStreamViewers] = useState<Record<number, number[]>>(
    {},
  );

  // Layout
  const [currentLayout, setCurrentLayout] = useState<"grid" | "focus">("grid");
  const [isAtMax, setIsAtMax] = useState(false);

  const inGridView = currentLayout === "grid";

  // Initialize audio track
  useEffect(() => {
    let mounted = true;
    let track: LocalAudioTrack | null = null;

    const initAudio = async () => {
      if (!localParticipant) return;

      try {
        track = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        if (!mounted) {
          track.stop();
          return;
        }

        await localParticipant.publishTrack(track);
        await track.mute();

        if (mounted) {
          setLocalTrack(track);
          setIsMuted(true);
        }
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        toast.error("Failed to initialize microphone");
      }
    };

    if (connectionState === ConnectionState.Connected) {
      initAudio();
    }

    return () => {
      mounted = false;
      if (track) {
        track.stop();
      }
    };
  }, [localParticipant, connectionState]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!localTrack) return;

    try {
      if (localTrack.isMuted) {
        await localTrack.unmute();
        if (isDeafened) {
          setIsDeafened(false);
          // Unmute all audio elements
          const audioElements = document.querySelectorAll("audio");
          audioElements.forEach((audio) => {
            audio.muted = false;
          });
        }
        setIsMuted(false);
      } else {
        await localTrack.mute();
        setIsMuted(true);
      }
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  }, [localTrack, isDeafened]);

  // Toggle deafen
  const toggleDeafen = useCallback(async () => {
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);

    // Mute/unmute all audio elements
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = newDeafenedState;
    });

    // Also mute ourselves when deafened
    if (localTrack && newDeafenedState && !localTrack.isMuted) {
      await localTrack.mute();
      setIsMuted(true);
    }
  }, [isDeafened, localTrack]);

  // Start watching a screen share
  const startWatching = useCallback((userId: number) => {
    setIsWatching((prev) => ({ ...prev, [userId]: true }));
  }, []);

  // Stop watching a screen share
  const stopWatching = useCallback((userId: number) => {
    setIsWatching((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  // Disconnect from call
  const disconnect = useCallback(() => {
    if (localTrack) {
      localTrack.stop();
    }
    room?.disconnect();
    onDisconnect?.();
  }, [room, localTrack, onDisconnect]);

  // Admin functions (no-op for anonymous mode)
  const disconnectUser = useCallback((userId: number) => {
    console.log("Disconnect user:", userId);
    // In anonymous mode, this is a no-op
    // The authenticated mode can override this
  }, []);

  const timeoutUser = useCallback((userId: number, until: number) => {
    console.log("Timeout user:", userId, "until:", until);
    // In anonymous mode, this is a no-op
  }, []);

  const value: CallSessionContextValue = {
    callId,
    isMuted,
    isDeafened,
    isSpeaking,
    toggleMute,
    toggleDeafen,
    participantData,
    setParticipantData,
    speakingByIdentity,
    isWatching,
    setIsWatching,
    startWatching,
    stopWatching,
    streamViewers,
    inGridView,
    setCurrentLayout,
    isAtMax,
    setIsAtMax,
    ownMetadata: { isAdmin },
    callMetadata: { anonymousJoining },
    disconnectUser,
    timeoutUser,
    connectionState,
    disconnect,
  };

  return (
    <CallSessionContext.Provider value={value}>
      {children}
    </CallSessionContext.Provider>
  );
}

// Main provider that wraps LiveKitRoom
export function CallSessionProvider({
  children,
  config,
  onDisconnect,
  isAdmin = false,
  anonymousJoining = true,
}: {
  children: ReactNode;
  config: CallSessionConfig;
  onDisconnect?: () => void;
  isAdmin?: boolean;
  anonymousJoining?: boolean;
}) {
  return (
    <LiveKitRoom
      token={config.token}
      serverUrl={config.serverUrl}
      connect={true}
      audio={false}
      video={false}
      screen={false}
      onConnected={() => {
        toast.success("Connected to call");
        config.onConnected?.();
      }}
      onDisconnected={() => {
        toast.info("Disconnected from call");
        config.onDisconnected?.();
        onDisconnect?.();
      }}
    >
      <RoomAudioRenderer />
      <CallSessionInner
        callId={config.callId}
        onDisconnect={onDisconnect}
        isAdmin={isAdmin}
        anonymousJoining={anonymousJoining}
      >
        {children}
      </CallSessionInner>
    </LiveKitRoom>
  );
}

// Re-export for convenience
export { CallSessionContext };
