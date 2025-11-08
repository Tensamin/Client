"use client";

// Package Imports
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useEffectEvent,
} from "react";
import { v7 } from "uuid";
import useWebSocket, { ReadyState } from "react-use-websocket";

// Lib Imports
import { responseTimeout } from "@/lib/utils";
import { call_wss } from "@/lib/endpoints";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { useStorageContext } from "@/context/storage";

// Types
import {
  AdvancedSuccessMessage,
  AdvancedSuccessMessageData,
  CallUser,
} from "@/lib/types";

// Main
const iceServers = [
  { urls: "stun:webrtc.tensamin.net:3478" },
  {
    urls: "turns:webrtc.tensamin.net:5349",
    username: "tensamin",
    credential:
      "d31297d3f156d7a0d62ce40a324c1a2ddc1dd6182c7bee4bb31efd9bbb0ac7ca",
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

  // Websocket Stuff
  const pendingRequests = useRef(new Map());
  const [state, setState] = useState<
    "CONNECTED" | "CONNECTING" | "CLOSED" | "FAILED"
  >("CLOSED");
  const [identified, setIdentified] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [failed, setFailed] = useState(false);

  const [callId, setCallId] = useState("019a6488-0086-7759-9bfc-9bda36d58e4f");
  const [ownPing, setOwnPing] = useState<number>(0);

  const {
    debugLog,
    data: { call_onlyAllowRelays },
  } = useStorageContext();
  const { privateKeyHash, ownUuid } = useCryptoContext();

  const handleMessage = useCallback(
    async (message: MessageEvent) => {
      let parsedMessage: AdvancedSuccessMessage = {
        type: "",
        data: {},
        id: "",
      };
      try {
        try {
          parsedMessage = JSON.parse(message.data);
        } catch {
          debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_INVALID_MESSAGE");
        }
        if (parsedMessage.type !== "pong") {
          debugLog("CALL_CONTEXT", "CALL_CONTEXT_RECEIVE", {
            type: parsedMessage.type,
            data: parsedMessage.data,
          });
        }

        switch (parsedMessage.type) {
          case "client_connected":
            if (
              parsedMessage.data.user_id === ownUuid ||
              !parsedMessage.data.user_id
            )
              break;

            usersRef.current.set(parsedMessage.data.user_id, {
              state: parsedMessage.data.call_state ?? "UNKNOWN",
              active: false,
              connection: startConnection(
                parsedMessage.data.user_id,
                true,
                new RTCPeerConnection({
                  iceServers,
                  iceTransportPolicy: data.call_onlyAllowRelays
                    ? "relay"
                    : "all",
                })
              ),
            });
            debugLog("CALL_CONTEXT", "CALL_CONTEXT_PEERS_UPDATED", {
              peers: Array.from(usersRef.current.keys()),
            });
            break;

          case "webrtc_ice":
            if (parsedMessage?.data?.payload) {
              const senderId = parsedMessage.data.sender_id;
              if (!senderId) {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_SENDER", {
                  type: "ICE",
                });
                break;
              }

              const user = usersRef.current.get(senderId);
              if (user?.connection) {
                user.connection.addIceCandidate(
                  new RTCIceCandidate(
                    parsedMessage.data.payload as RTCIceCandidate
                  )
                );
              } else {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_CONNECTION", {
                  senderId,
                  type: "ICE",
                });
              }
            }
            break;

          case "webrtc_sdp":
            if (parsedMessage?.data?.payload) {
              const senderId = parsedMessage.data.sender_id;
              if (!senderId) {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_SENDER", {
                  type: "SDP",
                });
                break;
              }

              const user = usersRef.current.get(senderId);
              const connection = user?.connection;
              if (!connection) {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_CONNECTION", {
                  senderId,
                  type: "SDP",
                });
                break;
              }
              await connection.setRemoteDescription(
                new RTCSessionDescription(
                  parsedMessage.data.payload as RTCSessionDescriptionInit
                )
              );
              if (parsedMessage.data.payload.type === "offer") {
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                debugLog("CALL_CONTEXT", "CALL_CONTEXT_SDP_SEND", {
                  variant: "answer",
                  receiverId: parsedMessage.data.sender_id,
                });
                void send("webrtc_sdp", {
                  receiver_id: parsedMessage.data.sender_id,
                  payload: connection.localDescription!,
                });
              }
            }
            break;

          default:
            break;
        }

        const currentRequest = pendingRequests.current.get(parsedMessage.id);
        if (currentRequest) {
          clearTimeout(currentRequest.timeoutId);
          pendingRequests.current.delete(parsedMessage.id);
          currentRequest.resolve(parsedMessage);
        }
      } catch (err: unknown) {
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
      }
    },
    [debugLog]
  );

  const { sendMessage: sendRaw, readyState } = useWebSocket(
    shouldConnect ? call_wss : null,
    {
      onOpen: () => debugLog("CALL_CONTEXT", "CALL_CONTEXT_CONNECTED"),
      onClose: () => {
        debugLog("CALL_CONTEXT", "CALL_CONTEXT_DISCONNECTED");
        pendingRequests.current.forEach(({ reject, timeoutId }) => {
          clearTimeout(timeoutId);
          reject(new Error("ERROR_CALL_CONTEXT_CLOSED_BEFORE_RESPONSE"));
        });
        pendingRequests.current.clear();
      },
      onMessage: handleMessage,
      shouldReconnect: () => false,
      share: true,
    }
  );

  const send = useCallback(
    async (
      requestType: string,
      data: AdvancedSuccessMessageData = {},
      noResponse = false
    ): Promise<AdvancedSuccessMessage> => {
      if (
        readyState !== ReadyState.CLOSED &&
        readyState !== ReadyState.CLOSING
      ) {
        if (noResponse) {
          const messageToSend = {
            type: requestType,
            data,
          };

          try {
            if (messageToSend.type !== "ping") {
              debugLog("CALL_CONTEXT", "CALL_CONTEXT_SEND", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (err: unknown) {
            debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
          }
          return {
            id: "",
            type: "error",
            data: {},
          };
        }

        return new Promise((resolve, reject) => {
          const id = v7();

          const messageToSend = {
            id,
            type: requestType,
            data,
          };

          const timeoutId = setTimeout(() => {
            pendingRequests.current.delete(id);
            debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_TIMEOUT", requestType);
            reject();
          }, responseTimeout);

          pendingRequests.current.set(id, { resolve, reject, timeoutId });

          try {
            if (messageToSend.type !== "ping") {
              debugLog("CALL_CONTEXT", "CALL_CONTEXT_SEND", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (err: unknown) {
            clearTimeout(timeoutId);
            pendingRequests.current.delete(id);
            debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
            reject(err);
          }
        });
      } else {
        return {
          id: "",
          type: "error",
          data: {},
        };
      }
    },
    [readyState, debugLog, sendRaw]
  );

  const sendPing = useEffectEvent(async () => {
    const originalNow = Date.now();
    const data = await send("ping", { last_ping: originalNow });
    if (data.type !== "error") {
      const travelTime = Date.now() - originalNow;
      setOwnPing(travelTime);
    }
  });

  const fail = useEffectEvent(() => {
    setState("FAILED");
    setShouldConnect(false);
    setFailed(true);
  });

  useEffect(() => {
    if (readyState === ReadyState.OPEN && !identified && privateKeyHash) {
      send("identification", {
        call_id: callId,
        user_id: ownUuid,
        private_key_hash: privateKeyHash,
      })
        .then((message) => {
          if (!message.type.startsWith("error")) {
            setIdentified(true);
            setState("CONNECTED");
            debugLog("CALL_CONTEXT", "CALL_CONTEXT_IDENTIFICATION_SUCCESS");

            Object.keys(message?.data?.about ?? {}).forEach((userId) => {
              usersRef.current.set(userId, {
                state: message.data.about?.[userId].state ?? "UNKNOWN",
                active: false,
                connection: startConnection(
                  userId,
                  false,
                  new RTCPeerConnection({
                    iceServers,
                    iceTransportPolicy: call_onlyAllowRelays ? "relay" : "all",
                  })
                ),
              });
            });
            debugLog("CALL_CONTEXT", "CALL_CONTEXT_PEERS_INITIALIZED", {
              peers: Array.from(usersRef.current.keys()),
            });
          } else {
            debugLog("CALL_CONTEXT", message.type.toUpperCase());
            fail();
          }
        })
        .catch((err) => {
          debugLog(
            "CALL_CONTEXT",
            "ERROR_CALL_CONTEXT_IDENTIFICATION_FAILED",
            err
          );
          fail();
        });
    }

    if (readyState === ReadyState.CONNECTING) setState("CONNECTING");
    if (readyState === ReadyState.UNINSTANTIATED) setState("CLOSED");
    if (readyState === ReadyState.CLOSED) setState("CLOSED");
  }, [
    readyState,
    privateKeyHash,
    setFailed,
    identified,
    ownUuid,
    debugLog,
    send,
  ]);

  useEffect(() => {
    if (state !== "CONNECTED") return;

    const interval = setInterval(() => {
      void sendPing();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [state]);

  // WebRTC Stuff
  const { data } = useStorageContext();

  function startConnection(
    userId: string,
    isInitiator: boolean,
    connection: RTCPeerConnection
  ) {
    console.log(userId);
    if (userId === ownUuid) return;

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        send(
          "webrtc_ice",
          {
            receiver_id: userId,
            payload: event.candidate,
          },
          true
        );
      }
    };

    connection.onconnectionstatechange = () => {
      debugLog("CALL_CONTEXT", "CALL_CONTEXT_CONNECTION_STATE", {
        userId,
        state: connection.connectionState,
      });
    };

    connection.oniceconnectionstatechange = () => {
      debugLog("CALL_CONTEXT", "CALL_CONTEXT_ICE_STATE", {
        userId,
        state: connection.iceConnectionState,
      });
    };

    const addLocalTracks = async () => {
      try {
        const localStream = await getLocalStream("VOICE");
        localStream.getTracks().forEach((track) => {
          connection.addTrack(track, localStream);
        });
      } catch (error) {
        debugLog(
          "CALL_CONTEXT",
          "ERROR_CALL_CONTEXT_LOCAL_STREAM_FAILED",
          error
        );
      }
    };

    if (isInitiator) {
      connection.onnegotiationneeded = async () => {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        debugLog("CALL_CONTEXT", "CALL_CONTEXT_SDP_SEND", {
          variant: "offer",
          receiverId: userId,
        });
        send(
          "webrtc_sdp",
          {
            receiver_id: userId,
            payload: connection.localDescription!,
          },
          true
        );
      };

      void addLocalTracks();
    }

    return connection;
  }

  function getLocalStream(
    type: "VOICE" | "VIDEO" | "CAMERA"
  ): Promise<MediaStream> {
    const voiceConstraints: MediaStreamConstraints = {
      audio: true,
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
      case "VOICE":
        return navigator.mediaDevices.getUserMedia(voiceConstraints);
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
  }

  return (
    <CallContext.Provider
      value={{
        users: usersRef.current,
        setShouldConnect,
        ownPing,
        send,
        state,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

type CallContextType = {
  users: Map<string, CallUser>;
  setShouldConnect: (value: boolean) => void;
  ownPing: number;
  send: (
    requestType: string,
    data?: AdvancedSuccessMessageData,
    noResponse?: boolean
  ) => Promise<AdvancedSuccessMessage>;
  state: "CONNECTED" | "CONNECTING" | "CLOSED" | "FAILED";
};
