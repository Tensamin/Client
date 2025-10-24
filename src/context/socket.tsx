"use client";

// Package Imports
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
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
import { useStorageContext } from "@/context/storage";

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

  const { debugLog, bypass } = useStorageContext();
  const { setPage } = usePageContext();
  const { privateKeyHash, ownUuid } = useCryptoContext();

  const forceLoad = false;

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
          debugLog("SOCKET_CONTEXT", "ERROR_SOCKET_CONTEXT_INVALID_MESSAGE");
        }
        if (parsedMessage.type !== "pong") {
          debugLog("SOCKET_CONTEXT", "SOCKET_CONTEXT_RECEIVE", {
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
      } catch {
        debugLog("SOCKET_CONTEXT", "ERROR_SOCKET_CONTEXT_UNKNOWN");
      }
    },
    [debugLog]
  );

  const { sendMessage: sendRaw, readyState } = useWebSocket(client_wss, {
    onOpen: () => debugLog("SOCKET_CONTEXT", "SOCKET_CONTEXT_CONNECTED"),
    onClose: () => {
      debugLog("SOCKET_CONTEXT", "SOCKET_CONTEXT_DISCONNECTED");
      pendingRequests.current.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId);
        reject(new Error("ERROR_SOCKET_CONTEXT_CLOSED_BEFORE_RESPONSE"));
      });
      pendingRequests.current.clear();
    },
    onMessage: handleMessage,
    shouldReconnect: () => !forceLoad,
    share: true,
    reconnectAttempts: RetryCount,
    reconnectInterval: 500,
    onReconnectStop: () => {
      setPage(
        "error",
        "ERROR_SOCKET_CONTEXT_CANNOT_CONNECT",
        "ERROR_SOCKET_CONTEXT_CANNOT_CONNECT_EXTRA"
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
              debugLog("SOCKET_CONTEXT", "SOCKET_CONTEXT_SEND", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch {
            debugLog("SOCKET_CONTEXT", "ERROR_SOCKET_CONTEXT_UNKNOWN");
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
            debugLog(
              "SOCKET_CONTEXT",
              "ERROR_SOCKET_CONTEXT_TIMEOUT",
              requestType
            );
            reject();
          }, responseTimeout);

          pendingRequests.current.set(id, { resolve, reject, timeoutId });

          try {
            if (messageToSend.type !== "ping") {
              debugLog("SOCKET_CONTEXT", "SOCKET_CONTEXT_SEND", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (err: unknown) {
            clearTimeout(timeoutId);
            pendingRequests.current.delete(id);
            debugLog("SOCKET_CONTEXT", "ERROR_SOCKET_CONTEXT_UNKNOWN");
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
    [readyState, forceLoad, debugLog, sendRaw]
  );

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
            debugLog("SOCKET_CONTEXT", "SOCKET_CONTEXT_IDENTIFICATION_SUCCESS");
          } else {
            setPage(
              "error",
              data.type.toUpperCase(),
              data.type.toUpperCase() + "_EXTRA"
            );
          }
        })
        .catch((err) => {
          debugLog(
            "SOCKET_CONTEXT",
            "ERROR_SOCKET_CONTEXT_IDENTIFICATION_FAILED",
            err
          );
          setPage("error", "ERROR_SOCKET_CONTEXT_IDENTIFICATION_FAILED");
        });
    }
  }, [connected, privateKeyHash, setPage, identified, ownUuid, debugLog, send]);

  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      const originalNow = Date.now();
      send("ping", {
        last_ping: originalNow,
      }).then((data) => {
        if (data.type !== "error") {
          const actuallyNow = Date.now();
          const now = actuallyNow - originalNow;
          setOwnPing(now);
          setIotaPing(data.data.ping_iota || 0);
        }
      });
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [isReady, send]);

  if (bypass && !identified && readyState !== ReadyState.OPEN) {
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
      return identified ? (
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
      ) : (
        <Loading message="SOCKET_CONTEXT_LOADING_IDENTIFYING" />
      );
    case ReadyState.CONNECTING:
      return <Loading message="SOCKET_CONTEXT_LOADING_CONNECTING" />;
    case ReadyState.CLOSING:
      return <Loading message="SOCKET_CONTEXT_LOADING_CLOSING" />;
    case ReadyState.CLOSED:
      return <Loading message="SOCKET_CONTEXT_LOADING_CLOSED" />;
    case ReadyState.UNINSTANTIATED:
      return <Loading message="SOCKET_CONTEXT_LOADING_UNINSTANTIATED" />;
    default:
      return <Loading message="SOCKET_CONTEXT_LOADING" />;
  }
}
