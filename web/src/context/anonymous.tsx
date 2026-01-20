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
import { v7 } from "uuid";

// Lib Imports
import * as CommunicationValue from "@/lib/communicationValues";
import { anonymous_client_wss } from "@/lib/endpoints";
import { User } from "@/lib/types";
import { RetryCount, getDisplayFromUsername, responseTimeout } from "@/lib/utils";

// Context Imports
import { rawDebugLog } from "@/context/storage";

// Types
type AnonymousContextType = {
  readyState: ReadyState;
  connected: boolean;
  get: (id: number, refetch?: boolean) => Promise<User>;
  customName: string;
  setCustomName: (name: string) => void;
  fetchedUsers: Map<number, User>;
  send: (
    requestType: string,
    data?: unknown,
    noResponse?: boolean
  ) => Promise<CommunicationValue.DataContainer>;
};

const AnonymousContext = createContext<AnonymousContextType | null>(null);

export function useAnonymousContext() {
  const context = useContext(AnonymousContext);
  if (!context) throw new Error("useAnonymousContext must be used within AnonymousProvider");
  return context;
}

export function AnonymousProvider({
  children,
  userId,
}: Readonly<{
  children: React.ReactNode;
  userId: number;
}>) {
  const pendingRequests = useRef(new Map());
  const [customName, setCustomName] = useState("");
  const [fetchedUsers, setFetchedUsers] = useState<Map<number, User>>(new Map());
  const fetchedUsersRef = useRef(fetchedUsers);
  const inFlightRef = useRef<Map<number, Promise<User>>>(new Map());

  const updateFetchedUsers = useCallback(
    (updater: (next: Map<number, User>) => void) => {
      setFetchedUsers((prev) => {
        const next = new Map(prev);
        updater(next);
        fetchedUsersRef.current = next;
        return next;
      });
    },
    []
  );

  // Handle Incoming Messages
  const handleMessage = useCallback(async (message: MessageEvent) => {
    try {
      const parsedMessage: CommunicationValue.Parent = JSON.parse(message.data);

      // Handle pending requests
      const currentRequest = pendingRequests.current.get(parsedMessage.id);
      if (currentRequest) {
        clearTimeout(currentRequest.timeoutId);
        pendingRequests.current.delete(parsedMessage.id);
        if (parsedMessage.type.startsWith("error")) {
          currentRequest.reject(parsedMessage);
          rawDebugLog("Anonymous Context", "Received error", parsedMessage, "red");
        } else {
          currentRequest.resolve(parsedMessage.data);
        }
      }

      // Log Message
      if (parsedMessage.type !== "get_user_data" && !parsedMessage.type.startsWith("error")) {
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
  const { sendMessage: sendRaw, readyState } = useWebSocket(anonymous_client_wss, {
    onError: (e) => {
      rawDebugLog("Anonymous Context", "WebSocket Error", e, "red");
    },
    onOpen: () =>
      rawDebugLog("Anonymous Context", "Connected to Omikron (anonymous)", "", "green"),
    onClose: () => {
      rawDebugLog("Anonymous Context", "Disconnected from Omikron (anonymous)", "", "red");

      // Clear pending requests
      pendingRequests.current.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId);
        reject(new Error("Disconnected before a response was received"));
      });
      pendingRequests.current.clear();
    },
    onMessage: handleMessage,
    shouldReconnect: () => true,
    share: true,
    reconnectAttempts: RetryCount,
    reconnectInterval: 3000,
  });

  const connected = readyState === ReadyState.OPEN;

  // Send Function (no identification required for anonymous)
  const send = useCallback(
    async (
      requestType: string,
      data: unknown = {},
      noResponse = false
    ): Promise<CommunicationValue.DataContainer> => {
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
            if (messageToSend.type !== "get_user_data") {
              rawDebugLog("Anonymous Context", "Sent", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (error: unknown) {
            rawDebugLog("Anonymous Context", "An unknown error occurred", error, "red");
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
              "Anonymous Context",
              error.message,
              { id, type: requestType, data },
              "red"
            );
            reject(error);
            pendingRequests.current.delete(id);
          }, responseTimeout);

          pendingRequests.current.set(id, { resolve, reject, timeoutId });

          try {
            if (messageToSend.type !== "get_user_data") {
              rawDebugLog("Anonymous Context", "Sent", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (error: unknown) {
            clearTimeout(timeoutId);
            pendingRequests.current.delete(id);
            rawDebugLog("Anonymous Context", "An unknown error occurred", error, "red");
            reject(error);
          }
        });
      } else {
        rawDebugLog("Anonymous Context", "Socket is not ready", { requestType, data }, "red");
        throw new Error("Socket is not ready");
      }
    },
    [readyState, sendRaw]
  );

  // Get user data function
  const get = useCallback(
    async (id: number, refetch: boolean = false): Promise<User> => {
      try {
        if (!id || id === 0) {
          throw new Error("Invalid ID");
        }

        if (inFlightRef.current.has(id) && !refetch) {
          return inFlightRef.current.get(id)!;
        }

        const hasUser = fetchedUsersRef.current.has(id);
        const existingUser = hasUser ? fetchedUsersRef.current.get(id) : undefined;
        const shouldFetch = refetch || !hasUser;

        if (hasUser && !shouldFetch) {
          return existingUser!;
        }

        const fetchPromise = (async () => {
          try {
            rawDebugLog("Anonymous Context", "Fetching user", { id }, "yellow");
            const data = (await send("get_user_data", {
              user_id: id,
            })) as CommunicationValue.get_user_data;

            const apiUserData: User = {
              id,
              username: data.username,
              display: getDisplayFromUsername(data.username, data.display),
              avatar: data.avatar
                ? `data:image/webp;base64,${data.avatar}`
                : undefined,
              about: data.about,
              status: data.status,
              sub_level: data.sub_level,
              sub_end: data.sub_end,
              public_key: data.public_key,
              state: data.state,
              loading: false,
            };

            // If this is the anonymous user themselves and they have a custom name, override
            if (id === userId && customName.trim()) {
              apiUserData.display = customName.trim();
            }

            updateFetchedUsers((draft) => {
              draft.set(id, apiUserData);
            });

            inFlightRef.current.delete(id);

            return apiUserData;
          } catch (error: unknown) {
            inFlightRef.current.delete(id);

            const currentExisting = fetchedUsersRef.current.get(id);
            if (currentExisting) {
              const failedUser: User = {
                ...currentExisting,
                about: String(error),
                loading: false,
              };
              updateFetchedUsers((draft) => {
                draft.set(id, failedUser);
              });
              return failedUser;
            }

            return {
              id: 0,
              username: "failed",
              display: "Failed to load",
              avatar: undefined,
              about: String(error),
              status: "",
              sub_level: 0,
              sub_end: 0,
              public_key: "",
              created_at: new Date().toISOString(),
              state: "NONE",
              loading: false,
            };
          }
        })();

        inFlightRef.current.set(id, fetchPromise);
        return fetchPromise;
      } catch (e) {
        rawDebugLog("Anonymous Context", "Error in get", e, "red");
        throw e;
      }
    },
    [send, customName, userId, updateFetchedUsers]
  );

  // When custom name changes, update the fetched user for this user
  useEffect(() => {
    if (userId && customName.trim()) {
      const existingUser = fetchedUsersRef.current.get(userId);
      if (existingUser) {
        updateFetchedUsers((draft) => {
          const user = draft.get(userId);
          if (user) {
            draft.set(userId, { ...user, display: customName.trim() });
          }
        });
      }
    }
  }, [customName, userId, updateFetchedUsers]);

  return (
    <AnonymousContext.Provider
      value={{
        readyState,
        connected,
        get,
        customName,
        setCustomName,
        fetchedUsers,
        send,
      }}
    >
      {children}
    </AnonymousContext.Provider>
  );
}
