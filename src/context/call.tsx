"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ConnectionState,
  LocalTrackPublication,
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
import { call_token } from "@/lib/endpoints";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { useStorageContext } from "@/context/storage";

// Types
import { AdvancedSuccessMessage, CallUser } from "@/lib/types";

type RoomHandlerMap = Partial<Record<RoomEvent, (...args: any[]) => void>>;

const LIVEKIT_SIGNAL_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "wss://methanium.net:7881";

const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const CallContext = createContext<CallContextType | null>(null);

export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function CallProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const usersRef = useRef<Map<string, CallUser>>(new Map());
  const [, forceUsersVersion] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const roomHandlersRef = useRef<RoomHandlerMap>({});
  const localPublicationRef = useRef<LocalTrackPublication | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const bumpUsersVersion = useCallback(() => {
    forceUsersVersion((prev) => prev + 1);
  }, []);

  const [state, setState] = useState<
    "CONNECTED" | "CONNECTING" | "CLOSED" | "FAILED"
  >("CLOSED");
  const [shouldConnect, setShouldConnect] = useState(false);
  const [ownPing, setOwnPing] = useState<number>(0);
  const [callId] = useState("019a6488-0086-7759-9bfc-9bda36d58e4f");

  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(false);
  const [noiseSuppressionAlgorithm, setNoiseSuppressionAlgorithm] =
    useState<NoiseSuppressionAlgorithm>("speex");
  const [noiseSuppressionSupported, setNoiseSuppressionSupported] =
    useState(false);

  useEffect(() => {
    setNoiseSuppressionSupported(audioService.isSupported());
  }, []);

  const { debugLog, data } = useStorageContext();
  const { ownUuid, privateKeyHash } = useCryptoContext();

  const detachRoomListeners = useCallback((room?: Room | null) => {
    const currentRoom = room ?? roomRef.current;
    if (!currentRoom) return;

    Object.entries(roomHandlersRef.current).forEach(([event, handler]) => {
      if (handler) {
        currentRoom.off(
          event as RoomEvent,
          handler as (...args: any[]) => void
        );
      }
    });

    roomHandlersRef.current = {};
  }, []);

  const cleanupRoom = useCallback(async () => {
    const activeRoom = roomRef.current;
    roomRef.current = null;

    detachRoomListeners(activeRoom);

    if (activeRoom && localPublicationRef.current?.track) {
      try {
        await activeRoom.localParticipant.unpublishTrack(
          localPublicationRef.current.track,
          true
        );
      } catch (error) {
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNPUBLISH", error);
      }
    }

    localPublicationRef.current = null;

    if (activeRoom) {
      try {
        await activeRoom.disconnect(true);
      } catch (error) {
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_DISCONNECT", error);
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    audioService.cleanup();
    usersRef.current.clear();
    bumpUsersVersion();
  }, [detachRoomListeners, bumpUsersVersion, debugLog]);

  const exitCall = useCallback(() => {
    setShouldConnect(false);
  }, []);

  const requestLiveKitCredentials = useCallback(async () => {
    if (!ownUuid || !privateKeyHash) {
      throw new Error("CALL_CONTEXT_MISSING_AUTH");
    }

    const response = await fetch(call_token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        call_id: callId,
        user_id: ownUuid,
        private_key_hash: privateKeyHash,
      }),
    });

    let payload: Record<string, unknown> = {};

    try {
      payload = ((await response.json()) as AdvancedSuccessMessage)
        .data as Record<string, unknown>;
    } catch (error) {
      throw new Error("CALL_CONTEXT_INVALID_LIVEKIT_RESPONSE");
    }

    if (!response.ok) {
      const message =
        (payload.message as string) ??
        (payload.error as string) ??
        "CALL_LIVEKIT_TOKEN_FAILED";
      throw new Error(message);
    }

    const token =
      (payload.token as string) ??
      (payload.access_token as string) ??
      (payload.payload as string) ??
      "";
    const serverUrl = (payload.server_url as string) ?? LIVEKIT_SIGNAL_URL;

    if (!token) {
      throw new Error("CALL_CONTEXT_MISSING_LIVEKIT_TOKEN");
    }

    return { token, serverUrl };
  }, [callId, ownUuid, privateKeyHash]);

  const addParticipant = useCallback(
    (participant: RemoteParticipant) => {
      const identity = participant.identity;
      if (!identity || identity === ownUuid) return;

      const existing = usersRef.current.get(identity);
      usersRef.current.set(identity, {
        state: existing?.state ?? "CONNECTED",
        active: existing?.active ?? false,
        stream: existing?.stream,
      });
      bumpUsersVersion();
    },
    [ownUuid, bumpUsersVersion]
  );

  const removeParticipant = useCallback(
    (identity?: string) => {
      if (!identity) return;
      if (usersRef.current.delete(identity)) {
        bumpUsersVersion();
      }
    },
    [bumpUsersVersion]
  );

  const updateParticipantStream = useCallback(
    (participant: RemoteParticipant, track?: RemoteTrack) => {
      const identity = participant.identity;
      if (!identity || identity === ownUuid) return;

      const previous = usersRef.current.get(identity);

      if (!track || track.kind !== Track.Kind.Audio) {
        if (previous?.stream || previous?.active) {
          usersRef.current.set(identity, {
            state: previous?.state ?? "CONNECTED",
            active: false,
          });
          bumpUsersVersion();
        }
        return;
      }

      const stream = new MediaStream([track.mediaStreamTrack]);
      usersRef.current.set(identity, {
        state: previous?.state ?? "CONNECTED",
        active: previous?.active ?? false,
        stream,
      });
      bumpUsersVersion();
    },
    [ownUuid, bumpUsersVersion]
  );

  const markActiveSpeakers = useCallback(
    (speakers: Participant[]) => {
      const activeIdentities = new Set(
        speakers
          .filter((speaker) => !speaker.isLocal)
          .map((speaker) => speaker.identity)
          .filter((identity): identity is string => Boolean(identity))
      );

      let changed = false;
      usersRef.current.forEach((user, identity) => {
        const isActive = activeIdentities.has(identity);
        if (user.active !== isActive) {
          user.active = isActive;
          changed = true;
        }
      });

      if (changed) bumpUsersVersion();
    },
    [bumpUsersVersion]
  );

  const getLocalStream = useCallback(
    async (type: "VOICE" | "VIDEO" | "CAMERA") => {
      const voiceConstraintsNS: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: (data.call_channelCount as number) || 2,
        },
        video: false,
      };

      const voiceConstraintsBuiltIn: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: (data.call_channelCount as number) || 2,
        },
        video: false,
      };

      const videoConstraints: MediaStreamConstraints = {
        audio: data.call_captureAudio as boolean,
        video: {
          width: data.call_videoWidth as number,
          height: data.call_videoHeight as number,
          frameRate: data.call_videoFramerate as number,
        },
      };

      const cameraConstraints: MediaStreamConstraints = {
        audio: false,
        video: {
          width: data.call_videoWidth as number,
          height: data.call_videoHeight as number,
          frameRate: data.call_videoFramerate as number,
        },
      };

      switch (type) {
        case "VOICE": {
          const nsState = data.nsState as number;
          let constraints: MediaStreamConstraints;

          switch (nsState) {
            case 1:
              constraints = voiceConstraintsBuiltIn;
              break;
            case 2:
            case 3:
              constraints = voiceConstraintsNS;
              break;
            default:
              constraints = voiceConstraintsNS;
              break;
          }

          const rawStream = await navigator.mediaDevices.getUserMedia(
            constraints
          );

          if (
            nsState &&
            nsState >= 2 &&
            nsState <= 3 &&
            noiseSuppressionSupported
          ) {
            try {
              let algorithm: NoiseSuppressionAlgorithm = "speex";
              if (nsState === 3) algorithm = "rnnoise";

              const processedStream = await audioService.processStream(
                rawStream,
                {
                  algorithm,
                  maxChannels: (data.call_channelCount as number) || 2,
                }
              );

              return processedStream;
            } catch (error) {
              debugLog("CALL_CONTEXT", "ERROR_NOISE_SUPPRESSION_FAILED", error);
              return rawStream;
            }
          }

          return rawStream;
        }
        case "VIDEO":
          return navigator.mediaDevices.getDisplayMedia(videoConstraints);
        case "CAMERA":
          return navigator.mediaDevices.getUserMedia(cameraConstraints);
        default:
          return navigator.mediaDevices.getUserMedia({
            audio: false,
            video: false,
          });
      }
    },
    [data, noiseSuppressionSupported, debugLog]
  );

  const publishLocalAudio = useCallback(
    async (room: Room) => {
      if (localPublicationRef.current?.track) {
        try {
          await room.localParticipant.unpublishTrack(
            localPublicationRef.current.track,
            true
          );
        } catch (error) {
          debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNPUBLISH", error);
        }
        localPublicationRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      const stream = await getLocalStream("VOICE");
      localStreamRef.current = stream;
      const [audioTrack] = stream.getAudioTracks();
      if (!audioTrack) {
        throw new Error("CALL_CONTEXT_NO_AUDIO_TRACK");
      }

      const publication = await room.localParticipant.publishTrack(audioTrack, {
        source: Track.Source.Microphone,
      });

      localPublicationRef.current = publication;
    },
    [debugLog, getLocalStream]
  );

  const attachRoomListeners = useCallback(
    (room: Room) => {
      detachRoomListeners(room);

      const handleParticipantConnected = (participant: RemoteParticipant) => {
        addParticipant(participant);
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track) {
            updateParticipantStream(participant, publication.track);
          }
        });
      };

      const handleParticipantDisconnected = (
        participant: RemoteParticipant
      ) => {
        removeParticipant(participant.identity);
      };

      const handleTrackSubscribed = (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio) {
          updateParticipantStream(participant, track);
        }
      };

      const handleTrackUnsubscribed = (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio) {
          updateParticipantStream(participant);
        }
      };

      const handleConnectionStateChanged = (nextState: ConnectionState) => {
        switch (nextState) {
          case ConnectionState.Connected:
            setState("CONNECTED");
            break;
          case ConnectionState.Connecting:
          case ConnectionState.SignalReconnecting:
          case ConnectionState.Reconnecting:
            setState("CONNECTING");
            break;
          default:
            setState("CLOSED");
        }
      };

      const handleDisconnected = () => {
        setState("CLOSED");
        setShouldConnect(false);
      };

      const handlers: RoomHandlerMap = {
        [RoomEvent.ParticipantConnected]: handleParticipantConnected,
        [RoomEvent.ParticipantDisconnected]: handleParticipantDisconnected,
        [RoomEvent.TrackSubscribed]: handleTrackSubscribed,
        [RoomEvent.TrackUnsubscribed]: handleTrackUnsubscribed,
        [RoomEvent.ActiveSpeakersChanged]: markActiveSpeakers,
        [RoomEvent.ConnectionStateChanged]: handleConnectionStateChanged,
        [RoomEvent.Reconnecting]: () => setState("CONNECTING"),
        [RoomEvent.SignalReconnecting]: () => setState("CONNECTING"),
        [RoomEvent.Reconnected]: () => setState("CONNECTED"),
        [RoomEvent.Disconnected]: handleDisconnected,
      };

      Object.entries(handlers).forEach(([event, handler]) => {
        if (handler) {
          room.on(event as RoomEvent, handler as (...args: any[]) => void);
        }
      });

      roomHandlersRef.current = handlers;
    },
    [
      addParticipant,
      detachRoomListeners,
      markActiveSpeakers,
      removeParticipant,
      updateParticipantStream,
    ]
  );

  const seedParticipants = useCallback(
    (room: Room) => {
      room.remoteParticipants.forEach((participant) => {
        addParticipant(participant);
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track) {
            updateParticipantStream(participant, publication.track);
          }
        });
      });
    },
    [addParticipant, updateParticipantStream]
  );

  useEffect(() => {
    if (shouldConnect) return;
    setOwnPing(0);
    setState("CLOSED");
    void cleanupRoom();
  }, [shouldConnect, cleanupRoom]);

  useEffect(() => {
    if (!shouldConnect || roomRef.current) return;

    let cancelled = false;

    const connectToRoom = async () => {
      setState("CONNECTING");
      try {
        const { token, serverUrl } = await requestLiveKitCredentials();
        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          stopLocalTrackOnUnpublish: true,
        });

        roomRef.current = room;
        attachRoomListeners(room);

        await room.connect(serverUrl, token, {
          autoSubscribe: true,
          rtcConfig: {
            iceServers,
            iceTransportPolicy: data.call_onlyAllowRelays ? "relay" : undefined,
          },
        });

        if (cancelled) {
          await cleanupRoom();
          return;
        }

        seedParticipants(room);
        await publishLocalAudio(room);

        if (cancelled) {
          await cleanupRoom();
          return;
        }

        setState("CONNECTED");
      } catch (error) {
        if (cancelled) return;
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_CONNECT", error);
        setState("FAILED");
        setShouldConnect(false);
        await cleanupRoom();
      }
    };

    void connectToRoom();

    return () => {
      cancelled = true;
    };
  }, [
    shouldConnect,
    requestLiveKitCredentials,
    attachRoomListeners,
    publishLocalAudio,
    seedParticipants,
    cleanupRoom,
    data.call_onlyAllowRelays,
    debugLog,
  ]);

  useEffect(() => {
    if (state !== "CONNECTED" || !roomRef.current) return;

    let cancelled = false;

    const updatePingFromStats = async () => {
      const pcManager = roomRef.current?.engine.pcManager;
      const transport = pcManager?.publisher ?? pcManager?.subscriber;

      if (!transport) return;

      try {
        const stats = await transport.getStats();
        if (cancelled) return;
        stats.forEach((report: RTCStats) => {
          if (report.type === "candidate-pair") {
            const candidate = report as RTCIceCandidatePairStats;
            if (
              candidate.currentRoundTripTime !== undefined &&
              candidate.nominated
            ) {
              setOwnPing(Math.round(candidate.currentRoundTripTime * 1000));
            }
          }
        });
      } catch (error) {
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_PING", error);
      }
    };

    void updatePingFromStats();
    const interval = setInterval(updatePingFromStats, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state, debugLog]);

  const enableNoiseSuppression = useCallback(
    (algorithm?: NoiseSuppressionAlgorithm) => {
      if (noiseSuppressionSupported) {
        setNoiseSuppressionEnabled(true);
        if (algorithm) {
          setNoiseSuppressionAlgorithm(algorithm);
        }
      }
    },
    [noiseSuppressionSupported]
  );

  const disableNoiseSuppression = useCallback(() => {
    setNoiseSuppressionEnabled(false);
    audioService.cleanup();
  }, []);

  const toggleNoiseSuppression = useCallback(() => {
    if (noiseSuppressionEnabled) {
      disableNoiseSuppression();
    } else {
      enableNoiseSuppression();
    }
  }, [
    noiseSuppressionEnabled,
    enableNoiseSuppression,
    disableNoiseSuppression,
  ]);

  return (
    <CallContext.Provider
      value={{
        users: usersRef.current,
        exitCall,
        setShouldConnect,
        ownPing,
        state,
        noiseSuppressionEnabled,
        noiseSuppressionAlgorithm,
        noiseSuppressionSupported,
        enableNoiseSuppression,
        disableNoiseSuppression,
        toggleNoiseSuppression,
        setNoiseSuppressionAlgorithm,
        getLocalStream,
      }}
    >
      {Array.from(usersRef.current.entries()).map(([userId, user]) =>
        user.stream ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio
            key={userId}
            autoPlay
            playsInline
            onPlaying={() => {
              const target = usersRef.current.get(userId);
              if (target && !target.active) {
                target.active = true;
                bumpUsersVersion();
              }
            }}
            onAbort={() => {
              const target = usersRef.current.get(userId);
              if (target && target.active) {
                target.active = false;
                bumpUsersVersion();
              }
            }}
            ref={(el) => {
              if (el) {
                if (user.stream && el.srcObject !== user.stream) {
                  el.srcObject = user.stream;
                }
              }
            }}
          />
        ) : null
      )}
      {children}
    </CallContext.Provider>
  );
}

type CallContextType = {
  users: Map<string, CallUser>;
  setShouldConnect: (value: boolean) => void;
  ownPing: number;
  exitCall: () => void;
  state: "CONNECTED" | "CONNECTING" | "CLOSED" | "FAILED";
  noiseSuppressionEnabled: boolean;
  noiseSuppressionAlgorithm: NoiseSuppressionAlgorithm;
  noiseSuppressionSupported: boolean;
  enableNoiseSuppression: (algorithm?: NoiseSuppressionAlgorithm) => void;
  disableNoiseSuppression: () => void;
  toggleNoiseSuppression: () => void;
  setNoiseSuppressionAlgorithm: (algorithm: NoiseSuppressionAlgorithm) => void;
  getLocalStream: (type: "VOICE" | "VIDEO" | "CAMERA") => Promise<MediaStream>;
};
