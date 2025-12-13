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
import { rawDebugLog, useStorageContext } from "@/context/storage";

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
  isReady: boolean;
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

  const { bypass } = useStorageContext();
  const { setPage } = usePageContext();
  const { privateKeyHash, ownId } = useCryptoContext();

  const [isReady, setIsReady] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [lastMessage, setLastMessage] = useState<CommunicationValue.Parent>({
    id: "",
    type: "",
    data: {},
  });
  const [initialUserState, setInitialUserState] = useState<UserState>("NONE");
  const [ownPing, setOwnPing] = useState<number>(0);
  const [iotaPing, setIotaPing] = useState<number>(0);
  const [showContent, setShowContent] = useState(false);

  const actuallyBypass = bypass && !identified;

  // Loading delay
  useEffect(() => {
    if (identified) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, progressBar.DELAY);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [identified]);

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
      setIsReady(false);
      setInitialUserState("NONE");
    },
    onMessage: handleMessage,
    shouldReconnect: () => !actuallyBypass,
    share: true,
    reconnectAttempts: RetryCount,
    reconnectInterval: 3000,
    onReconnectStop: () => {
      setPage(
        "error",
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
        !actuallyBypass &&
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
            pendingRequests.current.delete(id);
            rawDebugLog(
              "Socket Context",
              "Request timed out",
              { id, type: requestType, data },
              "red",
            );
            reject();
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
        throw new Error("Socket is not ready");
      }
    },
    [readyState, actuallyBypass, sendRaw],
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

  useEffect(() => {
    if (connected && !identified && privateKeyHash) {
      send("identification", {
        user_id: ownId,
        private_key_hash: privateKeyHash,
      })
        .then((raw) => {
          const data = raw as CommunicationValue.identification;
          setIdentified(true);
          setIsReady(true);
          setInitialUserState(data.user_status);
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
            case "error_invalid_private_key":
              setPage(
                "error",
                "Invalid Private Key",
                "Your private key is invalid. Try logging in again. \n If the issue persists, you may need to regenerate your private key.",
              );
              return;
            case "error_no_iota":
              setPage(
                "error",
                "Iota Offline",
                "Your Iota appears to be offline. Check your Iota's internet connection or restart it.",
              );
              return;
            default:
              setPage(
                "error",
                "Identification Failed",
                "This could be a broken Omikron or an unkown error.",
              );
              return;
          }
        });
    }
  }, [connected, privateKeyHash, setPage, identified, ownId, send]);

  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      void sendPing();
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [isReady]);

  if (actuallyBypass) {
    return (
      <SocketContext.Provider
        value={{
          readyState: ReadyState.CLOSED,
          send: async () => ({
            id: "",
            type: "error",
            data: {},
          }),
          isReady: false,
          lastMessage: {
            id: "",
            type: "",
            data: {},
          },
          ownPing: 0,
          iotaPing: 0,
          initialUserState: "NONE",
        }}
      >
        {children}
      </SocketContext.Provider>
    );
  }

  switch (readyState) {
    case ReadyState.OPEN:
      if (identified) {
        if (showContent) {
          return (
            <SocketContext.Provider
              value={{
                readyState,
                send,
                isReady,
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
        return <Loading message="Connected" progress={progressBar.socket} />;
      }
      return (
        <Loading
          message="Identifying"
          progress={progressBar.socket_indentify}
        />
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
