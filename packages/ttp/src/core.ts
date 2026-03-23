import { log } from "@tensamin/shared/log";
import { z } from "zod";

import { RESPONSE_TIMEOUT } from "./values";

export const READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

const CLOSE_FRAME_LEN = 0xffff_ffff;
const APPLICATION_CLOSE_CODE = 0;
const APPLICATION_CLOSE_REASON = "ttp-close";
const MAX_REQUEST_ID = 0xffff_fffe;
const BINARY_LOG_STORAGE_KEY = "ttp_logBinary";

const DATA_VALUE_KIND_BOOL_TRUE = 0x01;
const DATA_VALUE_KIND_BOOL_FALSE = 0x02;
const DATA_VALUE_KIND_NUMBER = 0x03;
const DATA_VALUE_KIND_STRING = 0x04;
const DATA_VALUE_KIND_ARRAY = 0x05;
const DATA_VALUE_KIND_CONTAINER = 0x06;
const DATA_VALUE_KIND_NULL = 0x07;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type PrimitiveDataKind = "bool" | "number" | "string" | "container" | "null";
type DataKind =
  | PrimitiveDataKind
  | { array: PrimitiveDataKind | "container" | "null" };

type WebTransportCloseOptions = {
  closeCode?: number;
  reason?: string;
};

type WebTransportLike = {
  ready: Promise<unknown>;
  closed: Promise<unknown>;
  createUnidirectionalStream(): Promise<WritableStream<Uint8Array>>;
  incomingUnidirectionalStreams: ReadableStream<ReadableStream<Uint8Array>>;
  close(options?: WebTransportCloseOptions): void;
};

type WebTransportGlobal = typeof globalThis & {
  WebTransport?: new (url: string) => WebTransportLike;
};

type PendingRequest = {
  requestType: string;
  resolve: (value: TypedMessage) => void;
  reject: (reason: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type ActiveConnection = {
  transport: WebTransportLike;
  streamReader: ReadableStreamDefaultReader<ReadableStream<Uint8Array>> | null;
  intentional: boolean;
  closeNotified: boolean;
};

/**
 * Represents non-fatal payload decoding failures for individual protocol messages.
 */
class RecoverableMessageDecodeError extends Error {
  readonly messageId: number;

  readonly messageType: string;

  readonly cause: unknown;

  /**
   * Creates a recoverable decode error associated with a specific message.
   * @param messageId Protocol message id that failed to decode.
   * @param messageType Protocol message type that failed to decode.
   * @param cause Original decode failure cause.
   */
  constructor(messageId: number, messageType: string, cause: unknown) {
    super(
      `Failed to decode message payload for "${messageType}" (id=${messageId}): ${formatUnknownError(cause)}`,
    );
    this.name = "RecoverableMessageDecodeError";
    this.messageId = messageId;
    this.messageType = messageType;
    this.cause = cause;
  }
}

const COMMUNICATION_TYPES = [
  "error",
  "error_protocol",
  "error_anonymous",
  "error_internal",
  "error_invalid_data",
  "error_invalid_user_id",
  "error_invalid_omikron_id",
  "error_not_found",
  "error_not_authenticated",
  "error_no_iota",
  "error_invalid_challenge",
  "error_invalid_secret",
  "error_invalid_private_key",
  "error_invalid_public_key",
  "error_no_user_id",
  "error_no_call_id",
  "error_invalid_call_id",
  "success",
  "shorten_link",
  "settings_save",
  "settings_load",
  "settings_list",
  "message",
  "message_state",
  "message_send",
  "message_live",
  "message_other_iota",
  "message_chunk",
  "messages_get",
  "push_notification",
  "read_notification",
  "get_notifications",
  "change_confirm",
  "confirm_receive",
  "confirm_read",
  "get_chats",
  "get_states",
  "add_community",
  "remove_community",
  "get_communities",
  "challenge",
  "challenge_response",
  "register",
  "register_response",
  "identification",
  "identification_response",
  "register_iota",
  "register_iota_success",
  "ping",
  "pong",
  "add_conversation",
  "send_chat",
  "client_changed",
  "client_connected",
  "client_disconnected",
  "client_closed",
  "public_key",
  "private_key",
  "webrtc_sdp",
  "webrtc_ice",
  "start_stream",
  "end_stream",
  "watch_stream",
  "call_token",
  "call_invite",
  "call_disconnect_user",
  "call_timeout_user",
  "call_set_anonymous_joining",
  "end_call",
  "function",
  "update",
  "create_user",
  "rho_update",
  "user_connected",
  "user_disconnected",
  "iota_connected",
  "iota_disconnected",
  "sync_client_iota_status",
  "get_user_data",
  "get_iota_data",
  "iota_user_data",
  "change_user_data",
  "change_iota_data",
  "get_register",
  "complete_register_user",
  "complete_register_iota",
  "delete_user",
  "delete_iota",
  "start_register",
  "complete_register",
] as const;

const DATA_TYPES = [
  "error_type",
  "error_protocol",
  "accepted_ids",
  "uuid",
  "register_id",
  "link",
  "settings",
  "settings_name",
  "chat_partner_id",
  "chat_partner_name",
  "iota_id",
  "user_id",
  "user_ids",
  "iota_ids",
  "user_state",
  "user_states",
  "user_pings",
  "call_state",
  "screen_share",
  "private_key_hash",
  "accepted",
  "accepted_profiles",
  "denied_profiles",
  "content",
  "messages",
  "notifications",
  "send_time",
  "get_time",
  "get_variant",
  "shared_secret_own",
  "shared_secret_other",
  "shared_secret_sign",
  "shared_secret",
  "call_id",
  "call_token",
  "untill",
  "enabled",
  "start_date",
  "end_date",
  "receiver_id",
  "sender_id",
  "signature",
  "signed",
  "message",
  "message_state",
  "last_ping",
  "ping_iota",
  "ping_clients",
  "matches",
  "omikron",
  "offset",
  "amount",
  "position",
  "name",
  "path",
  "codec",
  "function",
  "payload",
  "result",
  "interactables",
  "want_to_watch",
  "watcher",
  "created_at",
  "username",
  "display",
  "avatar",
  "about",
  "status",
  "public_key",
  "sub_level",
  "sub_end",
  "community_address",
  "challenge",
  "community_title",
  "communities",
  "rho_connections",
  "user",
  "online_status",
  "omikron_id",
  "omikron_connections",
  "reset_token",
  "new_token",
  "call_invited",
  "call_members",
  "calls",
  "timeout",
  "has_admin",
] as const;

const COMMUNICATION_TYPE_BY_NAME = createIndexMap(COMMUNICATION_TYPES);
const DATA_TYPE_BY_NAME = createIndexMap(DATA_TYPES);
const SCALAR_NUMBER_ARRAY_DATA_TYPES = new Set(["last_ping", "ping_iota"]);

const dataKindByType = new Map<string, DataKind>();

registerDataKinds("number", [
  "user_id",
  "sender_id",
  "register_id",
  "receiver_id",
  "call_id",
  "amount",
  "position",
  "offset",
  "timeout",
  "iota_id",
  "chat_partner_id",
  "untill",
  "start_date",
  "end_date",
  "omikron_id",
  "send_time",
  "sub_level",
  "sub_end",
]);

registerDataKinds("string", [
  "error_type",
  "username",
  "display",
  "avatar",
  "about",
  "public_key",
  "message",
  "content",
  "path",
  "codec",
  "function",
  "uuid",
  "link",
  "settings_name",
  "chat_partner_name",
  "user_state",
  "call_state",
  "private_key_hash",
  "name",
  "shared_secret_own",
  "shared_secret_other",
  "shared_secret_sign",
  "shared_secret",
  "message_state",
  "signature",
  "reset_token",
  "new_token",
  "call_token",
  "challenge",
  "online_status",
]);

registerDataKinds({ array: "container" }, [
  "messages",
  "communities",
  "rho_connections",
  "matches",
]);

registerDataKinds({ array: "number" }, [
  "notifications",
  "iota_ids",
  "user_ids",
  "accepted_ids",
  "last_ping",
  "ping_iota",
  "get_time",
  "omikron_connections",
]);

registerDataKinds("container", [
  "settings",
  "user",
  "payload",
  "result",
  "ping_clients",
  "user_pings",
]);

registerDataKinds("bool", [
  "enabled",
  "signed",
  "accepted",
  "has_admin",
  "screen_share",
]);

registerDataKinds({ array: "string" }, ["user_states"]);

registerDataKinds("null", [
  "error_protocol",
  "accepted_profiles",
  "denied_profiles",
  "get_variant",
  "omikron",
  "interactables",
  "want_to_watch",
  "watcher",
  "created_at",
  "status",
  "community_address",
  "community_title",
  "call_invited",
  "call_members",
  "calls",
]);

for (const dataType of DATA_TYPES) {
  if (!dataKindByType.has(dataType)) {
    throw new Error(`Missing data kind mapping for "${dataType}"`);
  }
}

export type TypedMessage<TData = Record<string, unknown>> = {
  id: number;
  type: string;
  data: TData;
};

export type Message = TypedMessage;

export type SchemaMap = Record<
  string,
  { request: z.ZodType; response: z.ZodType }
>;

type SendOptions = {
  id?: number;
  noResponse?: boolean;
};

export type BoundSendFn<T extends SchemaMap> = {
  <K extends keyof T & string>(
    type: K,
    data: z.input<T[K]["request"]>,
    options: { id?: number; noResponse: true },
  ): Promise<void>;

  <K extends keyof T & string>(
    type: K,
    data: z.input<T[K]["request"]>,
    options?: { id?: number; noResponse?: false },
  ): Promise<TypedMessage<z.output<T[K]["response"]>>>;
};

export type PushHandler<TData = Record<string, unknown>> = (
  message: TypedMessage<TData>,
) => void;

export type TransportCloseEvent = {
  error?: unknown;
  intentional: boolean;
};

type TransportClientOptions = {
  url?: string;
  onReadyStateChange?: (readyState: number) => void;
  onClose?: (event: TransportCloseEvent) => void;
};

export type TransportClient<T extends SchemaMap> = {
  connect(url?: string): Promise<void>;
  close(reason?: string): Promise<void>;
  send: BoundSendFn<T>;
  readyState(): number;
  subscribePush(handler: PushHandler): () => void;
};

/**
 * Creates a typed transport client that validates request and response payloads.
 * @param schemas Protocol schema map for request/response validation.
 * @param options Optional transport lifecycle callbacks and default URL.
 * @returns Transport client API for connect, close, send, and push subscriptions.
 */
export function createTransportClient<T extends SchemaMap>(
  schemas: T,
  options: TransportClientOptions = {},
): TransportClient<T> {
  const pending = new Map<number, PendingRequest>();
  const pushHandlers = new Set<PushHandler>();

  let currentConnection: ActiveConnection | null = null;
  let currentReadyState: number = READY_STATE.CLOSED;
  let nextRequestId = 1;
  let configuredUrl = options.url;

  /**
   * Updates current ready state and emits lifecycle callbacks.
   * @param readyState New transport ready state value.
   * @returns Void.
   */
  const setReadyState = (readyState: number) => {
    currentReadyState = readyState;
    options.onReadyStateChange?.(readyState);
  };

  /**
   * Rejects all pending requests and clears timeout handles.
   * @param reason Rejection reason applied to all pending requests.
   * @returns Void.
   */
  const rejectPending = (reason: unknown) => {
    for (const [id, request] of pending) {
      clearTimeout(request.timeoutId);
      request.reject(reason);
      pending.delete(id);
    }
  };

  /**
   * Finalizes closed state for a connection and notifies listeners.
   * @param connection Closed connection object.
   * @param error Optional close error.
   * @returns Void.
   */
  const notifyClosed = (connection: ActiveConnection, error?: unknown) => {
    if (connection.closeNotified) {
      return;
    }

    connection.closeNotified = true;

    if (currentConnection === connection) {
      currentConnection = null;
    }

    if (currentReadyState !== READY_STATE.CLOSED) {
      setReadyState(READY_STATE.CLOSED);
    }

    rejectPending(error ?? new Error("Transport closed"));
    options.onClose?.({ error, intentional: connection.intentional });
  };

  /**
   * Handles connection-level failures and routes them through close handling.
   * @param connection Connection that failed.
   * @param error Optional failure reason.
   * @returns Void.
   */
  const handleConnectionFailure = (
    connection: ActiveConnection,
    error?: unknown,
  ) => {
    if (currentConnection !== connection && connection.closeNotified) {
      return;
    }

    notifyClosed(connection, error);
  };

  /**
   * Handles STOP_SENDING failures by forcing close and notifying failure.
   * @param connection Active connection.
   * @param error Failure reason.
   * @returns Void.
   */
  const closeFromStopSending = (
    connection: ActiveConnection,
    error: unknown,
  ) => {
    if (!isStopSendingError(error)) {
      return;
    }

    try {
      connection.transport.close({
        closeCode: APPLICATION_CLOSE_CODE,
        reason: "stop-sending",
      });
    } catch {
      // Ignore close failures while handling STOP_SENDING.
    }

    handleConnectionFailure(connection, error);
  };

  /**
   * Handles decoded incoming messages and resolves request promises or push listeners.
   * @param message Decoded incoming message.
   * @returns Void.
   */
  const handleIncomingMessage = (message: TypedMessage) => {
    if (message.type !== "pong") {
      log(2, "Socket", "blue", "Received:", message.type, message.data, {
        id: message.id,
      });
    }

    if (message.id !== 0) {
      const pendingRequest = pending.get(message.id);

      if (pendingRequest) {
        clearTimeout(pendingRequest.timeoutId);
        pending.delete(message.id);

        if (message.type.startsWith("error")) {
          pendingRequest.reject(message);
          return;
        }

        const schema = schemas[pendingRequest.requestType];
        if (!schema) {
          pendingRequest.resolve(message);
          return;
        }

        const result = schema.response.safeParse(message.data);
        if (result.success) {
          pendingRequest.resolve({
            ...message,
            data: result.data as Record<string, unknown>,
          });
          return;
        }

        log(
          0,
          "Socket",
          "red",
          `Response validation failed for "${message.type}"`,
          result.error,
          message.data,
        );
        pendingRequest.reject(
          new Error(
            `Response validation failed for "${message.type}": ${result.error.message}`,
          ),
        );
        return;
      }
    }

    const schema = schemas[message.type];
    if (schema) {
      const result = schema.response.safeParse(message.data);
      if (!result.success) {
        log(
          0,
          "Socket",
          "red",
          `Push-event validation failed for "${message.type}"`,
          result.error,
          message.data,
        );
        return;
      }

      message = {
        ...message,
        data: result.data as Record<string, unknown>,
      };
    }

    for (const handler of pushHandlers) {
      handler(message);
    }
  };

  /**
   * Handles recoverable decode failures by rejecting only the affected request.
   * @param error Recoverable decode error details.
   * @returns Void.
   */
  const handleRecoverableDecodeFailure = (
    error: RecoverableMessageDecodeError,
  ) => {
    log(1, "Socket", "yellow", "Recoverable message decode failure", {
      id: error.messageId,
      type: error.messageType,
      error: error.message,
    });

    if (error.messageId === 0) {
      return;
    }

    const pendingRequest = pending.get(error.messageId);
    if (!pendingRequest) {
      return;
    }

    clearTimeout(pendingRequest.timeoutId);
    pending.delete(error.messageId);
    pendingRequest.reject(
      new Error(
        `Failed to decode response for "${pendingRequest.requestType}": ${formatUnknownError(error.cause)}`,
      ),
    );
  };

  /**
   * Starts the incoming stream loop for a newly-opened connection.
   * @param connection Active connection instance.
   * @returns Void.
   */
  const startIncomingLoop = (connection: ActiveConnection) => {
    connection.streamReader =
      connection.transport.incomingUnidirectionalStreams.getReader();

    void (async () => {
      try {
        while (currentConnection === connection && !connection.intentional) {
          const result = await connection.streamReader?.read();
          if (!result || result.done) {
            break;
          }

          const closedByPeer = await processIncomingStream(
            result.value,
            connection,
            handleIncomingMessage,
            handleRecoverableDecodeFailure,
            handleConnectionFailure,
          );

          if (closedByPeer) {
            return;
          }
        }

        if (!connection.intentional) {
          handleConnectionFailure(
            connection,
            new Error("Transport stream closed"),
          );
        }
      } catch (error) {
        log(0, "Socket", "red", "Incoming transport stream failed", error);
        handleConnectionFailure(connection, error);
      } finally {
        connection.streamReader?.releaseLock();
        connection.streamReader = null;
      }
    })();
  };

  /**
   * Awaits transport closed promise and forwards outcome to failure handling.
   * @param connection Active connection instance.
   * @returns Void.
   */
  const awaitClosed = (connection: ActiveConnection) => {
    void connection.transport.closed
      .then(() => {
        handleConnectionFailure(connection);
      })
      .catch((error) => {
        handleConnectionFailure(connection, error);
      });
  };

  /**
   * Opens a transport connection and starts incoming frame processing.
   * @param url Optional override transport URL.
   * @returns Promise that resolves when connection setup completes.
   */
  const connect = async (url = configuredUrl) => {
    if (!url) {
      throw new Error("Transport URL is not configured");
    }

    configuredUrl = url;

    if (currentConnection) {
      await close("reconnect");
    }

    const WebTransportCtor = getWebTransportCtor();
    const transport = new WebTransportCtor(url);
    const connection: ActiveConnection = {
      transport,
      streamReader: null,
      intentional: false,
      closeNotified: false,
    };

    currentConnection = connection;
    setReadyState(READY_STATE.CONNECTING);
    awaitClosed(connection);

    try {
      await transport.ready;

      if (currentConnection !== connection) {
        return;
      }

      log(1, "Socket", "green", "Connected");
      setReadyState(READY_STATE.OPEN);
      startIncomingLoop(connection);
    } catch (error) {
      log(0, "Socket", "red", "WebTransport connection failed", error);
      handleConnectionFailure(connection, error);
      throw error;
    }
  };

  /**
   * Closes the current transport connection and sends a close sentinel frame.
   * @param reason Close reason sent to transport.
   * @returns Promise that resolves once close handling completes.
   */
  const close = async (reason = APPLICATION_CLOSE_REASON) => {
    const connection = currentConnection;
    if (!connection) {
      setReadyState(READY_STATE.CLOSED);
      return;
    }

    connection.intentional = true;
    setReadyState(READY_STATE.CLOSING);

    rejectPending(new Error("Transport closed"));

    try {
      await writeCloseFrame(connection.transport);
    } catch (error) {
      log(1, "Socket", "yellow", "Failed to send close sentinel", error);
    }

    try {
      connection.streamReader?.cancel().catch(() => undefined);
    } catch {
      // Ignore reader cancellation failures during shutdown.
    }

    try {
      connection.transport.close({
        closeCode: APPLICATION_CLOSE_CODE,
        reason,
      });
    } catch {
      // Ignore close errors during shutdown.
    }

    try {
      await connection.transport.closed.catch(() => undefined);
    } finally {
      notifyClosed(connection);
    }
  };

  /**
   * Sends a typed protocol request over the current connection.
   * @param type Protocol message type.
   * @param input Optional request payload.
   * @param options Optional id and response behavior.
   * @returns Promise for response message or void when no response is expected.
   */
  const send: BoundSendFn<T> = ((
    type: string,
    input?: Record<string, unknown>,
    options?: SendOptions,
  ): Promise<unknown> => {
    if (!currentConnection || currentReadyState !== READY_STATE.OPEN) {
      return Promise.reject(new Error("Transport is not connected"));
    }

    const connection = currentConnection;

    try {
      const schema = schemas[type];
      let payload: Record<string, unknown>;

      if (schema) {
        const result = schema.request.safeParse(input ?? {});
        if (!result.success) {
          log(
            0,
            "Socket",
            "red",
            `Request validation failed for "${type}"`,
            result.error,
          );
          return Promise.reject(
            new Error(
              `Request validation failed for "${type}": ${result.error.message}`,
            ),
          );
        }

        payload = coercePayload(result.data);
      } else {
        payload = coercePayload(input ?? {});
      }

      if (!options?.id && !options?.noResponse) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        options = options ?? {};
        options.id = array[0];
      }

      if (type !== "ping") {
        log(2, "Socket", "purple", "Sent:", type, payload, { id: options.id });
      }

      const expectsResponse = !options?.noResponse;
      const requestId = resolveRequestId(
        options.id,
        expectsResponse,
        pending,
        () => {
          const current = nextRequestId;
          nextRequestId = current >= MAX_REQUEST_ID ? 1 : current + 1;
          return current;
        },
      );

      const messageBytes = encodeCommunicationMessage({
        id: requestId,
        type,
        data: payload,
      });

      if (!expectsResponse) {
        return writeMessage(connection.transport, messageBytes).catch(
          (error) => {
            closeFromStopSending(connection, error);
            throw error;
          },
        );
      }

      return new Promise<TypedMessage>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pending.delete(requestId);
          reject(
            new Error(
              `Request "${type}" timed out after ${RESPONSE_TIMEOUT}ms`,
            ),
          );
        }, RESPONSE_TIMEOUT);

        pending.set(requestId, {
          requestType: type,
          resolve,
          reject,
          timeoutId,
        });

        void writeMessage(connection.transport, messageBytes).catch((error) => {
          closeFromStopSending(connection, error);
          clearTimeout(timeoutId);
          pending.delete(requestId);
          reject(error);
        });
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }) as BoundSendFn<T>;

  return {
    connect,
    close,
    send,
    readyState: () => currentReadyState,
    subscribePush(handler: PushHandler) {
      pushHandlers.add(handler);
      return () => {
        pushHandlers.delete(handler);
      };
    },
  };
}

/**
 * Builds a normalized lookup map for protocol names by index.
 * @param values Ordered protocol names.
 * @returns Map from normalized name to array index.
 */
function createIndexMap(values: readonly string[]) {
  const map = new Map<string, number>();

  values.forEach((value, index) => {
    map.set(normalizeName(value), index);
  });

  return map;
}

/**
 * Registers expected data kinds for protocol data type names.
 * @param kind Expected scalar or array kind for the provided names.
 * @param names Data type names to register.
 * @returns Void.
 */
function registerDataKinds(kind: DataKind, names: readonly string[]) {
  for (const name of names) {
    if (dataKindByType.has(name)) {
      throw new Error(`Duplicate data kind registration for "${name}"`);
    }

    dataKindByType.set(name, kind);
  }
}

/**
 * Returns the WebTransport constructor from the current runtime.
 * @returns WebTransport constructor.
 */
function getWebTransportCtor() {
  const ctor = (globalThis as WebTransportGlobal).WebTransport;
  if (!ctor) {
    throw new Error("WebTransport is not available in this environment");
  }

  return ctor;
}

/**
 * Normalizes protocol names by lowercasing and removing underscores.
 * @param value Raw protocol name.
 * @returns Normalized protocol key.
 */
function normalizeName(value: string) {
  return value.toLowerCase().replaceAll("_", "");
}

/**
 * Formats unknown errors into a stable log string.
 * @param error Unknown error value.
 * @returns Human-readable error description.
 */
function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Returns whether raw transport binary logging is enabled in local storage.
 * @returns True when binary transport logs should be emitted.
 */
function isBinaryMessageLoggingEnabled() {
  try {
    return localStorage.getItem(BINARY_LOG_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Logs raw transport bytes when binary logging is enabled.
 * @param direction Message direction label.
 * @param payload Raw binary payload to log.
 * @returns Void.
 */
function logBinaryMessage(
  direction: "Incoming" | "Outgoing",
  payload: Uint8Array,
) {
  if (!isBinaryMessageLoggingEnabled()) {
    return;
  }

  console.log(
    `[Socket] ${direction} binary message (${payload.byteLength} bytes)`,
    payload,
  );
}

/**
 * Detects whether an error chain includes STOP_SENDING.
 * @param error Unknown transport error.
 * @returns True when STOP_SENDING appears in the error chain.
 */
function isStopSendingError(error: unknown) {
  if (typeof error === "string") {
    return error.includes("STOP_SENDING");
  }

  if (error instanceof Error) {
    if (error.message.includes("STOP_SENDING")) {
      return true;
    }

    const errorWithCause = error as Error & { cause?: unknown };
    if (errorWithCause.cause !== undefined) {
      return isStopSendingError(errorWithCause.cause);
    }

    return false;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      return maybeMessage.includes("STOP_SENDING");
    }
  }

  return false;
}

/**
 * Ensures outbound message payloads are plain object records.
 * @param value Candidate payload.
 * @returns Payload as plain object record.
 */
function coercePayload(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error("Protocol payload must be a plain object");
  }

  return value;
}

/**
 * Checks whether a value is a non-null, non-array object.
 * @param value Candidate value.
 * @returns True when the value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolves a unique request id for transport messages.
 * @param requestedId Optional caller-provided request id.
 * @param expectsResponse Whether the request expects a response.
 * @param pending Map of currently pending requests.
 * @param nextId Function that returns the next candidate id.
 * @returns A request id valid for the current pending set.
 */
function resolveRequestId(
  requestedId: number | undefined,
  expectsResponse: boolean,
  pending: Map<number, PendingRequest>,
  nextId: () => number,
) {
  if (requestedId !== undefined) {
    validateRequestId(requestedId, expectsResponse);
    if (expectsResponse && pending.has(requestedId)) {
      throw new Error(`Request id ${requestedId} is already pending`);
    }

    return requestedId;
  }

  if (!expectsResponse) {
    return 0;
  }

  let attempts = 0;
  let candidate = nextId();

  while (candidate === 0 || pending.has(candidate)) {
    candidate = nextId();
    attempts += 1;

    if (attempts > MAX_REQUEST_ID) {
      throw new Error("Unable to allocate a free request id");
    }
  }

  return candidate;
}

/**
 * Validates request id bounds and response semantics.
 * @param id Request id to validate.
 * @param expectsResponse Whether a response is expected for this request.
 * @returns Void.
 */
function validateRequestId(id: number, expectsResponse: boolean) {
  if (!Number.isInteger(id) || id < 0 || id > MAX_REQUEST_ID) {
    throw new Error(`Request id must be a u32 between 0 and ${MAX_REQUEST_ID}`);
  }

  if (expectsResponse && id === 0) {
    throw new Error("Request id 0 cannot be used when a response is expected");
  }
}

/**
 * Writes a protocol message payload as a framed unidirectional transport stream.
 * @param transport Active transport instance.
 * @param payload Encoded message payload bytes.
 * @returns Promise that resolves when frame writing is complete.
 */
async function writeMessage(transport: WebTransportLike, payload: Uint8Array) {
  if (payload.byteLength >= CLOSE_FRAME_LEN) {
    throw new Error("Message too large for transport frame");
  }

  const stream = await transport.createUnidirectionalStream();
  const writer = stream.getWriter();

  try {
    const frame = new Uint8Array(4 + payload.byteLength);
    writeU32(frame, 0, payload.byteLength);
    frame.set(payload, 4);

    logBinaryMessage("Outgoing", frame);

    await writer.write(frame);
    await writer.close();
  } finally {
    writer.releaseLock();
  }
}

/**
 * Writes a close sentinel frame to the transport.
 * @param transport Active transport instance.
 * @returns Promise that resolves when the close frame is written.
 */
async function writeCloseFrame(transport: WebTransportLike) {
  const stream = await transport.createUnidirectionalStream();
  const writer = stream.getWriter();

  try {
    const frame = new Uint8Array(4);
    writeU32(frame, 0, CLOSE_FRAME_LEN);
    await writer.write(frame);
    await writer.close();
  } finally {
    writer.releaseLock();
  }
}

/**
 * Reads a byte stream and emits each framed protocol message it contains.
 * @param stream Incoming byte stream for a single unidirectional transport stream.
 * @param connection Active connection instance.
 * @param handleIncomingFrame Handler for decoded protocol messages.
 * @param handleDecodeFailure Handler for recoverable frame decode failures.
 * @returns True when the peer close sentinel was received.
 */
async function processIncomingStream(
  stream: ReadableStream<Uint8Array>,
  connection: ActiveConnection,
  handleIncomingFrame: (message: TypedMessage) => void,
  handleDecodeFailure: (error: RecoverableMessageDecodeError) => void,
  handleStreamFailure: (connection: ActiveConnection, error?: unknown) => void,
) {
  const reader = stream.getReader();
  let bufferedBytes = new Uint8Array(0) as Uint8Array<ArrayBufferLike>;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      bufferedBytes = appendBytes(bufferedBytes, value);

      while (bufferedBytes.byteLength >= 4) {
        const declaredLength = readU32(bufferedBytes, 0);

        if (declaredLength === CLOSE_FRAME_LEN) {
          try {
            connection.transport.close({
              closeCode: APPLICATION_CLOSE_CODE,
              reason: APPLICATION_CLOSE_REASON,
            });
          } catch {
            // Ignore close errors during peer shutdown.
          }

          handleStreamFailure(
            connection,
            new Error("Transport closed by peer"),
          );
          return true;
        }

        const expectedLength = 4 + declaredLength;
        if (bufferedBytes.byteLength < expectedLength) {
          break;
        }

        const frameBytes = bufferedBytes.subarray(0, expectedLength);
        bufferedBytes = bufferedBytes.subarray(expectedLength);

        logBinaryMessage("Incoming", frameBytes);

        try {
          handleIncomingFrame(decodeCommunicationMessage(frameBytes));
        } catch (error) {
          if (error instanceof RecoverableMessageDecodeError) {
            handleDecodeFailure(error);
            continue;
          }

          throw error;
        }
      }
    }

    if (bufferedBytes.byteLength > 0) {
      throw new Error("Received truncated transport frame");
    }

    return false;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Concatenates two byte arrays.
 * @param left Existing buffered bytes.
 * @param right Newly received bytes.
 * @returns Concatenated bytes.
 */
function appendBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength === 0) {
    return right;
  }

  const buffer = new Uint8Array(
    left.byteLength + right.byteLength,
  ) as Uint8Array<ArrayBufferLike>;
  buffer.set(left, 0);
  buffer.set(right, left.byteLength);
  return buffer;
}

/**
 * Encodes a typed protocol message into the wire communication format.
 * @param message Typed message with id, type, and payload data.
 * @returns Encoded communication frame bytes.
 */
export function encodeCommunicationMessage(
  message: TypedMessage<Record<string, unknown>>,
) {
  const typeIndex = parseCommunicationType(message.type);
  const hasId = message.id !== 0;
  const dataBuffer = encodeContainerPayload(message.data, "payload");
  const payloadLength = 2 + (hasId ? 4 : 0) + dataBuffer.byteLength;
  const buffer = new Uint8Array(4 + payloadLength);

  writeU32(buffer, 0, payloadLength);
  buffer[4] = typeIndex;
  buffer[5] = hasId ? 0b0000_0100 : 0;

  let offset = 6;
  if (hasId) {
    writeU32(buffer, offset, message.id);
    offset += 4;
  }

  buffer.set(dataBuffer, offset);

  return buffer;
}

/**
 * Decodes communication frame bytes into a typed protocol message.
 * @param frame Encoded communication frame bytes.
 * @returns Decoded typed protocol message.
 */
export function decodeCommunicationMessage(frame: Uint8Array): TypedMessage {
  const reader = new ByteReader(frame);
  const frameLength = reader.readU32();
  if (frameLength !== frame.byteLength - 4) {
    throw new Error(
      `Communication frame length mismatch: expected ${frameLength}, received ${frame.byteLength - 4}`,
    );
  }

  const payloadLength = reader.readU32();
  if (payloadLength !== frameLength - 4) {
    throw new Error(
      `Communication payload length mismatch: expected ${payloadLength}, received ${frameLength - 4}`,
    );
  }

  const typeIndex = reader.readU8();
  const flags = reader.readU8();
  const hasSender = (flags & 0b0000_0001) !== 0;
  const hasReceiver = (flags & 0b0000_0010) !== 0;
  const hasId = (flags & 0b0000_0100) !== 0;

  const id = hasId ? reader.readU32() : 0;
  if (hasSender) {
    reader.readU48();
  }
  if (hasReceiver) {
    reader.readU48();
  }

  const consumedHeaderBytes =
    2 + (hasId ? 4 : 0) + (hasSender ? 6 : 0) + (hasReceiver ? 6 : 0);
  if (consumedHeaderBytes > payloadLength) {
    throw new Error("Communication header exceeds payload length");
  }

  const messageType = COMMUNICATION_TYPES[typeIndex] ?? "error_protocol";

  const dataLength = payloadLength - consumedHeaderBytes;
  let decodedData: Record<string, unknown>;

  if (dataLength === 0) {
    decodedData = {};
  } else {
    const dataReader = new ByteReader(reader.readBytes(dataLength));

    try {
      decodedData = decodeContainerPayload(dataReader);
    } catch (error) {
      if (messageType.startsWith("error")) {
        return {
          id,
          type: messageType,
          data: {},
        };
      } else {
        throw new RecoverableMessageDecodeError(id, messageType, error);
      }
    }

    if (!dataReader.isAtEnd()) {
      throw new RecoverableMessageDecodeError(
        id,
        messageType,
        new Error("Trailing bytes found after communication data payload"),
      );
    }
  }

  if (!reader.isAtEnd()) {
    throw new Error("Trailing bytes found after communication payload");
  }

  return {
    id,
    type: messageType,
    data: decodedData,
  };
}

/**
 * Resolves a communication type string to its protocol index.
 * @param type Protocol message type string.
 * @returns Numeric protocol type index.
 */
function parseCommunicationType(type: string) {
  const index = COMMUNICATION_TYPE_BY_NAME.get(normalizeName(type));
  if (index === undefined) {
    throw new Error(`Unknown communication type "${type}"`);
  }

  return index;
}

/**
 * Parses a protocol data key into its index and canonical name.
 * @param type Raw protocol data key.
 * @returns Canonical data key metadata with index and normalized name.
 */
function parseDataType(type: string) {
  const index = DATA_TYPE_BY_NAME.get(normalizeName(type));
  if (index === undefined) {
    throw new Error(`Unknown data type "${type}"`);
  }

  return {
    index,
    name: DATA_TYPES[index],
  };
}

/**
 * Returns the expected value kind for a protocol data key.
 * @param type Canonical data key name.
 * @returns Expected data kind definition.
 */
function getExpectedKind(type: string) {
  const kind = dataKindByType.get(type);
  if (!kind) {
    throw new Error(`No data kind registered for "${type}"`);
  }

  return kind;
}

type EncodedDataValue = {
  kind: number;
  payload: Uint8Array;
};

/**
 * Encodes a value according to the expected protocol kind.
 * @param kind Expected protocol kind.
 * @param value Candidate value to encode.
 * @param path Payload path used in validation errors.
 * @returns Encoded value marker and payload bytes.
 */
function encodeDataValueForKind(
  kind: DataKind,
  value: unknown,
  path: string,
): EncodedDataValue {
  if (typeof kind === "object") {
    return {
      kind: DATA_VALUE_KIND_ARRAY,
      payload: encodeArrayPayload(kind.array, value, path),
    };
  }

  switch (kind) {
    case "bool":
      if (typeof value !== "boolean") {
        throw new Error(`Expected boolean at "${path}"`);
      }

      return {
        kind: value ? DATA_VALUE_KIND_BOOL_TRUE : DATA_VALUE_KIND_BOOL_FALSE,
        payload: new Uint8Array(0),
      };

    case "number":
      return {
        kind: DATA_VALUE_KIND_NUMBER,
        payload: encodeNumberPayload(value, path),
      };

    case "string":
      if (typeof value !== "string") {
        throw new Error(`Expected string at "${path}"`);
      }

      return {
        kind: DATA_VALUE_KIND_STRING,
        payload: textEncoder.encode(value),
      };

    case "container":
      if (!isPlainObject(value)) {
        throw new Error(`Expected object at "${path}"`);
      }

      return {
        kind: DATA_VALUE_KIND_CONTAINER,
        payload: encodeContainerPayload(value, path),
      };

    case "null":
      if (value !== null && value !== undefined) {
        throw new Error(`Expected null at "${path}"`);
      }

      return {
        kind: DATA_VALUE_KIND_NULL,
        payload: new Uint8Array(0),
      };
  }
}

/**
 * Encodes a numeric payload as signed 64-bit big-endian bytes.
 * @param value Value expected to be a safe integer number.
 * @param path Payload path used in validation errors.
 * @returns Encoded i64 byte array.
 */
function encodeNumberPayload(value: unknown, path: string) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value)
  ) {
    throw new Error(`Expected safe integer at "${path}"`);
  }

  const buffer = new Uint8Array(8);
  writeI64(buffer, 0, value);
  return buffer;
}

/**
 * Encodes an array payload where each item is tagged with a data marker.
 * @param innerKind Expected kind for array entries.
 * @param value Candidate array payload.
 * @param path Payload path used in validation errors.
 * @returns Encoded array payload bytes.
 */
function encodeArrayPayload(
  innerKind: PrimitiveDataKind | "container" | "null",
  value: unknown,
  path: string,
) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected array at "${path}"`);
  }

  if (value.length > 0xffff) {
    throw new Error(`Array at "${path}" is too large for protocol encoding`);
  }

  const encodedItems = value.map((entry, index) =>
    encodeDataValueForKind(innerKind, entry, `${path}[${index}]`),
  );

  let totalLength = 2;
  for (const encodedItem of encodedItems) {
    totalLength += 1;

    if (!isBoolKindMarker(encodedItem.kind)) {
      if (encodedItem.payload.byteLength > 0xffff) {
        throw new Error(
          `Array item at "${path}" is too large for protocol encoding`,
        );
      }

      totalLength += 2 + encodedItem.payload.byteLength;
    }
  }

  const buffer = new Uint8Array(totalLength);
  writeU16(buffer, 0, value.length);

  let offset = 2;
  for (const item of encodedItems) {
    buffer[offset] = item.kind;
    offset += 1;

    if (isBoolKindMarker(item.kind)) {
      continue;
    }

    writeU16(buffer, offset, item.payload.byteLength);
    offset += 2;
    buffer.set(item.payload, offset);
    offset += item.payload.byteLength;
  }

  return buffer;
}

/**
 * Encodes a keyed container payload into protocol key-index/value entries.
 * @param value Object payload to encode.
 * @param path Payload path used in validation errors.
 * @returns Encoded container payload bytes.
 */
function encodeContainerPayload(value: Record<string, unknown>, path: string) {
  const normalizedEntries = new Map<
    string,
    { index: number; value: unknown }
  >();

  for (const [rawKey, rawValue] of Object.entries(value)) {
    const parsedType = parseDataType(rawKey);
    normalizedEntries.set(parsedType.name, {
      index: parsedType.index,
      value: normalizeOutgoingValue(parsedType.name, rawValue),
    });
  }

  const entries = [...normalizedEntries.entries()].sort(
    ([, left], [, right]) => left.index - right.index,
  );

  if (entries.length > 0xffff) {
    throw new Error(
      `Container at "${path}" has too many entries for protocol encoding`,
    );
  }

  const encodedEntries: Array<{ keyIndex: number; value: EncodedDataValue }> =
    [];
  let totalLength = 2;

  for (const [name, entry] of entries) {
    const expectedKind = getExpectedKind(name);
    const pathForEntry = `${path}.${name}`;

    const encodedValue = encodeDataValueForKind(
      expectedKind,
      entry.value,
      pathForEntry,
    );

    if (isBoolKindMarker(encodedValue.kind)) {
      totalLength += 2;
    } else {
      if (encodedValue.payload.byteLength > 0xffff) {
        throw new Error(
          `Container entry "${pathForEntry}" is too large for protocol encoding`,
        );
      }

      totalLength += 4 + encodedValue.payload.byteLength;
    }

    encodedEntries.push({
      keyIndex: entry.index,
      value: encodedValue,
    });
  }

  const buffer = new Uint8Array(totalLength);
  writeU16(buffer, 0, entries.length);

  let offset = 2;
  for (const entry of encodedEntries) {
    buffer[offset] = entry.value.kind;
    offset += 1;

    if (isBoolKindMarker(entry.value.kind)) {
      buffer[offset] = entry.keyIndex;
      offset += 1;
      continue;
    }

    writeU16(buffer, offset, entry.value.payload.byteLength);
    offset += 2;
    buffer[offset] = entry.keyIndex;
    offset += 1;
    buffer.set(entry.value.payload, offset);
    offset += entry.value.payload.byteLength;
  }

  return buffer;
}

/**
 * Decodes a value marker and payload bytes into a JavaScript value.
 * @param marker Protocol value marker.
 * @param payload Encoded payload bytes for the marker.
 * @returns Decoded JavaScript value.
 */
function decodeValuePayload(marker: number, payload: Uint8Array): unknown {
  const reader = new ByteReader(payload);

  switch (marker) {
    case DATA_VALUE_KIND_BOOL_TRUE:
      if (!reader.isAtEnd()) {
        throw new Error("Unexpected payload for boolean true value");
      }

      return true;

    case DATA_VALUE_KIND_BOOL_FALSE:
      if (!reader.isAtEnd()) {
        throw new Error("Unexpected payload for boolean false value");
      }

      return false;

    case DATA_VALUE_KIND_NUMBER:
      if (payload.byteLength !== 8) {
        throw new Error(`Invalid number payload length ${payload.byteLength}`);
      }

      return reader.readI64();

    case DATA_VALUE_KIND_STRING:
      return textDecoder.decode(payload);

    case DATA_VALUE_KIND_ARRAY:
      return decodeArrayPayload(reader);

    case DATA_VALUE_KIND_CONTAINER:
      return decodeContainerPayload(reader);

    case DATA_VALUE_KIND_NULL:
      if (!reader.isAtEnd()) {
        throw new Error("Unexpected payload for null value");
      }

      return null;

    default:
      throw new Error(`Unknown data value marker 0x${marker.toString(16)}`);
  }
}

/**
 * Decodes an encoded array payload from a byte reader.
 * @param reader Byte reader positioned at array payload start.
 * @returns Decoded array values.
 */
function decodeArrayPayload(reader: ByteReader) {
  const itemCount = reader.readU16();
  const values: unknown[] = [];

  for (let index = 0; index < itemCount; index += 1) {
    const marker = reader.readU8();

    if (isBoolKindMarker(marker)) {
      values.push(marker === DATA_VALUE_KIND_BOOL_TRUE);
      continue;
    }

    const payloadLength = reader.readU16();
    const payload = reader.readBytes(payloadLength);
    values.push(decodeValuePayload(marker, payload));
  }

  return values;
}

/**
 * Decodes an encoded keyed container payload from a byte reader.
 * @param reader Byte reader positioned at container payload start.
 * @returns Decoded object payload.
 */
function decodeContainerPayload(reader: ByteReader) {
  const entryCount = reader.readU16();
  const value: Record<string, unknown> = {};

  for (let index = 0; index < entryCount; index += 1) {
    const marker = reader.readU8();
    const payloadLength = isBoolKindMarker(marker) ? 0 : reader.readU16();
    const keyIndex = reader.readU8();
    const payload = isBoolKindMarker(marker)
      ? new Uint8Array(0)
      : reader.readBytes(payloadLength);

    const key = getDataTypeNameByIndex(keyIndex);
    if (!key) {
      continue;
    }

    const expectedKind = getExpectedKind(key);
    if (!isMarkerCompatibleWithKey(marker, expectedKind, key)) {
      throw new Error(
        `Unexpected marker 0x${marker.toString(16)} for data type "${key}"`,
      );
    }

    value[key] = normalizeIncomingValue(
      key,
      decodeValuePayload(marker, payload),
    );
  }

  return value;
}

/**
 * Resolves a canonical data key by protocol index.
 * @param index Protocol key index.
 * @returns Canonical protocol data key name.
 */
function getDataTypeNameByIndex(index: number) {
  return DATA_TYPES[index];
}

/**
 * Checks whether a marker represents a boolean payload.
 * @param marker Protocol value marker.
 * @returns True when marker is boolean true or false.
 */
function isBoolKindMarker(marker: number) {
  return (
    marker === DATA_VALUE_KIND_BOOL_TRUE ||
    marker === DATA_VALUE_KIND_BOOL_FALSE
  );
}

/**
 * Validates that a marker is compatible with an expected data kind.
 * @param marker Protocol value marker.
 * @param kind Expected protocol data kind.
 * @returns True when marker matches the expected kind.
 */
function isMarkerCompatibleWithKind(marker: number, kind: DataKind) {
  if (typeof kind === "object") {
    return marker === DATA_VALUE_KIND_ARRAY;
  }

  switch (kind) {
    case "bool":
      return isBoolKindMarker(marker);
    case "number":
      return marker === DATA_VALUE_KIND_NUMBER;
    case "string":
      return marker === DATA_VALUE_KIND_STRING;
    case "container":
      return marker === DATA_VALUE_KIND_CONTAINER;
    case "null":
      return marker === DATA_VALUE_KIND_NULL;
  }
}

/**
 * Validates marker compatibility for a specific key with scalar-array fallback support.
 * @param marker Protocol value marker.
 * @param kind Expected protocol data kind.
 * @param key Canonical protocol key name.
 * @returns True when marker is compatible for the key.
 */
function isMarkerCompatibleWithKey(
  marker: number,
  kind: DataKind,
  key: string,
) {
  if (
    SCALAR_NUMBER_ARRAY_DATA_TYPES.has(key) &&
    marker === DATA_VALUE_KIND_NUMBER
  ) {
    return true;
  }

  return isMarkerCompatibleWithKind(marker, kind);
}

/**
 * Normalizes outbound values for special scalar-array compatibility keys.
 * @param type Canonical protocol key name.
 * @param value Outbound value.
 * @returns Normalized outbound value.
 */
function normalizeOutgoingValue(type: string, value: unknown) {
  if (SCALAR_NUMBER_ARRAY_DATA_TYPES.has(type) && typeof value === "number") {
    return [value];
  }

  return value;
}

/**
 * Normalizes inbound values for scalar-array compatibility keys.
 * @param type Canonical protocol key name.
 * @param value Inbound decoded value.
 * @returns Normalized inbound value.
 */
function normalizeIncomingValue(type: string, value: unknown) {
  if (
    SCALAR_NUMBER_ARRAY_DATA_TYPES.has(type) &&
    Array.isArray(value) &&
    value.length === 1 &&
    typeof value[0] === "number"
  ) {
    return value[0];
  }

  return value;
}

/**
 * Writes a big-endian unsigned 16-bit integer to a byte buffer.
 * @param buffer Destination byte buffer.
 * @param offset Byte offset to write at.
 * @param value Unsigned 16-bit integer value.
 * @returns Void.
 */
function writeU16(buffer: Uint8Array, offset: number, value: number) {
  new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).setUint16(
    offset,
    value,
    false,
  );
}

/**
 * Writes a big-endian unsigned 32-bit integer to a byte buffer.
 * @param buffer Destination byte buffer.
 * @param offset Byte offset to write at.
 * @param value Unsigned 32-bit integer value.
 * @returns Void.
 */
function writeU32(buffer: Uint8Array, offset: number, value: number) {
  new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).setUint32(
    offset,
    value,
    false,
  );
}

/**
 * Writes a big-endian signed 64-bit integer to a byte buffer.
 * @param buffer Destination byte buffer.
 * @param offset Byte offset to write at.
 * @param value Signed integer value.
 * @returns Void.
 */
function writeI64(buffer: Uint8Array, offset: number, value: number) {
  new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).setBigInt64(
    offset,
    BigInt(value),
    false,
  );
}

/**
 * Reads a big-endian unsigned 32-bit integer from a byte buffer.
 * @param buffer Source byte buffer.
 * @param offset Byte offset to read from.
 * @returns Unsigned 32-bit integer value.
 */
function readU32(buffer: Uint8Array, offset: number) {
  return new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  ).getUint32(offset, false);
}

/**
 * Provides sequential big-endian reads over protocol byte buffers.
 */
class ByteReader {
  private readonly view: DataView;

  private offset = 0;

  private readonly bytes: Uint8Array;

  /**
   * Creates a byte reader over an immutable Uint8Array view.
   * @param bytes Source bytes to read from.
   */
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  /**
   * Reads one unsigned byte.
   * @returns Unsigned 8-bit integer.
   */
  readU8() {
    this.ensureAvailable(1);
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * Reads two bytes as big-endian unsigned 16-bit integer.
   * @returns Unsigned 16-bit integer.
   */
  readU16() {
    this.ensureAvailable(2);
    const value = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return value;
  }

  /**
   * Reads four bytes as big-endian unsigned 32-bit integer.
   * @returns Unsigned 32-bit integer.
   */
  readU32() {
    this.ensureAvailable(4);
    const value = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return value;
  }

  /**
   * Reads eight bytes as big-endian signed 64-bit integer.
   * @returns Safe integer representation of the decoded value.
   */
  readI64() {
    this.ensureAvailable(8);
    const value = this.view.getBigInt64(this.offset, false);
    this.offset += 8;

    const numberValue = Number(value);
    if (!Number.isSafeInteger(numberValue)) {
      throw new Error(
        `Decoded number ${value.toString()} exceeds JS safe integer range`,
      );
    }

    return numberValue;
  }

  /**
   * Reads six bytes as a big-endian unsigned 48-bit integer.
   * @returns Unsigned 48-bit integer represented as number.
   */
  readU48() {
    this.ensureAvailable(6);
    const upper = this.view.getUint16(this.offset, false);
    const lower = this.view.getUint32(this.offset + 2, false);
    this.offset += 6;
    return upper * 2 ** 32 + lower;
  }

  /**
   * Reads a byte slice of the requested length.
   * @param length Number of bytes to read.
   * @returns View over the requested bytes.
   */
  readBytes(length: number) {
    this.ensureAvailable(length);
    const value = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  /**
   * Indicates whether all bytes have been consumed.
   * @returns True when reader offset is at buffer end.
   */
  isAtEnd() {
    return this.offset === this.bytes.byteLength;
  }

  /**
   * Ensures that at least a specific number of bytes can still be read.
   * @param length Required available byte count.
   * @returns Void.
   */
  private ensureAvailable(length: number) {
    if (this.offset + length > this.bytes.byteLength) {
      throw new Error("Unexpected end of protocol buffer");
    }
  }
}
