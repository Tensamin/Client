"use client";

// Package Imports
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import {
  attachSpeakingDetectionToRemoteTrack,
  DEFAULT_NOISE_SUPPRESSION_CONFIG,
  DEFAULT_OUTPUT_GAIN_CONFIG,
  DEFAULT_SPEAKING_DETECTION_CONFIG,
  type SpeakingController,
} from "@tensamin/audio";
import {
  ConnectionState,
  createLocalAudioTrack,
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteAudioTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RoomEvent,
  Track,
} from "livekit-client";
import * as Icon from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// Lib Imports
import { audioService } from "@/lib/audioService";
import * as CommunicationValue from "@/lib/communicationValues";
import { defaults } from "@/lib/utils";

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
import Avatar from "@/components/modals/Avatar";
import { User } from "@/lib/types";

// Main
const SubCallContext = createContext<SubCallContextValue | null>(null);
const CallContext = createContext<CallContextValue | null>(null);

// Stream Preview
async function captureScreenShareFrame(
  track: LocalVideoTrack,
): Promise<string | null> {
  const video = document.createElement("video");
  video.muted = true;
  video.srcObject = new MediaStream([track.mediaStreamTrack]);
  await video.play();

  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth = canvas.width;
  let drawHeight = canvas.width / videoAspect;
  let offsetX = 0;
  let offsetY = (canvas.height - drawHeight) / 2;

  if (videoAspect < canvasAspect) {
    drawWidth = canvas.height * videoAspect;
    drawHeight = canvas.height;
    offsetX = (canvas.width - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  const dataUrl = canvas.toDataURL("image/webp", 0.5);

  video.pause();
  video.srcObject = null;

  return dataUrl;
}

function ScreenSharePreviewManager() {
  const { localParticipant } = useLocalParticipant();
  const { setParticipantData } = useSubCallContext();
  const { playSound } = useCallContext();
  const tracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const localScreenShare = tracks.find((t) => t.participant.isLocal);
  const screenShareTrack = localScreenShare?.publication?.track;

  const localParticipantRef = useRef(localParticipant);
  useEffect(() => {
    localParticipantRef.current = localParticipant;
  }, [localParticipant]);

  const prevScreenShareTrack = useRef<typeof screenShareTrack>(undefined);
  useEffect(() => {
    // Detect screen share start
    if (screenShareTrack && !prevScreenShareTrack.current) {
      playSound("stream_start_self");
    }
    // Detect screen share stop
    if (!screenShareTrack && prevScreenShareTrack.current) {
      playSound("stream_end_self");
    }
    prevScreenShareTrack.current = screenShareTrack;
  }, [screenShareTrack, playSound]);

  useEffect(() => {
    if (!screenShareTrack || !(screenShareTrack instanceof LocalVideoTrack))
      return;

    const updatePreview = async () => {
      const participant = localParticipantRef.current;
      if (!participant) return;

      const preview = await captureScreenShareFrame(screenShareTrack);
      if (preview) {
        const encoder = new TextEncoder();
        const data = encoder.encode(
          JSON.stringify({
            type: "stream_preview",
            preview,
          }),
        );
        await participant.publishData(data, { reliable: true });

        // Update local participant data so user can see their own preview
        const identity = participant.identity;
        if (identity) {
          setParticipantData((prev) => ({
            ...prev,
            [identity]: {
              ...prev[identity],
              stream_preview: preview,
            },
          }));
        }
      }
    };

    // Initial update
    updatePreview();

    // Update every minute
    const interval = setInterval(updatePreview, 60000);

    return () => {
      clearInterval(interval);
      // Send cleanup message when screen share stops
      const participant = localParticipantRef.current;
      if (participant) {
        const encoder = new TextEncoder();
        const data = encoder.encode(
          JSON.stringify({
            type: "stream_preview",
            preview: null,
          }),
        );
        participant.publishData(data, { reliable: true }).catch(() => {});

        // Clear local preview
        const identity = participant.identity;
        if (identity) {
          setParticipantData((prev) => ({
            ...prev,
            [identity]: {
              ...prev[identity],
              stream_preview: null,
            },
          }));
        }
      }
    };
  }, [screenShareTrack, setParticipantData]);

  return null;
}

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
  const { get, currentReceiverId, conversations, setConversations } =
    useUserContext();
  const { setPage, page } = usePageContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [token, setToken] = useState("");
  const [outerState, setOuterState] = useState("DISCONNECTED");
  const [dontSendInvite, setDontSendInvite] = useState(false);
  const [callId, setCallId] = useState("");

  const memorizedReceiverId = useRef<number | null>(null);
  const explicitlySetReceiverId = useRef(false);

  const audioElementForSounds = useRef<HTMLAudioElement>(null);

  const playSound = (sound: string) => {
    if (audioElementForSounds.current) {
      audioElementForSounds.current.src = `/assets/sounds/${sound}.wav`;
      audioElementForSounds.current.play().catch((err) => {
        rawDebugLog("Call Context", "Failed to play sound", err, "red");
      });
    }
  };

  useEffect(() => {
    if (!explicitlySetReceiverId.current) {
      memorizedReceiverId.current = currentReceiverId;
    }
  }, [currentReceiverId]);

  // Disconnect functions
  const disconnect = useCallback(() => {
    if (page === "call") {
      setPage("home");
    }
    rawDebugLog("Call Context", "Disconnect");
    setOuterState("DISCONNECTED");
    setShouldConnect(false);
    setToken("");
    explicitlySetReceiverId.current = false;
    memorizedReceiverId.current = null;
    if (connectPromiseRef.current && connectPromiseRef.current.reject) {
      connectPromiseRef.current.reject({ message: "disconnect" });
      connectPromiseRef.current = null;
    }
  }, [setToken, setPage, page]);

  const disconnectPromiseRef = useRef<{
    promise: Promise<void>;
    resolve: (() => void) | null;
    timeout: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const waitForDisconnect = useCallback(() => {
    if (disconnectPromiseRef.current) {
      return disconnectPromiseRef.current.promise;
    }

    let resolveFn: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });

    const timeout = setTimeout(() => {
      if (disconnectPromiseRef.current) {
        disconnectPromiseRef.current.resolve?.();
        disconnectPromiseRef.current = null;
      }
    }, 2000);

    disconnectPromiseRef.current = {
      promise,
      resolve: resolveFn!,
      timeout,
    };

    return promise;
  }, []);

  // Connect functions
  const connectPromiseRef = useRef<{
    resolve: (() => void) | null;
    reject: ((error?: { message: string }) => void) | null;
  } | null>(null);

  const performConnect = useCallback(
    async (token: string, callId: string) => {
      if (shouldConnect) {
        rawDebugLog("Call Context", "Disconnecting before switching call");
        const disconnectPromise = waitForDisconnect();
        setShouldConnect(false);
        await disconnectPromise;
      }

      rawDebugLog("Call Context", "Connecting...");
      setOuterState("CONNECTING");
      setToken(token);
      setCallId(callId);
      setShouldConnect(true);
      setPage("call");

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
    [
      setToken,
      setOuterState,
      setCallId,
      setShouldConnect,
      shouldConnect,
      setPage,
      waitForDisconnect,
    ],
  );

  const [switchCallDialogOpen, setSwitchCallDialogOpen] = useState(false);
  const [pendingCall, setPendingCall] = useState<{
    token: string;
    callId: string;
    receiverId?: number;
  } | null>(null);
  const connect = useCallback(
    (token: string, newCallId: string, receiverId?: number) => {
      if (shouldConnect && callId !== newCallId) {
        setPendingCall({ token, callId: newCallId, receiverId });
        setSwitchCallDialogOpen(true);
        return Promise.resolve();
      }
      if (receiverId !== undefined && receiverId !== 0) {
        memorizedReceiverId.current = receiverId;
        explicitlySetReceiverId.current = true;
      }
      return performConnect(token, newCallId);
    },
    [shouldConnect, callId, performConnect],
  );

  // Handle call switching
  const handleSwitchCall = useCallback(() => {
    if (pendingCall) {
      if (
        pendingCall.receiverId !== undefined &&
        pendingCall.receiverId !== 0
      ) {
        memorizedReceiverId.current = pendingCall.receiverId;
        explicitlySetReceiverId.current = true;
      }
      performConnect(pendingCall.token, pendingCall.callId);
      setSwitchCallDialogOpen(false);
      setPendingCall(null);
    }
  }, [pendingCall, performConnect]);

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
  const saveInviteToConversation = useCallback(
    (callId: string, receiverId: number) => {
      setConversations(
        conversations.map((c) =>
          c.user_id === receiverId
            ? { ...c, calls: [...(c.calls || []), callId] }
            : c,
        ),
      );
    },
    [conversations, setConversations],
  );
  const sendInvite = useCallback(
    async (callId: string, receiverId: number) => {
      send("call_invite", {
        receiver_id: receiverId,
        call_id: callId,
      })
        .then(() => {
          saveInviteToConversation(callId, receiverId);
          toast.success("Call invite sent successfully");
        })
        .catch(() => {
          toast.error("Failed to send call invite");
        });
    },
    [send, saveInviteToConversation],
  );

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
        playSound,
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
              <Avatar
                image={newCaller.avatar}
                display={newCaller.display}
                size={50}
                addBorder
                loading={newCaller.loading}
                state={newCaller.state}
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
          playSound("call_join");
          if (
            !dontSendInvite &&
            memorizedReceiverId.current &&
            memorizedReceiverId.current !== 0
          ) {
            sendInvite(callId, memorizedReceiverId.current);
          }
          setDontSendInvite(false);
          // Clear the explicit flag after connecting
          explicitlySetReceiverId.current = false;

          // Resolve the pending connect promise if one exists
          if (connectPromiseRef.current && connectPromiseRef.current.resolve) {
            connectPromiseRef.current.resolve();
          }
        }}
        onDisconnected={() => {
          rawDebugLog("Call Context", "Room disconnected");
          setOuterState("DISCONNECTED");
          playSound("call_leave");
          if (disconnectPromiseRef.current) {
            if (disconnectPromiseRef.current.timeout) {
              clearTimeout(disconnectPromiseRef.current.timeout);
            }
            disconnectPromiseRef.current.resolve?.();
            disconnectPromiseRef.current = null;
          }
          // If we had a pending connection, reject its promise
          if (connectPromiseRef.current && connectPromiseRef.current.reject) {
            connectPromiseRef.current.reject({
              message: "Room disconnected before connect finished",
            });
          }
        }}
      >
        <audio ref={audioElementForSounds} />
        <RoomAudioRenderer />
        <SubCallProvider>{children}</SubCallProvider>
      </LiveKitRoom>
    </CallContext.Provider>
  );
}

// Sub Provider Component
function SubCallProvider({ children }: { children: React.ReactNode }) {
  const { shouldConnect, playSound } = useCallContext();
  const { data } = useStorageContext();

  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();

  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const pipelineControllerRef = useRef<SpeakingController | null>(null);
  const remoteControllersRef = useRef<
    Map<string, { controller: SpeakingController; cleanup?: () => void }>
  >(new Map());
  const localIdentityRef = useRef<string | null>(null);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingByIdentity, setSpeakingByIdentity] = useState<
    Record<string, boolean>
  >({});
  const [isWatching, setIsWatching] = useState<Record<string, boolean>>({});
  const [participantData, setParticipantData] = useState<
    Record<
      string,
      { deafened?: boolean; muted?: boolean; stream_preview?: string | null }
    >
  >({});
  const [ownMetadata, setOwnMetadata] = useState<OwnMetadata>({
    isAdmin: false,
  });
  const [callMetadata, setCallMetadata] = useState<CallMetadata>({
    anonymousJoining: false,
  });

  // Speaking detection stuff
  const updateSpeakingState = useCallback(
    (identity: string, speaking: boolean) => {
      if (!identity) return;
      setSpeakingByIdentity((prev) => {
        if (prev[identity] === speaking) return prev;
        return { ...prev, [identity]: speaking };
      });
    },
    [],
  );

  const removeSpeakingState = useCallback((identity: string) => {
    if (!identity) return;
    setSpeakingByIdentity((prev) => {
      if (!(identity in prev)) return prev;
      const next = { ...prev };
      delete next[identity];
      return next;
    });
  }, []);

  const speakingConfig = useMemo(
    () => ({
      ...DEFAULT_SPEAKING_DETECTION_CONFIG,
      minDb:
        typeof data.call_speakingMinDb === "number"
          ? data.call_speakingMinDb
          : DEFAULT_SPEAKING_DETECTION_CONFIG.minDb,
      maxDb:
        typeof data.call_speakingMaxDb === "number"
          ? data.call_speakingMaxDb
          : DEFAULT_SPEAKING_DETECTION_CONFIG.maxDb,
    }),
    [data.call_speakingMaxDb, data.call_speakingMinDb],
  );

  // Get own and call metadata
  useEffect(() => {
    if (!localParticipant.metadata) return;
    const parsedData = JSON.parse(localParticipant.metadata);
    setOwnMetadata(parsedData);
  }, [localParticipant.metadata]);
  useEffect(() => {
    if (!room.metadata) return;
    const parsedData = JSON.parse(room.metadata);
    setCallMetadata(parsedData);
  }, [room.metadata]);

  // Data channel listener for participant data
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
    ) => {
      if (!participant) return;

      try {
        const decoder = new TextDecoder();
        const text = decoder.decode(payload);
        const data = JSON.parse(text);

        const identity = participant.identity;
        if (!identity) return;

        if (data.type === "deafened") {
          setParticipantData((prev) => ({
            ...prev,
            [identity]: {
              ...prev[identity],
              deafened: data.deafened,
            },
          }));
        } else if (data.type === "stream_preview") {
          setParticipantData((prev) => ({
            ...prev,
            [identity]: {
              ...prev[identity],
              stream_preview: data.preview,
            },
          }));
        }
      } catch (error) {
        rawDebugLog(
          "Sub Call Context",
          "Failed to parse data message",
          error,
          "red",
        );
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Screen share watching management
  const { ownId } = useUserContext();
  const startWatching = useCallback(
    (identity: string) => {
      if (Number(identity) === ownId) return;
      setIsWatching((prev) => ({ ...prev, [identity]: true }));
    },
    [ownId],
  );

  const stopWatching = useCallback((identity: string) => {
    setIsWatching((prev) => {
      const newWatching = { ...prev };
      delete newWatching[identity];
      return newWatching;
    });
  }, []);

  // Play sounds when isWatching changes
  const prevIsWatchingRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const prev = prevIsWatchingRef.current;
    const current = isWatching;

    // Check for new watchers
    Object.keys(current).forEach((identity) => {
      if (current[identity] && !prev[identity]) {
        playSound("stream_watch_other");
      }
    });

    // Check for stopped watchers
    Object.keys(prev).forEach((identity) => {
      if (prev[identity] && !current[identity]) {
        playSound("stream_watch_end");
      }
    });

    prevIsWatchingRef.current = { ...current };
  }, [isWatching, playSound]);

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

  // Join & Leave Sounds
  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = () => {
      playSound("call_join");
    };

    const handleParticipantDisconnected = () => {
      playSound("call_leave");
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(
        RoomEvent.ParticipantDisconnected,
        handleParticipantDisconnected,
      );
    };
  }, [room, playSound]);

  // Remote Screen Share Sounds
  useEffect(() => {
    if (!room || !localParticipant) return;

    const handleTrackPublished = (publication: RemoteTrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        playSound("stream_start_other");
      }
    };

    const handleTrackUnpublished = (publication: RemoteTrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        playSound("stream_end_other");
      }
    };

    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    room.on(RoomEvent.TrackUnpublished, handleTrackUnpublished);

    return () => {
      room.off(RoomEvent.TrackPublished, handleTrackPublished);
      room.off(RoomEvent.TrackUnpublished, handleTrackUnpublished);
    };
  }, [room, localParticipant, playSound]);

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
            (data.call_enableNoiseSuppression as boolean) ??
            DEFAULT_NOISE_SUPPRESSION_CONFIG.enabled ??
            true;
          const noiseReductionLevel =
            typeof data.call_noiseReductionLevel === "number"
              ? data.call_noiseReductionLevel
              : (DEFAULT_NOISE_SUPPRESSION_CONFIG.noiseReductionLevel ?? 60);
          const inputGain =
            typeof data.call_inputGain === "number"
              ? data.call_inputGain
              : (DEFAULT_OUTPUT_GAIN_CONFIG.speechGain ?? 1);
          const speakingMinDb = speakingConfig.minDb;
          const speakingMaxDb = speakingConfig.maxDb;

          await audioService.resumeContext();

          createdTrack = await createLocalAudioTrack({
            echoCancellation:
              (data.call_enableEchoCancellation as boolean) ?? false,
            noiseSuppression: false,
            autoGainControl:
              (data.call_enableAutoGainControl as boolean) ?? true,
            deviceId: (data.call_inputDeviceID as string) ?? "default",
            sampleRate: (data.call_sampleRate as number) ?? defaults.sampleRate,
            sampleSize: (data.call_sampleSize as number) ?? defaults.sampleSize,
            voiceIsolation: (data.call_voiceIsolation as boolean) ?? false,
            channelCount:
              (data.call_channelCount as number) || defaults.channelCount,
          });

          if (!mounted) {
            createdTrack.stop();
            return;
          }

          // Publish track first (required before replacing track)
          await localParticipant.publishTrack(createdTrack);

          if (!mounted) {
            createdTrack.stop();
            return;
          }

          // Attach processing pipeline after publishing
          const controller = await audioService.attachToLocalTrack(
            createdTrack,
            {
              noiseSuppressionEnabled: enableNoiseSuppression as boolean,
              noiseReductionLevel,
              inputGain,
              enableNoiseGate: false,
              speakingMinDb,
              speakingMaxDb,
              assetCdnUrl: "/audio",
            },
          );

          pipelineControllerRef.current = controller;
          const identity = localParticipant.identity || "local";
          localIdentityRef.current = identity;

          // Subscribe to speaking state changes
          controller.onChange((state) => {
            setIsSpeaking(state.speaking);
            updateSpeakingState(identity, state.speaking);
          });
          updateSpeakingState(identity, controller.speaking);

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
  }, [
    connectionState,
    shouldConnect,
    localParticipant,
    localTrack,
    data,
    speakingConfig,
    updateSpeakingState,
  ]);

  // Remote speaking detection
  useEffect(() => {
    if (!room) return;

    const attachRemoteSpeaking = async (
      track: RemoteAudioTrack,
      participant: RemoteParticipant,
    ) => {
      const identity = participant.identity;
      if (!identity) return;

      const existing = remoteControllersRef.current.get(identity);
      if (existing) {
        existing.cleanup?.();
        existing.controller.dispose();
        remoteControllersRef.current.delete(identity);
      }

      try {
        const controller = await attachSpeakingDetectionToRemoteTrack(track, {
          speaking: speakingConfig,
        });

        const cleanup = controller.onChange((state) =>
          updateSpeakingState(identity, state.speaking),
        );

        remoteControllersRef.current.set(identity, { controller, cleanup });
        updateSpeakingState(identity, controller.speaking);
      } catch (error) {
        rawDebugLog(
          "Sub Call Context",
          "Failed to attach remote speaking detection",
          error,
          "red",
        );
      }
    };

    const removeRemoteController = (identity: string | undefined) => {
      if (!identity) return;
      const existing = remoteControllersRef.current.get(identity);
      if (existing) {
        existing.cleanup?.();
        existing.controller.dispose();
        remoteControllersRef.current.delete(identity);
      }
      removeSpeakingState(identity);
    };

    const handleTrackSubscribed = (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (!(track instanceof RemoteAudioTrack)) return;
      void attachRemoteSpeaking(track, participant);
    };

    const handleTrackUnsubscribed = (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (!(track instanceof RemoteAudioTrack)) return;
      removeRemoteController(participant.identity);
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      removeRemoteController(participant.identity);
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    const controllersSnapshot = remoteControllersRef.current;

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(
        RoomEvent.ParticipantDisconnected,
        handleParticipantDisconnected,
      );
      const snapshot = new Map(controllersSnapshot);
      snapshot.forEach(({ controller, cleanup }, identity) => {
        cleanup?.();
        controller.dispose();
        removeSpeakingState(identity);
      });
    };
  }, [room, speakingConfig, updateSpeakingState, removeSpeakingState]);

  // Deafen logic
  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isDeafened;
    });
    if (
      localParticipant &&
      shouldConnect &&
      connectionState === ConnectionState.Connected
    ) {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "deafened",
          deafened: isDeafened,
        }),
      );
      localParticipant.publishData(data, { reliable: true }).catch(() => {});

      // Update local participant data
      const identity = localParticipant.identity;
      if (identity) {
        setParticipantData((prev) => ({
          ...prev,
          [identity]: {
            ...prev[identity],
            deafened: isDeafened,
          },
        }));
      }
    }
  }, [isDeafened, localParticipant, shouldConnect, connectionState]);

  // Toggle Mute
  const toggleMute = useCallback(async () => {
    if (!localTrack) return;

    if (localTrack.isMuted) {
      await localTrack.unmute();
      if (isDeafened) {
        setIsDeafened(false);
      }
    } else {
      await localTrack.mute();
    }

    setIsMuted(localTrack.isMuted);

    // Broadcast mute state to other participants
    if (
      localParticipant &&
      shouldConnect &&
      connectionState === ConnectionState.Connected
    ) {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "muted",
          muted: localTrack.isMuted,
        }),
      );
      localParticipant.publishData(data, { reliable: true }).catch(() => {});

      // Update local participant data
      const identity = localParticipant.identity;
      if (identity) {
        setParticipantData((prev) => ({
          ...prev,
          [identity]: {
            ...prev[identity],
            muted: localTrack.isMuted,
          },
        }));
      }
    }
  }, [
    localTrack,
    isDeafened,
    localParticipant,
    shouldConnect,
    connectionState,
  ]);

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
        if (pipelineControllerRef.current) {
          audioService.releaseController(pipelineControllerRef.current);
          pipelineControllerRef.current = null;
        }
        audioService.cleanup();
        if (localIdentityRef.current) {
          removeSpeakingState(localIdentityRef.current);
          localIdentityRef.current = null;
        }

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
        if (pipelineControllerRef.current) {
          audioService.releaseController(pipelineControllerRef.current);
          pipelineControllerRef.current = null;
        }
        audioService.cleanup();
        if (localIdentityRef.current) {
          removeSpeakingState(localIdentityRef.current);
          localIdentityRef.current = null;
        }
      }
    };
  }, [removeSpeakingState, shouldConnect, localParticipant, localTrack]);

  return (
    <SubCallContext.Provider
      value={{
        ownMetadata,
        callMetadata,
        toggleMute,
        isDeafened,
        toggleDeafen,
        isMuted,
        isSpeaking,
        speakingByIdentity,
        connectionState,
        isWatching,
        setIsWatching,
        startWatching,
        stopWatching,
        participantData,
        setParticipantData,
      }}
    >
      <ScreenSharePreviewManager />
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
  connect: (
    token: string,
    callId: string,
    receiverId?: number,
  ) => Promise<void>;
  setOuterState: (input: string) => void;
  setShouldConnect: (input: boolean) => void;
  disconnect: () => void;
  playSound: (sound: string) => void;
};

type OwnMetadata = {
  isAdmin: boolean;
};
type CallMetadata = {
  anonymousJoining: boolean;
};
type SubCallContextValue = {
  ownMetadata: OwnMetadata;
  callMetadata: CallMetadata;
  toggleMute: () => void;
  isDeafened: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  speakingByIdentity: Record<string, boolean>;
  connectionState: ConnectionState;
  toggleDeafen: () => void;
  isWatching: Record<string, boolean>;
  setIsWatching: (watching: Record<string, boolean>) => void;
  startWatching: (identity: string) => void;
  stopWatching: (identity: string) => void;
  participantData: Record<
    string,
    { deafened?: boolean; stream_preview?: string | null }
  >;
  setParticipantData: React.Dispatch<
    React.SetStateAction<
      Record<string, { deafened?: boolean; stream_preview?: string | null }>
    >
  >;
};
