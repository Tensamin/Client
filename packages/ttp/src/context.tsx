import * as React from "react";
import { useCrypto } from "@tensamin/crypto/context";
import { log } from "@tensamin/shared/log";
import { useStorage } from "@tensamin/storage/context";
import { createTransportClient, READY_STATE, type BoundSendFn } from "./core";
import {
  PING_INTERVAL,
  RETRY_COUNT,
  RETRY_INTERVAL,
  TRANSPORT_URL,
} from "./values";
import {
  socket as schemas,
  type Socket as Schemas,
} from "@tensamin/shared/data";
import Loading from "@tensamin/ui/screens/loading";
import ErrorScreen from "@tensamin/ui/screens/error";

const FATAL_IDENTIFICATION_ERROR_TYPES = new Set([
  "error_invalid_user_id",
  "error_no_user_id",
  "error_invalid_challenge",
  "error_invalid_secret",
  "error_invalid_private_key",
  "error_invalid_public_key",
  "error_not_authenticated",
]);

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

function isFatalIdentificationError(error: unknown) {
  if (typeof error === "object" && error !== null && "type" in error) {
    const type = (error as { type?: unknown }).type;
    if (
      typeof type === "string" &&
      FATAL_IDENTIFICATION_ERROR_TYPES.has(type)
    ) {
      return true;
    }
  }

  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.message.includes("Missing or invalid user id") ||
    error.message.includes("Missing private key") ||
    error.message.includes("Identification challenge was rejected")
  ) {
    return true;
  }

  return false;
}

type ContextType = {
  send: BoundSendFn<Schemas>;
  readyState: () => number;
  ownPing: () => number;
  iotaPing: () => number;
  identified: () => boolean;
};

const socketContext = React.createContext<ContextType | undefined>(undefined);

export default function Provider(props: { children: React.ReactNode }) {
  const { load } = useStorage();
  const { decrypt, get_shared_secret } = useCrypto();

  const [readyState, setReadyState] = React.useState<number>(
    READY_STATE.CLOSED,
  );
  const [connected, setConnected] = React.useState<boolean>(false);
  const [identified, setIdentified] = React.useState<boolean>(false);
  const [identifying, setIdentifying] = React.useState<boolean>(false);

  const [ownPing, setOwnPing] = React.useState<number>(0);
  const [iotaPing, setIotaPing] = React.useState<number>(0);

  const [error, setError] = React.useState("");
  const [errorDescription, setErrorDescription] = React.useState("");

  const clientRef = React.useRef<ReturnType<
    typeof createTransportClient<Schemas>
  > | null>(null);
  const identificationStartedRef = React.useRef(false);

  const send = React.useCallback<BoundSendFn<Schemas>>(
    ((
      type: string,
      data?: Record<string, unknown>,
      options?: { id?: number; noResponse?: boolean },
    ) => {
      const client = clientRef.current;

      if (!client) {
        return Promise.reject(new Error("Socket is not connected"));
      }

      if (options?.noResponse) {
        return client.send(type as keyof Schemas & string, data as never, {
          ...options,
          noResponse: true,
        });
      }

      return client.send(type as keyof Schemas & string, data as never, {
        ...options,
        noResponse: false,
      });
    }) as BoundSendFn<Schemas>,
    [],
  );

  React.useEffect(() => {
    if (!connected || !identified) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const originalNow = Date.now();

        const data = await send("ping", {
          last_ping: originalNow,
        });

        const travelTime = Date.now() - originalNow;
        setOwnPing(travelTime);

        const remotePing = data.data.ping_iota;
        if (typeof remotePing === "number") {
          setIotaPing(remotePing);
        }
      } catch (intervalError) {
        log(1, "Socket", "yellow", "Ping failed", intervalError);
      }
    }, PING_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [connected, identified, send]);

  React.useEffect(() => {
    let attempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectScheduled = false;
    let disposed = false;

    const clearReconnectTimer = () => {
      if (!reconnectTimer) {
        return;
      }

      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectScheduled = false;
    };

    const scheduleReconnect = (reason?: unknown) => {
      if (disposed || reconnectScheduled) {
        return;
      }

      if (attempts >= RETRY_COUNT) {
        setError("Connection Failed");
        setErrorDescription(
          "Unable to connect to the server after multiple attempts. Please check your internet connection or try again later.",
        );
        log(0, "Socket", "red", "Reconnection attempts exhausted", reason);
        return;
      }

      attempts += 1;
      reconnectScheduled = true;
      reconnectTimer = setTimeout(() => {
        reconnectScheduled = false;
        reconnectTimer = null;
        void connect();
      }, RETRY_INTERVAL);
    };

    const transportClient = createTransportClient(schemas, {
      url: TRANSPORT_URL,
      onReadyStateChange: (state) => {
        setReadyState(state);

        if (state === READY_STATE.OPEN) {
          attempts = 0;
          clearReconnectTimer();
          identificationStartedRef.current = false;
          setConnected(true);
          setIdentified(false);
          setError("");
          setErrorDescription("");
          return;
        }

        identificationStartedRef.current = false;
        setConnected(false);
        setIdentified(false);
      },
      onClose: ({ error: closeError, intentional }) => {
        if (isStopSendingError(closeError)) {
          clearReconnectTimer();
          setConnected(false);
          setIdentified(false);
          setIdentifying(false);
          setError("Connection closed");
          setErrorDescription(
            "The connection was forcefully closed by the Omikron.",
          );
          log(0, "Socket", "red", "Connection closed", closeError);
          return;
        }

        setConnected(false);
        setIdentified(false);

        if (disposed || intentional) {
          return;
        }

        log(0, "Socket", "red", "Disconnected", closeError);
        scheduleReconnect(closeError);
      },
    });

    clientRef.current = transportClient;

    async function connect() {
      if (disposed) {
        return;
      }

      try {
        await transportClient.connect(TRANSPORT_URL);
      } catch (connectError) {
        if (disposed) {
          return;
        }

        if (isStopSendingError(connectError)) {
          clearReconnectTimer();
          setError("Connection closed");
          setErrorDescription("Connection closed");
          return;
        }

        log(0, "Socket", "red", "Connection attempt failed", connectError);
        scheduleReconnect(connectError);
      }
    }

    void connect();

    return () => {
      disposed = true;
      clearReconnectTimer();

      if (clientRef.current === transportClient) {
        clientRef.current = null;
      }

      void transportClient.close("context-dispose");
      setReadyState(READY_STATE.CLOSED);
      setConnected(false);
      setIdentified(false);
      setIdentifying(false);
      identificationStartedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!connected) {
      setIdentifying(false);
      setIdentified(false);
      identificationStartedRef.current = false;
      return;
    }

    if (identificationStartedRef.current) {
      return;
    }

    identificationStartedRef.current = true;
    let cancelled = false;
    setIdentifying(true);
    setIdentified(false);

    const identify = async () => {
      try {
        const userId = await load("user_id");
        const privateKey = await load("private_key");

        if (!Number.isSafeInteger(userId) || userId <= 0) {
          throw new Error("Missing or invalid user id for identification");
        }

        if (privateKey.trim() === "") {
          throw new Error("Missing private key for identification");
        }

        const challengeEnvelope = await send("identification", {
          user_id: userId,
        });

        const sharedSecret = await get_shared_secret(
          privateKey,
          "",
          challengeEnvelope.data.public_key,
        );

        const decryptedChallenge = await decrypt(
          sharedSecret,
          challengeEnvelope.data.challenge,
        );

        const verification = await send("challenge_response", {
          challenge: decryptedChallenge,
        });

        if (verification.data.accepted !== true) {
          throw new Error("Identification challenge was rejected");
        }

        if (cancelled) {
          return;
        }

        setError("");
        setErrorDescription("");
        setIdentified(true);
      } catch (identificationError) {
        if (cancelled) {
          return;
        }

        if (isStopSendingError(identificationError)) {
          setError("Connection closed");
          setErrorDescription("Connection closed");
          setIdentified(false);
          return;
        }

        const isFatal = isFatalIdentificationError(identificationError);

        log(
          isFatal ? 0 : 1,
          "Socket",
          isFatal ? "red" : "yellow",
          "Identification handshake failed",
          identificationError,
        );

        setIdentified(false);

        setError("Identification Failed");
        setErrorDescription(
          isFatal
            ? "Unable to complete secure identification. Please verify your credentials and try again."
            : "Unable to complete secure identification because the transport request failed.",
        );
      } finally {
        if (!cancelled) {
          setIdentifying(false);
        }
      }
    };

    void identify();

    return () => {
      cancelled = true;
    };
  }, [connected, decrypt, get_shared_secret, load, send]);

  const progress = React.useMemo(() => {
    if (readyState === READY_STATE.CONNECTING) return 30;
    if (!connected) return 45;
    if (identifying) return 75;
    if (!identified) return 90;
    return 100;
  }, [connected, identified, identifying, readyState]);

  const loadingTitle = React.useMemo(() => {
    if (readyState === READY_STATE.CONNECTING || !connected) {
      return "Connecting to Tensamin";
    }

    if (identifying || !identified) {
      return "Identifying secure session";
    }

    return "Loading";
  }, [connected, identified, identifying, readyState]);

  const loadingDescription = React.useMemo(() => {
    if (readyState === READY_STATE.CONNECTING || !connected) {
      return "Establishing transport channel";
    }

    if (identifying || !identified) {
      return "Verifying challenge-response handshake";
    }

    return undefined;
  }, [connected, identified, identifying, readyState]);

  const contextValue = React.useMemo<ContextType>(
    () => ({
      send,
      readyState: () => readyState,
      ownPing: () => ownPing,
      iotaPing: () => iotaPing,
      identified: () => identified,
    }),
    [identified, iotaPing, ownPing, readyState, send],
  );

  if (error !== "" && errorDescription !== "") {
    return <ErrorScreen error={error} description={errorDescription} />;
  }

  if (!connected || !identified) {
    return (
      <Loading
        progress={progress}
        title={loadingTitle}
        description={loadingDescription}
        fullscreen
      />
    );
  }

  return (
    <socketContext.Provider value={contextValue}>
      {props.children}
    </socketContext.Provider>
  );
}

export function useSocket(): ContextType {
  const context = React.useContext(socketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
