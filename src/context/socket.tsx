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
import {
  AdvancedSuccessMessage,
  AdvancedSuccessMessageData,
  UserState,
} from "@/lib/types";
import { RetryCount, responseTimeout } from "@/lib/utils";
import { client_wss } from "@/lib/endpoints";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/context/page";
import { rawDebugLog, useStorageContext } from "@/context/storage";

// Components
import { Loading } from "@/components/loading";

// Main
type SocketContextType = {
  readyState: ReadyState;
  lastMessage: AdvancedSuccessMessage | null;
  ownPing: number;
  iotaPing: number;
  send: (
    requestType: string,
    data?: AdvancedSuccessMessageData,
    noResponse?: boolean
  ) => Promise<AdvancedSuccessMessage>;
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
  const [isReady, setIsReady] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [lastMessage, setLastMessage] = useState<AdvancedSuccessMessage | null>(
    null
  );
  const [initialUserState, setInitialUserState] = useState<UserState>("NONE");

  const [ownPing, setOwnPing] = useState<number>(0);
  const [iotaPing, setIotaPing] = useState<number>(0);
  const [showContent, setShowContent] = useState(false);

  const { bypass } = useStorageContext();
  const { setPage } = usePageContext();
  const { privateKeyHash, ownUuid } = useCryptoContext();

  const forceLoad = false;

  useEffect(() => {
    if (identified) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [identified]);

  const handleMessage = useCallback(async (message: MessageEvent) => {
    let parsedMessage: AdvancedSuccessMessage = {
      type: "",
      data: {},
      id: "",
    };
    try {
      try {
        parsedMessage = JSON.parse(message.data);
      } catch {
        rawDebugLog(
          "Socket Context",
          "Received invalid JSON message",
          { message },
          "red"
        );
      }
      if (parsedMessage.type !== "pong") {
        rawDebugLog("Socket Context", "Received", {
          type: parsedMessage.type,
          data: parsedMessage.data,
        });
      }
      setLastMessage(parsedMessage);
      const currentRequest = pendingRequests.current.get(parsedMessage.id);
      if (currentRequest) {
        clearTimeout(currentRequest.timeoutId);
        pendingRequests.current.delete(parsedMessage.id);
        currentRequest.resolve(parsedMessage);
      }
    } catch (error: unknown) {
      rawDebugLog("Socket Context", "Unknown error occured", error, "red");
    }
  }, []);

  const { sendMessage: sendRaw, readyState } = useWebSocket(client_wss, {
    onOpen: () =>
      rawDebugLog("Socket Context", "Connected to Omikron", "", "green"),
    onClose: () => {
      rawDebugLog("Socket Context", "Disconnected from Omikron", "", "red");
      pendingRequests.current.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId);
        reject(
          new Error("Disconnected before a response for `send` was received")
        );
      });
      pendingRequests.current.clear();
      setIdentified(false);
      setIsReady(false);
      setInitialUserState("NONE");
    },
    onMessage: handleMessage,
    shouldReconnect: () => !forceLoad,
    share: true,
    reconnectAttempts: RetryCount,
    reconnectInterval: 500,
    onReconnectStop: () => {
      setPage(
        "error",
        "Could not connect to Omikron",
        "Either your internet connection or the Omikron is down. Check our status page and try again later."
      );
    },
  });

  const connected = readyState === ReadyState.OPEN;

  const send = useCallback(
    async (
      requestType: string,
      data: AdvancedSuccessMessageData = {},
      noResponse = false
    ): Promise<AdvancedSuccessMessage> => {
      if (
        !forceLoad &&
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
              "red"
            );
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
            rawDebugLog(
              "Socket Context",
              "Request timed out",
              { id, type: requestType, data },
              "red"
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
              "red"
            );
            reject(error);
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
    [readyState, forceLoad, sendRaw]
  );

  const sendPing = useEffectEvent(async () => {
    const originalNow = Date.now();
    const data = await send("ping", { last_ping: originalNow });
    if (!data.type.startsWith("error")) {
      const travelTime = Date.now() - originalNow;
      setOwnPing(travelTime);
      setIotaPing(data.data.ping_iota || 0);
    }
  });

  useEffect(() => {
    if (connected && !identified && privateKeyHash) {
      send("identification", {
        user_id: ownUuid,
        private_key_hash: privateKeyHash,
      })
        .then((data) => {
          if (!data.type.startsWith("error")) {
            setIdentified(true);
            setIsReady(true);
            setInitialUserState(
              (data.data.user_status as UserState) || "ONLINE"
            );
            rawDebugLog(
              "Socket Context",
              "Successfully identified with Omikron",
              "",
              "green"
            );
          } else {
            setPage(
              "error",
              "Identification failed",
              "This could be a broken Omikron or an unkown error."
            );
          }
        })
        .catch((err) => {
          rawDebugLog("Socket Context", "Identification failed", err, "red");
          setPage(
            "error",
            "Identification failed",
            "This could be a broken Omikron or an unkown error."
          );
        });
    }
  }, [connected, privateKeyHash, setPage, identified, ownUuid, send]);

  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      void sendPing();
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [isReady]);

  const actuallyBypass = bypass && !identified;

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
          lastMessage: null,
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
        return <Loading message="Connected" progress={100} />;
      }
      return <Loading message="Identifying" progress={80} />;
    case ReadyState.CONNECTING:
      return <Loading message="Connecting" progress={40} />;
    case ReadyState.CLOSING:
      return <Loading message="Closing" progress={100} />;
    case ReadyState.CLOSED:
      return <Loading message="Closed" progress={0} />;
    case ReadyState.UNINSTANTIATED:
      return <Loading message="Uninstantiated" progress={0} />;
    default:
      return <Loading message="Loading" progress={0} />;
  }
}
