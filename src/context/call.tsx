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
import { call_token, call } from "@/lib/endpoints";

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
  const [shouldConnect, setShouldConnectState] = useState(false);
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

  const logVerbose = useCallback(
    (event: string, details?: Record<string, unknown>) => {
      if (typeof details === "undefined") {
        debugLog("CALL_CONTEXT_VERBOSE", event);
        return;
      }
      debugLog("CALL_CONTEXT_VERBOSE", event, details);
    },
    [debugLog]
  );

  const setShouldConnect = useCallback(
    (value: boolean) => {
      logVerbose("SET_SHOULD_CONNECT_REQUEST", { value });
      setShouldConnectState(value);
    },
    [logVerbose]
  );

  useEffect(() => {
    logVerbose("CALL_STATE_CHANGED", { state });
  }, [state, logVerbose]);

  const detachRoomListeners = useCallback(
    (room?: Room | null) => {
      const currentRoom = room ?? roomRef.current;
      logVerbose("DETACH_ROOM_LISTENERS", {
        providedRoom: Boolean(room),
        hasRoom: Boolean(currentRoom),
        handlerCount: Object.keys(roomHandlersRef.current ?? {}).length,
      });
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
    },
    [logVerbose]
  );

  const cleanupRoom = useCallback(async () => {
    const activeRoom = roomRef.current;
    logVerbose("CLEANUP_ROOM_START", {
      hasActiveRoom: Boolean(activeRoom),
      hasLocalPublication: Boolean(localPublicationRef.current?.track),
      hasLocalStream: Boolean(localStreamRef.current),
    });
    roomRef.current = null;

    detachRoomListeners(activeRoom);

    if (activeRoom && localPublicationRef.current?.track) {
      try {
        await activeRoom.localParticipant.unpublishTrack(
          localPublicationRef.current.track,
          true
        );
        logVerbose("CLEANUP_ROOM_UNPUBLISHED_LOCAL_TRACK", {
          trackSid: localPublicationRef.current.track.sid,
        });
      } catch (error) {
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNPUBLISH", error);
      }
    }

    localPublicationRef.current = null;

    if (activeRoom) {
      try {
        await activeRoom.disconnect(true);
        logVerbose("CLEANUP_ROOM_DISCONNECTED", {
          identity: activeRoom.localParticipant.identity,
        });
      } catch (error) {
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_DISCONNECT", error);
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      logVerbose("CLEANUP_ROOM_STOPPED_LOCAL_STREAM");
    }

    audioService.cleanup();
    usersRef.current.clear();
    bumpUsersVersion();
    logVerbose("CLEANUP_ROOM_FINISHED");
  }, [detachRoomListeners, bumpUsersVersion, debugLog, logVerbose]);

  const exitCall = useCallback(() => {
    logVerbose("EXIT_CALL_REQUESTED");
    setShouldConnect(false);
  }, [logVerbose, setShouldConnect]);

  const normalizeSignalUrl = useCallback((rawUrl?: string | null) => {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
      return trimmed;
    }
    const sanitized = trimmed.replace(/^wss?:\/\//, "").replace(/^\/*/, "");
    return `wss://${sanitized}`;
  }, []);

  const requestLiveKitCredentials = useCallback(async () => {
    if (!ownUuid || !privateKeyHash) {
      throw new Error("CALL_CONTEXT_MISSING_AUTH");
    }

    logVerbose("REQUEST_LIVEKIT_TOKEN_START", {
      callId,
      hasOwnUuid: Boolean(ownUuid),
      hasPrivateKeyHash: Boolean(privateKeyHash),
    });

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

    logVerbose("REQUEST_LIVEKIT_TOKEN_RESPONSE", {
      status: response.status,
      ok: response.ok,
    });

    let token: string;

    try {
      token = ((await response.json()) as AdvancedSuccessMessage).data
        .token as string;
    } catch (error) {
      throw new Error("CALL_CONTEXT_INVALID_LIVEKIT_RESPONSE");
    }

    if (!response.ok) {
      throw new Error("CALL_LIVEKIT_TOKEN_FAILED");
    }

    const storageOverride = normalizeSignalUrl(
      (data.call_signalUrl as string | null | undefined) ?? null
    );

    const serverUrl =
      normalizeSignalUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null) ??
      storageOverride ??
      `wss://${call}`;

    if (!token) {
      throw new Error("CALL_CONTEXT_MISSING_LIVEKIT_TOKEN");
    }

    logVerbose("REQUEST_LIVEKIT_TOKEN_SUCCESS", {
      serverUrl,
    });

    return { token, serverUrl };
  }, [
    callId,
    ownUuid,
    privateKeyHash,
    logVerbose,
    normalizeSignalUrl,
    data.call_signalUrl,
  ]);

  const addParticipant = useCallback(
    (participant: RemoteParticipant) => {
      const identity = participant.identity;
      if (!identity) {
        logVerbose("ADD_PARTICIPANT_SKIPPED_NO_ID");
        return;
      }
      if (identity === ownUuid) {
        logVerbose("ADD_PARTICIPANT_SKIPPED_SELF", { identity });
        return;
      }

      const existing = usersRef.current.get(identity);
      usersRef.current.set(identity, {
        state: existing?.state ?? "CONNECTED",
        active: existing?.active ?? false,
        stream: existing?.stream,
      });
      logVerbose("ADD_PARTICIPANT_UPDATED", {
        identity,
        previouslyKnown: Boolean(existing),
      });
      bumpUsersVersion();
    },
    [ownUuid, bumpUsersVersion, logVerbose]
  );

  const removeParticipant = useCallback(
    (identity?: string) => {
      if (!identity) {
        logVerbose("REMOVE_PARTICIPANT_SKIPPED_NO_ID");
        return;
      }

      const removed = usersRef.current.delete(identity);
      logVerbose("REMOVE_PARTICIPANT_RESULT", { identity, removed });
      if (removed) {
        bumpUsersVersion();
      }
    },
    [bumpUsersVersion, logVerbose]
  );

  const updateParticipantStream = useCallback(
    (participant: RemoteParticipant, track?: RemoteTrack) => {
      const identity = participant.identity;
      if (!identity) {
        logVerbose("UPDATE_PARTICIPANT_STREAM_SKIPPED_NO_ID");
        return;
      }
      if (identity === ownUuid) {
        logVerbose("UPDATE_PARTICIPANT_STREAM_SKIPPED_SELF");
        return;
      }

      const previous = usersRef.current.get(identity);

      if (!track || track.kind !== Track.Kind.Audio) {
        if (previous?.stream || previous?.active) {
          usersRef.current.set(identity, {
            state: previous?.state ?? "CONNECTED",
            active: false,
          });
          bumpUsersVersion();
          logVerbose("UPDATE_PARTICIPANT_STREAM_REMOVED", { identity });
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
      logVerbose("UPDATE_PARTICIPANT_STREAM_ATTACHED", {
        identity,
        trackSid: track.sid,
      });
    },
    [ownUuid, bumpUsersVersion, logVerbose]
  );

  const markActiveSpeakers = useCallback(
    (speakers: Participant[]) => {
      const activeIdentities = new Set(
        speakers
          .filter((speaker) => !speaker.isLocal)
          .map((speaker) => speaker.identity)
          .filter((identity): identity is string => Boolean(identity))
      );

      logVerbose("ACTIVE_SPEAKERS_UPDATE", {
        totalSpeakers: speakers.length,
        activeRemoteCount: activeIdentities.size,
      });

      let changed = false;
      usersRef.current.forEach((user, identity) => {
        const isActive = activeIdentities.has(identity);
        if (user.active !== isActive) {
          user.active = isActive;
          changed = true;
        }
      });

      if (changed) {
        bumpUsersVersion();
        logVerbose("ACTIVE_SPEAKERS_STATE_CHANGED");
      }
    },
    [bumpUsersVersion, logVerbose]
  );

  const getLocalStream = useCallback(
    async (type: "VOICE" | "VIDEO" | "CAMERA") => {
      logVerbose("GET_LOCAL_STREAM_START", {
        type,
        nsState: data.nsState,
        nsSupported: noiseSuppressionSupported,
      });

      const preferredChannels =
        typeof data.call_channelCount === "number" && data.call_channelCount > 0
          ? (data.call_channelCount as number)
          : 2;
      const preferredSampleRate =
        typeof data.call_sampleRate === "number" && data.call_sampleRate > 0
          ? (data.call_sampleRate as number)
          : 48000;
      const preferredInputDevice =
        typeof data.inputDevice === "string" ? (data.inputDevice as string) : undefined;

      const buildVoiceConstraints = (
        builtInProcessing: boolean,
        useExactDevice = false
      ): MediaStreamConstraints => {
        const audioTrack: MediaTrackConstraints = {
          echoCancellation: builtInProcessing,
          noiseSuppression: builtInProcessing,
          autoGainControl: builtInProcessing,
          sampleRate: preferredSampleRate
            ? ({ ideal: preferredSampleRate } as ConstrainDouble)
            : undefined,
          channelCount: preferredChannels
            ? ({ ideal: preferredChannels, min: 1 } as ConstrainULong)
            : undefined,
        };

        if (!builtInProcessing) {
          audioTrack.echoCancellation = false;
          audioTrack.noiseSuppression = false;
          audioTrack.autoGainControl = false;
        }

        if (preferredInputDevice && preferredInputDevice !== "default") {
          audioTrack.deviceId = useExactDevice
            ? ({ exact: preferredInputDevice } as ConstrainDOMString)
            : ({ ideal: preferredInputDevice } as ConstrainDOMString);
        }

        return {
          audio: audioTrack,
          video: false,
        };
      };

      const relaxedAudioFallback: MediaStreamConstraints = {
        audio: true,
        video: false,
      };

      const tryAcquireStream = async (
        attempts: MediaStreamConstraints[],
        label: string
      ): Promise<MediaStream> => {
        let lastError: unknown;
        for (let i = 0; i < attempts.length; i++) {
          try {
            const attempt = attempts[i];
            const stream = await navigator.mediaDevices.getUserMedia(attempt);
            logVerbose("GET_LOCAL_STREAM_ATTEMPT_SUCCESS", {
              type,
              attemptLabel: label,
              attemptIndex: i,
            });
            return stream;
          } catch (error) {
            lastError = error;
            logVerbose("GET_LOCAL_STREAM_ATTEMPT_FAILED", {
              type,
              attemptLabel: label,
              attemptIndex: i,
              errorName: error instanceof DOMException ? error.name : "UNKNOWN",
            });
          }
        }
        throw lastError ?? new Error("CALL_CONTEXT_MEDIA_ACQUISITION_FAILED");
      };

      const videoConstraints: MediaTrackConstraints = {
        width:
          typeof data.call_videoWidth === "number"
            ? ({ ideal: data.call_videoWidth as number } as ConstrainULong)
            : undefined,
        height:
          typeof data.call_videoHeight === "number"
            ? ({ ideal: data.call_videoHeight as number } as ConstrainULong)
            : undefined,
        frameRate:
          typeof data.call_videoFramerate === "number"
            ? ({ ideal: data.call_videoFramerate as number } as ConstrainDouble)
            : undefined,
      };

      const displayMediaConstraints = {
        audio: Boolean(data.call_captureAudio),
        video: videoConstraints,
      };

      const cameraConstraints: MediaStreamConstraints = {
        audio: false,
        video: videoConstraints,
      };

      switch (type) {
        case "VOICE": {
          const nsState = (data.nsState as number) ?? 0;
          const builtIn = nsState === 1;

          logVerbose("GET_LOCAL_STREAM_VOICE_CONSTRAINTS", {
            nsState,
            builtIn,
            preferredChannels,
            preferredSampleRate,
            preferredInputDevice,
          });

          const constraintAttempts: MediaStreamConstraints[] = [];
          if (preferredInputDevice && preferredInputDevice !== "default") {
            constraintAttempts.push(buildVoiceConstraints(builtIn, true));
          }
          constraintAttempts.push(buildVoiceConstraints(builtIn));
          constraintAttempts.push(relaxedAudioFallback);

          const rawStream = await tryAcquireStream(
            constraintAttempts,
            builtIn ? "builtin" : "webaudio"
          );

          logVerbose("GET_LOCAL_STREAM_ACQUIRED", {
            type,
            audioTracks: rawStream.getAudioTracks().length,
            videoTracks: rawStream.getVideoTracks().length,
          });

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
                  maxChannels: preferredChannels || 2,
                }
              );

              logVerbose("GET_LOCAL_STREAM_NOISE_SUPPRESSION_APPLIED", {
                algorithm,
              });

              return processedStream;
            } catch (error) {
              debugLog("CALL_CONTEXT", "ERROR_NOISE_SUPPRESSION_FAILED", error);
              logVerbose("GET_LOCAL_STREAM_NOISE_SUPPRESSION_FAILED");
              return rawStream;
            }
          }

          return rawStream;
        }
        case "VIDEO": {
          try {
            const stream = await navigator.mediaDevices.getDisplayMedia(
              displayMediaConstraints
            );
            logVerbose("GET_LOCAL_STREAM_ACQUIRED", {
              type,
              audioTracks: stream.getAudioTracks().length,
              videoTracks: stream.getVideoTracks().length,
            });
            return stream;
          } catch (error) {
            logVerbose("GET_LOCAL_STREAM_DISPLAY_FAILED", {
              errorName: error instanceof DOMException ? error.name : "UNKNOWN",
            });
            throw error;
          }
        }
        case "CAMERA": {
          const stream = await navigator.mediaDevices.getUserMedia(
            cameraConstraints
          );
          logVerbose("GET_LOCAL_STREAM_ACQUIRED", {
            type,
            audioTracks: stream.getAudioTracks().length,
            videoTracks: stream.getVideoTracks().length,
          });
          return stream;
        }
        default: {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: false,
          });
          logVerbose("GET_LOCAL_STREAM_ACQUIRED", {
            type,
            audioTracks: stream.getAudioTracks().length,
            videoTracks: stream.getVideoTracks().length,
          });
          return stream;
        }
      }
    },
    [
      data,
      noiseSuppressionSupported,
      debugLog,
      logVerbose,
    ]
  );

  const publishLocalAudio = useCallback(
    async (room: Room) => {
      if (localPublicationRef.current?.track) {
        logVerbose("PUBLISH_LOCAL_AUDIO_UNPUBLISH_PREVIOUS", {
          trackSid: localPublicationRef.current.track.sid,
        });
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
        logVerbose("PUBLISH_LOCAL_AUDIO_CLEARED_PREVIOUS_STREAM");
      }

      logVerbose("PUBLISH_LOCAL_AUDIO_REQUEST_STREAM");
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
      logVerbose("PUBLISH_LOCAL_AUDIO_PUBLISHED", {
        trackSid: publication.trackSid,
      });
    },
    [debugLog, getLocalStream, logVerbose]
  );

  const attachRoomListeners = useCallback(
    (room: Room) => {
      detachRoomListeners(room);
      logVerbose("ATTACH_ROOM_LISTENERS", {
        roomName: room.name,
        localParticipant: room.localParticipant.identity,
      });

      const handleParticipantConnected = (participant: RemoteParticipant) => {
        logVerbose("EVENT_PARTICIPANT_CONNECTED", {
          identity: participant.identity,
        });
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
        logVerbose("EVENT_PARTICIPANT_DISCONNECTED", {
          identity: participant.identity,
        });
        removeParticipant(participant.identity);
      };

      const handleTrackSubscribed = (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        logVerbose("EVENT_TRACK_SUBSCRIBED", {
          identity: participant.identity,
          kind: track.kind,
        });
        if (track.kind === Track.Kind.Audio) {
          updateParticipantStream(participant, track);
        }
      };

      const handleTrackUnsubscribed = (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        logVerbose("EVENT_TRACK_UNSUBSCRIBED", {
          identity: participant.identity,
          kind: track.kind,
        });
        if (track.kind === Track.Kind.Audio) {
          updateParticipantStream(participant);
        }
      };

      const handleConnectionStateChanged = (nextState: ConnectionState) => {
        logVerbose("EVENT_CONNECTION_STATE_CHANGED", { nextState });
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
        logVerbose("EVENT_ROOM_DISCONNECTED");
        setState("CLOSED");
        setShouldConnect(false);
      };

      const handleReconnecting = () => {
        logVerbose("EVENT_ROOM_RECONNECTING");
        setState("CONNECTING");
      };

      const handleSignalReconnecting = () => {
        logVerbose("EVENT_ROOM_SIGNAL_RECONNECTING");
        setState("CONNECTING");
      };

      const handleReconnected = () => {
        logVerbose("EVENT_ROOM_RECONNECTED");
        setState("CONNECTED");
      };

      const handlers: RoomHandlerMap = {
        [RoomEvent.ParticipantConnected]: handleParticipantConnected,
        [RoomEvent.ParticipantDisconnected]: handleParticipantDisconnected,
        [RoomEvent.TrackSubscribed]: handleTrackSubscribed,
        [RoomEvent.TrackUnsubscribed]: handleTrackUnsubscribed,
        [RoomEvent.ActiveSpeakersChanged]: markActiveSpeakers,
        [RoomEvent.ConnectionStateChanged]: handleConnectionStateChanged,
        [RoomEvent.Reconnecting]: handleReconnecting,
        [RoomEvent.SignalReconnecting]: handleSignalReconnecting,
        [RoomEvent.Reconnected]: handleReconnected,
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
      logVerbose,
      setShouldConnect,
      setState,
    ]
  );

  const seedParticipants = useCallback(
    (room: Room) => {
      logVerbose("SEED_PARTICIPANTS", {
        count: room.remoteParticipants.size,
      });
      room.remoteParticipants.forEach((participant) => {
        addParticipant(participant);
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track) {
            updateParticipantStream(participant, publication.track);
          }
        });
      });
    },
    [addParticipant, updateParticipantStream, logVerbose]
  );

  useEffect(() => {
    logVerbose("SHOULD_CONNECT_CHANGED", { shouldConnect });
    if (shouldConnect) return;
    setOwnPing(0);
    setState("CLOSED");
    void cleanupRoom();
  }, [shouldConnect, cleanupRoom, logVerbose]);

  useEffect(() => {
    logVerbose("CONNECT_EFFECT_TRIGGER", {
      shouldConnect,
      hasRoom: Boolean(roomRef.current),
    });
    if (!shouldConnect || roomRef.current) {
      return;
    }

    let cancelled = false;

    const connectToRoom = async () => {
      logVerbose("CONNECT_TO_ROOM_START");
      setState("CONNECTING");
      try {
        const { token, serverUrl } = await requestLiveKitCredentials();
        if (cancelled) return;
        logVerbose("CONNECT_TO_ROOM_CREDENTIALS_RECEIVED", {
          serverUrl,
        });

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
        logVerbose("CONNECT_TO_ROOM_CONNECTED", {
          roomName: room.name,
          participantId: room.localParticipant.identity,
        });

        if (cancelled) {
          await cleanupRoom();
          return;
        }

        seedParticipants(room);
        logVerbose("CONNECT_TO_ROOM_SEEDED_PARTICIPANTS", {
          participantCount: room.remoteParticipants.size,
        });
        await publishLocalAudio(room);
        logVerbose("CONNECT_TO_ROOM_PUBLISHED_LOCAL_AUDIO");

        if (cancelled) {
          await cleanupRoom();
          return;
        }

        setState("CONNECTED");
        logVerbose("CONNECT_TO_ROOM_SUCCESS");
      } catch (error) {
        if (cancelled) return;
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_CONNECT", error);
        logVerbose("CONNECT_TO_ROOM_FAILED");
        setState("FAILED");
        setShouldConnect(false);
        await cleanupRoom();
      }
    };

    void connectToRoom();

    return () => {
      cancelled = true;
      logVerbose("CONNECT_TO_ROOM_CANCELLED");
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
    logVerbose,
  ]);

  useEffect(() => {
    if (state !== "CONNECTED" || !roomRef.current) return;

    let cancelled = false;

    const updatePingFromStats = async () => {
      const pcManager = roomRef.current?.engine.pcManager;
      const transport = pcManager?.publisher ?? pcManager?.subscriber;

      if (!transport) {
        logVerbose("PING_TRANSPORT_UNAVAILABLE");
        return;
      }

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
              logVerbose("PING_UPDATED", {
                ping: Math.round(candidate.currentRoundTripTime * 1000),
              });
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
  }, [state, debugLog, logVerbose]);

  const enableNoiseSuppression = useCallback(
    (algorithm?: NoiseSuppressionAlgorithm) => {
      logVerbose("NOISE_SUPPRESSION_ENABLE_REQUEST", {
        algorithm,
        supported: noiseSuppressionSupported,
      });
      if (noiseSuppressionSupported) {
        setNoiseSuppressionEnabled(true);
        if (algorithm) {
          setNoiseSuppressionAlgorithm(algorithm);
        }
        logVerbose("NOISE_SUPPRESSION_ENABLED", {
          algorithm: algorithm ?? noiseSuppressionAlgorithm,
        });
      }
    },
    [noiseSuppressionSupported, logVerbose, noiseSuppressionAlgorithm]
  );

  const disableNoiseSuppression = useCallback(() => {
    logVerbose("NOISE_SUPPRESSION_DISABLE_REQUEST");
    setNoiseSuppressionEnabled(false);
    audioService.cleanup();
    logVerbose("NOISE_SUPPRESSION_DISABLED");
  }, [logVerbose]);

  const toggleNoiseSuppression = useCallback(() => {
    logVerbose("NOISE_SUPPRESSION_TOGGLE", {
      currentlyEnabled: noiseSuppressionEnabled,
    });
    if (noiseSuppressionEnabled) {
      disableNoiseSuppression();
    } else {
      enableNoiseSuppression();
    }
  }, [
    noiseSuppressionEnabled,
    enableNoiseSuppression,
    disableNoiseSuppression,
    logVerbose,
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
