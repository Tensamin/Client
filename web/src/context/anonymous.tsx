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
import useWebSocket, { ReadyState } from "react-use-websocket";

// Lib Imports
import * as CommunicationValue from "@/lib/communicationValues";
import {
  createSendFunction,
  handlePendingRequest,
  clearPendingRequests,
  PendingRequest,
} from "@/lib/contextUtils";
import { anonymous_client_wss } from "@/lib/endpoints";
import { User } from "@/lib/types";
import { RetryCount } from "@/lib/utils";

// Context Imports
import { rawDebugLog } from "@/context/storage";

// Types
type IdentificationState =
  | "connecting"
  | "identifying"
  | "identified"
  | "error";

type AnonymousUserData = {
  username: string;
  display: string;
  avatar: string;
  user_id: number;
};

type AnonymousContextType = {
  readyState: ReadyState;
  connected: boolean;
  identificationState: IdentificationState;
  identificationError: string | null;
  userData: AnonymousUserData | null;
  callData: CommunicationValue.anonymous_call_data | null;
  identify: (callId: string) => Promise<void>;
  fetchedUsers: Map<number, User>;
  send: (
    requestType: string,
    data?: unknown,
    noResponse?: boolean,
  ) => Promise<CommunicationValue.DataContainer>;
};

const AnonymousContext = createContext<AnonymousContextType | null>(null);

export function useAnonymousContext() {
  const context = useContext(AnonymousContext);
  if (!context)
    throw new Error(
      "useAnonymousContext must be used within AnonymousProvider",
    );
  return context;
}

export function AnonymousProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const [fetchedUsers, setFetchedUsers] = useState<Map<number, User>>(
    new Map(),
  );
  const fetchedUsersRef = useRef(fetchedUsers);

  // Identification state
  const [identificationState, setIdentificationState] =
    useState<IdentificationState>("connecting");
  const [identificationError, setIdentificationError] = useState<string | null>(
    null,
  );
  const [userData, setUserData] = useState<AnonymousUserData | null>(null);
  const [callData, setCallData] =
    useState<CommunicationValue.anonymous_call_data | null>(null);
  const shouldReconnectRef = useRef(true);

  const updateFetchedUsers = useCallback(
    (updater: (next: Map<number, User>) => void) => {
      setFetchedUsers((prev) => {
        const next = new Map(prev);
        updater(next);
        fetchedUsersRef.current = next;
        return next;
      });
    },
    [],
  );

  // Handle Incoming Messages
  const handleMessage = useCallback(async (message: MessageEvent) => {
    try {
      const parsedMessage: CommunicationValue.Parent = JSON.parse(message.data);

      // Handle error_not_authenticated - close connection and stop reconnecting
      if (parsedMessage.type === "error_not_authenticated") {
        rawDebugLog(
          "Anonymous Context",
          "Not authenticated - closing connection",
          parsedMessage,
          "red",
        );
        shouldReconnectRef.current = false;
        setIdentificationState("error");
        setIdentificationError(
          "Not authenticated. The call link may be invalid or expired.",
        );
        return;
      }

      // Handle pending requests
      handlePendingRequest(parsedMessage, pendingRequests, "Anonymous Context");

      // Log Message
      if (
        parsedMessage.type !== "get_user_data" &&
        parsedMessage.type !== "pong" &&
        !parsedMessage.type.startsWith("error")
      ) {
        rawDebugLog("Anonymous Context", "Received", {
          type: parsedMessage.type,
          data: parsedMessage.data,
        });
      }
    } catch (error: unknown) {
      rawDebugLog("Anonymous Context", "Unknown error occurred", error, "red");
    }
  }, []);

  // Init WebSocket
  const {
    sendMessage: sendRaw,
    readyState,
    getWebSocket,
  } = useWebSocket(anonymous_client_wss, {
    onError: (e) => {
      rawDebugLog("Anonymous Context", "WebSocket Error", e, "red");
      setIdentificationState("error");
      setIdentificationError("WebSocket connection error");
    },
    onOpen: () => {
      rawDebugLog(
        "Anonymous Context",
        "Connected to Omikron (anonymous)",
        "",
        "green",
      );
      setIdentificationState("connecting");
    },
    onClose: () => {
      rawDebugLog(
        "Anonymous Context",
        "Disconnected from Omikron (anonymous)",
        "",
        "red",
      );
      clearPendingRequests(pendingRequests);
    },
    onMessage: handleMessage,
    shouldReconnect: () => shouldReconnectRef.current,
    share: true,
    reconnectAttempts: RetryCount,
    reconnectInterval: 3000,
  });

  // Close WebSocket when error_not_authenticated is received
  useEffect(() => {
    if (identificationState === "error" && !shouldReconnectRef.current) {
      const ws = getWebSocket();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  }, [identificationState, getWebSocket]);

  const connected = readyState === ReadyState.OPEN;

  // Send function using shared utility
  const send = useCallback(
    async (
      requestType: string,
      data: unknown = {},
      noResponse = false,
    ): Promise<CommunicationValue.DataContainer> => {
      return createSendFunction({
        contextName: "Anonymous Context",
        readyState,
        sendRaw,
        pendingRequests,
        identified: true,
        skipLogTypes: ["get_user_data", "ping"],
      })(requestType, data, noResponse);
    },
    [readyState, sendRaw],
  );

  // Identify with call_id
  const identify = useCallback(
    async (callId: string): Promise<void> => {
      if (!connected) {
        throw new Error("Not connected to server");
      }

      setIdentificationState("identifying");
      setIdentificationError(null);

      try {
        const response = (await send("identification", {
          call_id: callId,
        })) as CommunicationValue.anonymous_identification_response;

        // Store user data
        setUserData({
          username: response.username,
          display: response.display,
          avatar: response.avatar,
          user_id: response.user_id,
        });

        // Store call data
        setCallData(response.call_state);

        // Pre-populate fetched users with call members
        updateFetchedUsers((draft) => {
          // Add the anonymous user
          draft.set(response.user_id, {
            id: response.user_id,
            username: response.username,
            display: response.display,
            avatar: response.avatar
              ? `data:image/webp;base64,${response.avatar}`
              : undefined,
            about: "",
            status: "",
            sub_level: 0,
            sub_end: 0,
            public_key: "",
            state: "ONLINE",
            loading: false,
          });

          // Add call members
          response.call_state.call_members.forEach((member) => {
            draft.set(member.user_id, {
              id: member.user_id,
              username: member.username,
              display: member.display,
              avatar: member.avatar
                ? `data:image/webp;base64,${member.avatar}`
                : undefined,
              about: "",
              status: "",
              sub_level: 0,
              sub_end: 0,
              public_key: "",
              state: "ONLINE",
              loading: false,
            });
          });
        });

        setIdentificationState("identified");
        rawDebugLog(
          "Anonymous Context",
          "Identification successful",
          response,
          "green",
        );
      } catch (error) {
        rawDebugLog("Anonymous Context", "Identification failed", error, "red");
        setIdentificationState("error");
        setIdentificationError(
          error instanceof Error ? error.message : "Identification failed",
        );
        throw error;
      }
    },
    [connected, send, updateFetchedUsers],
  );

  // Pings
  useEffect(() => {
    if (identificationState !== "identified") return;

    const interval = setInterval(() => {
      send("ping", {});
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [identificationState, send]);

  return (
    <AnonymousContext.Provider
      value={{
        readyState,
        connected,
        identificationState,
        identificationError,
        userData,
        callData,
        identify,
        fetchedUsers,
        send,
      }}
    >
      {children}
    </AnonymousContext.Provider>
  );
}
