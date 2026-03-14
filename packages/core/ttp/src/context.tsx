import * as React from "react";
import { log } from "@tensamin/shared/log";
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

type ContextType = {
  send: BoundSendFn<Schemas>;
  readyState: () => number;
  ownPing: () => number;
  iotaPing: () => number;
};

const socketContext = React.createContext<ContextType | undefined>(undefined);

export default function Provider(props: { children: React.ReactNode }) {
  const [readyState, setReadyState] = React.useState<number>(READY_STATE.CLOSED);
  const [connected, setConnected] = React.useState<boolean>(false);

  const [ownPing, setOwnPing] = React.useState<number>(0);
  const [iotaPing, setIotaPing] = React.useState<number>(0);

  const [error, setError] = React.useState("");
  const [errorDescription, setErrorDescription] = React.useState("");

  const clientRef = React.useRef<ReturnType<
    typeof createTransportClient<Schemas>
  > | null>(null);

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
    if (!connected) {
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
  }, [connected, send]);

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
          setConnected(true);
          setError("");
          setErrorDescription("");
          log(1, "Socket", "green", "Connected");
          return;
        }

        setConnected(false);
      },
      onClose: ({ error: closeError, intentional }) => {
        setConnected(false);

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
    };
  }, []);

  const progress = React.useMemo(() => {
    if (readyState === READY_STATE.CONNECTING) return 70;
    if (!connected) return 90;
    return 100;
  }, [connected, readyState]);

  const contextValue = React.useMemo<ContextType>(
    () => ({
      send,
      readyState: () => readyState,
      ownPing: () => ownPing,
      iotaPing: () => iotaPing,
    }),
    [iotaPing, ownPing, readyState, send],
  );

  if (error !== "" && errorDescription !== "") {
    return <ErrorScreen error={error} description={errorDescription} />;
  }

  if (!connected) {
    return <Loading progress={progress} />;
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