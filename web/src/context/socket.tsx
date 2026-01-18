"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { v7 } from "uuid";

// Lib Imports
import * as CommunicationValue from "@/lib/communicationValues";
import { client_wss } from "@/lib/endpoints";
import { UserState } from "@/lib/types";
import { RetryCount, progressBar, responseTimeout } from "@/lib/utils";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/context/page";
import { rawDebugLog } from "@/context/storage";
import { fetchUserData } from "@/lib/utils";

// Components
import { Loading } from "@/components/loading";

// Main
type SocketContextType = {
  readyState: ReadyState;
  lastMessage: CommunicationValue.Parent;
  ownPing: number;
  iotaPing: number;
  send: (
    requestType: string,
    data?: unknown,
    noResponse?: boolean,
  ) => Promise<CommunicationValue.DataContainer>;
  identified: boolean;
  initialUserState: UserState;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function SocketProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pendingRequests = useRef(new Map());

  const { setError } = usePageContext();
  const { ownId } = useCryptoContext();

  const [identified, setIdentified] = useState(false);
  const [lastMessage, setLastMessage] = useState<CommunicationValue.Parent>({
    id: "",
    type: "",
    data: {},
  });
  const [initialUserState, setInitialUserState] = useState<UserState>("NONE");
  const [ownPing, setOwnPing] = useState<number>(0);
  const [iotaPing, setIotaPing] = useState<number>(0);

  // Handle Incoming Messages
  const handleMessage = useCallback(async (message: MessageEvent) => {
    try {
      const parsedMessage: CommunicationValue.Parent = JSON.parse(message.data);
      setLastMessage(parsedMessage);

      // Send Function
      const currentRequest = pendingRequests.current.get(parsedMessage.id);
      if (currentRequest) {
        clearTimeout(currentRequest.timeoutId);
        pendingRequests.current.delete(parsedMessage.id);
        if (parsedMessage.type.startsWith("error")) {
          currentRequest.reject(parsedMessage);
          rawDebugLog("Socket Context", "Received error", parsedMessage, "red");
        } else {
          currentRequest.resolve(parsedMessage.data);
        }
      }

      // Log Message
      if (
        parsedMessage.type !== "pong" &&
        !parsedMessage.type.startsWith("error")
      ) {
        rawDebugLog("Socket Context", "Received", {
          type: parsedMessage.type,
          data: parsedMessage.data,
        });
      }
    } catch (error: unknown) {
      rawDebugLog("Socket Context", "Unknown error occured", error, "red");
    }
  }, []);

  // Init WebSocket
  const { sendMessage: sendRaw, readyState } = useWebSocket(client_wss, {
    onError: (e) => {
      rawDebugLog("Socket Context", "WebSocket Error", e, "red");
    },
    onOpen: () =>
      rawDebugLog("Socket Context", "Connected to Omikron", "", "green"),
    onClose: () => {
      rawDebugLog("Socket Context", "Disconnected from Omikron", "", "red");

      // Clear pending requests
      pendingRequests.current.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId);
        reject(
          new Error("Disconnected before a response for `send` was received"),
        );
      });

      // Reset state
      pendingRequests.current.clear();
      setIdentified(false);
      setInitialUserState("NONE");
    },
    onMessage: handleMessage,
    shouldReconnect: () => true,
    share: true,
    reconnectAttempts: RetryCount,
    reconnectInterval: 3000,
    onReconnectStop: () => {
      setError(
        "Could not connect to Omikron",
        "Either your internet connection or the Omikron is down. Check our status page and try again later.",
      );
    },
  });

  const connected = readyState === ReadyState.OPEN;

  // Send Function
  const send = useCallback(
    async (
      requestType: string,
      data: unknown = {},
      noResponse = false,
    ): Promise<CommunicationValue.DataContainer> => {
      if (
        (identified ||
          requestType === "identification" ||
          requestType === "challenge_response") &&
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
              rawDebugLog("Socket Context", "Sent", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (error: unknown) {
            rawDebugLog(
              "Socket Context",
              "An unknown error occured",
              error,
              "red",
            );
          }
          return {
            id: "",
            type: "success",
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
            const error = new Error("Request timed out", {
              cause: "Request timed out",
            });
            rawDebugLog(
              "Socket Context",
              error.message,
              { id, type: requestType, data },
              "red",
            );
            reject(error);
            pendingRequests.current.delete(id);
          }, responseTimeout);

          pendingRequests.current.set(id, { resolve, reject, timeoutId });

          try {
            if (messageToSend.type !== "ping") {
              rawDebugLog("Socket Context", "Sent", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (error: unknown) {
            clearTimeout(timeoutId);
            pendingRequests.current.delete(id);
            rawDebugLog(
              "Socket Context",
              "An unkown error occured",
              error,
              "red",
            );
            reject(error);
          }
        });
      } else {
        rawDebugLog(
          "Socket Context",
          "Socket is not ready",
          { requestType, data },
          "red",
        );
        throw new Error("Socket is not ready");
      }
    },
    [readyState, identified, sendRaw],
  );

  // Pings
  const sendPing = useEffectEvent(async () => {
    const originalNow = Date.now();
    const data = (await send("ping", {
      last_ping: originalNow,
    })) as CommunicationValue.ping;
    const travelTime = Date.now() - originalNow;
    setOwnPing(travelTime);
    setIotaPing(data.ping_iota || 0);
  });

  const { get_shared_secret, privateKey, decrypt } = useCryptoContext();
  useEffect(() => {
    if (connected && !identified) {
      send("identification", {
        user_id: ownId,
      })
        .then(async (raw) => {
          const ownUserData = await fetchUserData(ownId);
          if (!ownUserData?.public_key) throw new Error();

          const data = raw as CommunicationValue.identification;
          const sharedSecret = await get_shared_secret(
            privateKey,
            ownUserData.public_key,
            data.public_key,
          );

          if (!sharedSecret.success) {
            setError(
              "Challenge decryption failed",
              "Your private key is invalid. Try logging in again. \n If the issue persists, you may need to regenerate your private key.",
            );
            return;
          }

          const solvedChallenge = await decrypt(
            data.challenge,
            sharedSecret.message,
          );

          if (!solvedChallenge.success) {
            rawDebugLog(
              "Socket Context",
              "Challenge decryption failed",
              solvedChallenge,
              "red",
            );
            setError(
              "Challenge decryption failed",
              "Your private key is invalid. Try logging in again. \n If the issue persists, you may need to regenerate your private key.",
            );
            return;
          }

          send("challenge_response", {
            challenge: solvedChallenge.message,
          })
            .then(() => {
              setIdentified(true);
              rawDebugLog(
                "Socket Context",
                "Successfully identified with Omikron",
                "",
                "green",
              );
            })
            .catch((raw) => {
              const data = raw as CommunicationValue.Error | Error;
              switch (data instanceof Error ? "error" : data.type) {
                case "error_not_authenticated":
                  setError(
                    "Challenge verification failed",
                    "The challenge response was rejected by the Omikron. \n Caused by either an outdated Client or broken Omikron.",
                  );
                  return;
                case "error_no_iota":
                  setError(
                    "Iota Offline",
                    "Your Iota appears to be offline. \n Check your Iota's internet connection or restart it.",
                  );
                  return;
                default:
                  setError(
                    "Unkown error occured",
                    "This error is caused by a broken Omikron, \n an outdated Client or some unknown error.",
                  );
                  return;
              }
            });
        })
        .catch((raw) => {
          const data = raw as CommunicationValue.Error | Error;
          switch (data instanceof Error ? "error" : data.type) {
            case "error_invalid_data":
              setError(
                "Invalid identification data",
                "The identification data sent to the Omikron was invalid. \n This is usually caused by an outdated Client.",
              );
              return;
            case "error_internal":
              setError(
                "Internal Omikron error",
                "An internal error occured on the Omikron. \n Try again later.",
              );
              return;
            case "error_invalid_public_key":
              setError(
                "Internal Omikron error",
                "An internal error occured on the Omikron. \n Try again later.",
              );
              return;
            default:
              setError(
                "Unkown error occured",
                "This error is caused by a broken Omikron, \n an outdated Client or some unknown error.",
              );
              return;
          }
        });
    }
  }, [
    connected,
    setError,
    identified,
    ownId,
    send,
    decrypt,
    get_shared_secret,
    privateKey,
  ]);

  useEffect(() => {
    if (!identified) return;

    const interval = setInterval(() => {
      void sendPing();
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [identified]);

  switch (readyState) {
    case ReadyState.OPEN:
      if (identified) {
        return (
          <SocketContext.Provider
            value={{
              readyState,
              send,
              identified,
              lastMessage,
              ownPing,
              iotaPing,
              initialUserState,
            }}
          >
            {children}
          </SocketContext.Provider>
        );
      }
      return (
        <Loading message="Identifying" progress={progressBar.socket_identify} />
      );
    case ReadyState.CONNECTING:
      return (
        <Loading
          message="Connecting"
          progress={progressBar.socket_connecting}
        />
      );
    case ReadyState.CLOSING:
      return <Loading message="Closing" progress={progressBar.socket} />;
    case ReadyState.CLOSED:
      return <Loading message="Closed" progress={progressBar.socket_base} />;
    case ReadyState.UNINSTANTIATED:
      return (
        <Loading message="Uninstantiated" progress={progressBar.socket_base} />
      );
    default:
      return <Loading message="Loading" progress={progressBar.socket_base} />;
  }
}
