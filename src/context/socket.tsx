"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AdvancedSuccessMessage, LogBody } from "@/lib/types";
import { Loading } from "@/components/loading";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { log, RetryCount } from "@/lib/utils";
import { client_wss } from "@/lib/endpoints";
import { v7 } from "uuid";
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/app/page";

const responseTimeout = 5000;

type SocketContextType = {
  readyState: ReadyState;
  lastMessage: AdvancedSuccessMessage | null;
  ownPing: number;
  iotaPing: number;
  send: (
    requestType: string,
    logData: LogBody,
    data: JSON,
    noResponse?: boolean
  ) => Promise<any>;
  isReady: boolean;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
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
  const { privateKeyHash } = useCryptoContext();

  const forceLoad = false;

  async function handleMessage(message: any) {
    let parsedMessage: AdvancedSuccessMessage = {} as AdvancedSuccessMessage;
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
    } catch (err: any) {
      log(
        "error",
        "SOCKET_CONTEXT",
        "ERROR_SOCKET_CONTEXT_UNKNOWN",
        err.message
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

  let send = useCallback(
    async (
      requestType: string,
      logData: LogBody,
      data: any,
      noResponse: boolean = false
    ) => {
      if (
        !forceLoad &&
        readyState !== ReadyState.CLOSED &&
        readyState !== ReadyState.CLOSING
      ) {
        if (noResponse) {
          let messageToSend = {
            type: requestType,
            log: logData,
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
          } catch (err: any) {
            log(
              "error",
              "SOCKET_CONTEXT",
              "ERROR_SOCKET_CONTEXT_UNKNOWN",
              err.message
            );
          }
          return;
        }

        return new Promise((resolve, reject) => {
          let id = v7();

          let messageToSend = {
            id,
            type: requestType,
            log: logData,
            data,
          };

          let timeoutId = setTimeout(() => {
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
          } catch (err: any) {
            clearTimeout(timeoutId);
            pendingRequests.current.delete(id);
            log(
              "error",
              "SOCKET_CONTEXT",
              "ERROR_SOCKET_CONTEXT_UNKNOWN",
              err.message
            );
            reject(err);
          }
        });
      }
    },
    [sendRaw, readyState, forceLoad]
  );

  useEffect(() => {
    if (connected) {
      send(
        "identification",
        {
          log_level: 0,
          message: "SOCKET_CONTEXT_IDENTIFICATION",
        },
        {
          user_id: localStorage.getItem("auth_uuid"),
          private_key_hash: privateKeyHash,
        }
      )
        .then((data: any) => {
          if (data.type !== "error") {
            setIdentified(true);
            setIsReady(true);
            log(
              "info",
              "SOCKET_CONTEXT",
              "SOCKET_CONTEXT_IDENTIFICATION_SUCCESS"
            );
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
  }, [connected]);

  useEffect(() => {
    if (!connected) return;

    let interval: any;
    interval = setInterval(() => {
      const now1 = Date.now();
      send(
        "ping",
        {
          log_level: -1,
          message: "SOCKET_CONTEXT_PING",
        },
        {
          last_ping: now1,
        }
      ).then((data: any) => {
        if (data.type !== "error") {
          const now2 = Date.now();
          const now = now2 - now1;
          setOwnPing(now);
          setIotaPing(data.data.ping_iota);
        }
      });
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [connected, send]);

  switch (readyState) {
    case ReadyState.OPEN:
      if (!identified)
        return <Loading message="SOCKET_CONTEXT_LOADING_IDENTIFYING" />;
      return (
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
