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
import { v7 } from "uuid";
import useWebSocket, { ReadyState } from "react-use-websocket";

// Lib Imports
import {
  AdvancedSuccessMessage,
  AdvancedSuccessMessageData,
  ErrorType,
} from "@/lib/types";
import { log, RetryCount } from "@/lib/utils";
import { client_wss } from "@/lib/endpoints";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/context/page";

// Components
import { Loading } from "@/components/loading";

// Main
const responseTimeout = 5000;

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

  const [ownPing, setOwnPing] = useState<number>(0);
  const [iotaPing, setIotaPing] = useState<number>(0);

  const { setPage } = usePageContext();
  const { privateKeyHash, ownUuid } = useCryptoContext();

  const forceLoad = false;

  async function handleMessage(message: MessageEvent) {
    let parsedMessage: AdvancedSuccessMessage = {
      type: "",
      data: {},
      id: "",
    };
    try {
      try {
        parsedMessage = JSON.parse(message.data);
      } catch {
        log("error", "SOCKET_CONTEXT", "ERROR_SOCKET_CONTEXT_INVALID_MESSAGE");
      }
      if (parsedMessage.type !== "pong") {
        log("debug", "SOCKET_CONTEXT", "SOCKET_CONTEXT_RECEIVE", parsedMessage);
      }
      setLastMessage(parsedMessage);
      const currentRequest = pendingRequests.current.get(parsedMessage.id);
      if (currentRequest) {
        clearTimeout(currentRequest.timeoutId);
        pendingRequests.current.delete(parsedMessage.id);
        currentRequest.resolve(parsedMessage);
      }
    } catch (err: unknown) {
      log(
        "error",
        "SOCKET_CONTEXT",
        "ERROR_SOCKET_CONTEXT_UNKNOWN",
        (err as ErrorType).message
      );
    }
  }

  const { sendMessage: sendRaw, readyState } = useWebSocket(client_wss, {
    onOpen: () => log("info", "SOCKET_CONTEXT", "SOCKET_CONTEXT_CONNECTED"),
    onClose: () => {
      log("info", "SOCKET_CONTEXT", "SOCKET_CONTEXT_DISCONNECTED");
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
      setPage("error", "ERROR_SOCKET_CONTEXT_CANNOT_CONNECT");
    },
  });

  const connected = readyState === ReadyState.OPEN;

  async function send(
    requestType: string,
    data: AdvancedSuccessMessageData = {},
    noResponse: boolean = false
  ): Promise<AdvancedSuccessMessage> {
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
            log(
              "debug",
              "SOCKET_CONTEXT",
              "SOCKET_CONTEXT_SEND",
              messageToSend
            );
          }
          sendRaw(JSON.stringify(messageToSend));
        } catch (err: unknown) {
          log(
            "error",
            "SOCKET_CONTEXT",
            "ERROR_SOCKET_CONTEXT_UNKNOWN",
            (err as ErrorType).message
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
          log(
            "error",
            "SOCKET_CONTEXT",
            "ERROR_SOCKET_CONTEXT_TIMEOUT",
            `${requestType}, ${id}`
          );
          reject();
        }, responseTimeout);

        pendingRequests.current.set(id, { resolve, reject, timeoutId });

        try {
          if (messageToSend.type !== "ping") {
            log(
              "debug",
              "SOCKET_CONTEXT",
              "SOCKET_CONTEXT_SEND",
              messageToSend
            );
          }
          sendRaw(JSON.stringify(messageToSend));
        } catch (err: unknown) {
          clearTimeout(timeoutId);
          pendingRequests.current.delete(id);
          log(
            "error",
            "SOCKET_CONTEXT",
            "ERROR_SOCKET_CONTEXT_UNKNOWN",
            (err as ErrorType).message
          );
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
  }

  useEffect(() => {
    if (connected && !identified && privateKeyHash) {
      send("identification", {
        user_id: ownUuid,
        private_key_hash: privateKeyHash,
      })
        .then((data) => {
          if (data.type !== "error") {
            alert(JSON.stringify(data));
            setIdentified(true);
            setIsReady(true);
            log(
              "info",
              "SOCKET_CONTEXT",
              "SOCKET_CONTEXT_IDENTIFICATION_SUCCESS"
            );
          } else {
            setPage("error", `ERROR_SOCKET_CONTEXT_IDENTIFICATION_FAILED`);
          }
        })
        .catch((err) => {
          log(
            "error",
            "SOCKET_CONTEXT",
            "ERROR_SOCKET_CONTEXT_IDENTIFICATION_FAILED",
            err
          );
          setPage("error", "ERROR_SOCKET_CONTEXT_IDENTIFICATION_FAILED");
        });
    }
  }, [connected, privateKeyHash, send, setPage, identified, ownUuid]);

  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      const now1 = Date.now();
      send("ping", {
        last_ping: now1,
      }).then((data) => {
        if (data.type !== "error") {
          const now2 = Date.now();
          const now = now2 - now1;
          setOwnPing(now);
          setIotaPing(data.data.ping_iota || 0);
        }
      });
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [connected, send]);

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
