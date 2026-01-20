import { v7 } from "uuid";
import { ReadyState } from "react-use-websocket";

import * as CommunicationValue from "@/lib/communicationValues";
import { User } from "@/lib/types";
import { getDisplayFromUsername, responseTimeout } from "@/lib/utils";
import { rawDebugLog } from "@/context/storage";

// Types
export type PendingRequest = {
  resolve: (value: CommunicationValue.DataContainer) => void;
  reject: (reason: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export type SendOptions = {
  contextName: string;
  readyState: ReadyState;
  sendRaw: (message: string) => void;
  pendingRequests: React.MutableRefObject<Map<string, PendingRequest>>;
  identified?: boolean;
  skipLogTypes?: string[];
};

export type GetUserOptions = {
  contextName: string;
  send: (
    requestType: string,
    data?: unknown,
    noResponse?: boolean,
  ) => Promise<CommunicationValue.DataContainer>;
  fetchedUsersRef: React.MutableRefObject<Map<number, User>>;
  inFlightRef: React.MutableRefObject<Map<number, Promise<User>>>;
  updateFetchedUsers: (updater: (next: Map<number, User>) => void) => void;
  showExtraDebugLogs?: boolean;
};

/**
 * Creates a send function for WebSocket communication
 */
export function createSendFunction(options: SendOptions) {
  const {
    contextName,
    readyState,
    sendRaw,
    pendingRequests,
    identified = true,
    skipLogTypes = ["ping", "pong", "get_user_data"],
  } = options;

  return async (
    requestType: string,
    data: unknown = {},
    noResponse = false,
  ): Promise<CommunicationValue.DataContainer> => {
    const canSend =
      (identified ||
        requestType === "identification" ||
        requestType === "challenge_response" ||
        requestType === "get_user_data") &&
      readyState !== ReadyState.CLOSED &&
      readyState !== ReadyState.CLOSING;

    if (!canSend) {
      rawDebugLog(
        contextName,
        "Socket is not ready",
        { requestType, data },
        "red",
      );
      throw new Error("Socket is not ready");
    }

    if (noResponse) {
      const messageToSend = {
        type: requestType,
        data,
      };

      try {
        if (!skipLogTypes.includes(messageToSend.type)) {
          rawDebugLog(contextName, "Sent", {
            type: messageToSend.type,
            data: messageToSend.data,
          });
        }
        sendRaw(JSON.stringify(messageToSend));
      } catch (error: unknown) {
        rawDebugLog(contextName, "An unknown error occurred", error, "red");
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
          contextName,
          error.message,
          { id, type: requestType, data },
          "red",
        );
        reject(error);
        pendingRequests.current.delete(id);
      }, responseTimeout);

      pendingRequests.current.set(id, { resolve, reject, timeoutId });

      try {
        if (!skipLogTypes.includes(messageToSend.type)) {
          rawDebugLog(contextName, "Sent", {
            type: messageToSend.type,
            data: messageToSend.data,
          });
        }
        sendRaw(JSON.stringify(messageToSend));
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        pendingRequests.current.delete(id);
        rawDebugLog(contextName, "An unknown error occurred", error, "red");
        reject(error);
      }
    });
  };
}

/**
 * Handles incoming WebSocket messages for pending requests
 */
export function handlePendingRequest(
  parsedMessage: CommunicationValue.Parent,
  pendingRequests: React.MutableRefObject<Map<string, PendingRequest>>,
  contextName: string,
): boolean {
  const currentRequest = pendingRequests.current.get(parsedMessage.id);
  if (currentRequest) {
    clearTimeout(currentRequest.timeoutId);
    pendingRequests.current.delete(parsedMessage.id);
    if (parsedMessage.type.startsWith("error")) {
      currentRequest.reject(parsedMessage);
      rawDebugLog(contextName, "Received error", parsedMessage, "red");
    } else {
      currentRequest.resolve(parsedMessage.data);
    }
    return true;
  }
  return false;
}

/**
 * Clears all pending requests (used on disconnect)
 */
export function clearPendingRequests(
  pendingRequests: React.MutableRefObject<Map<string, PendingRequest>>,
  errorMessage = "Disconnected before a response was received",
) {
  pendingRequests.current.forEach(({ reject, timeoutId }) => {
    clearTimeout(timeoutId);
    reject(new Error(errorMessage));
  });
  pendingRequests.current.clear();
}

/**
 * Creates a get user function for fetching user data
 */
export function createGetUserFunction(options: GetUserOptions) {
  const {
    contextName,
    send,
    fetchedUsersRef,
    inFlightRef,
    updateFetchedUsers,
    showExtraDebugLogs = false,
  } = options;

  return async (id: number, refetch: boolean = false): Promise<User> => {
    try {
      if (!id || id === 0) {
        throw new Error("Invalid ID");
      }

      if (inFlightRef.current.has(id) && !refetch) {
        return inFlightRef.current.get(id)!;
      }

      const hasUser = fetchedUsersRef.current.has(id);
      const existingUser = hasUser
        ? fetchedUsersRef.current.get(id)
        : undefined;
      const shouldFetch = refetch || !hasUser;

      if (hasUser && !shouldFetch) {
        if (showExtraDebugLogs) {
          rawDebugLog(contextName, "User already fetched", "", "yellow");
        }
        return existingUser!;
      }

      const fetchPromise = (async () => {
        try {
          rawDebugLog(contextName, "Fetching user", { id }, "yellow");
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
      rawDebugLog(contextName, "Error in get", e, "red");
      throw e;
    }
  };
}
