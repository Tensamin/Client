import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { RawMessage, RawMessages } from "./values";
import { useCrypto } from "@tensamin/crypto/context";
import { useUser } from "@tensamin/user/context";
import { useStorage } from "@tensamin/storage/context";
import { useSocket } from "@tensamin/ttp/context";

export const context = React.createContext<contextType | undefined>(undefined);

const queryClient = new QueryClient();

export default function Provider(
  props: { children: React.ReactNode },
) {
  const { get_shared_secret } = useCrypto();
  const { get } = useUser();
  const { load } = useStorage();
  const { send } = useSocket();

  const [liveMessagesState, setLiveMessagesState] = React.useState<RawMessages>([]);
  const [currentSharedSecret, setCurrentSharedSecret] = React.useState("");

  const locationSearch = useRouterState({
    select: (state) => state.location.search,
  });

  const userIdValue = React.useMemo(() => {
    const rawId = (locationSearch as unknown as { id?: unknown })?.id;
    return Number(rawId ?? 0);
  }, [locationSearch]);

  React.useEffect(() => {
    const recipientId = userIdValue;

    if (!recipientId) {
      setCurrentSharedSecret("");
      return;
    }

    let active = true;

    void get(recipientId).then(async (recipientData) => {
      const ownId = await load("user_id");
      const privateKey = await load("private_key");
      const ownData = await get(ownId);
      const sharedSecret = await get_shared_secret(
        privateKey,
        ownData.public_key,
        recipientData.public_key,
      );

      if (active) {
        setCurrentSharedSecret(sharedSecret);
      }
    });

    return () => {
      active = false;
    };
  }, [get, get_shared_secret, load, userIdValue]);

  const customGetMessages = React.useCallback(
    async (amount: number, offset: number) => {
      const messages = await send("messages_get", {
        amount,
        offset,
        user_id: userIdValue,
      });

      if (messages.type.startsWith("error")) {
        throw new Error(messages.type);
      }

      const rawMessages = messages.data.messages;
      const sorted = [...rawMessages].sort((a, b) => a.timestamp - b.timestamp);
      return sorted;
    },
    [send, userIdValue],
  );

  const addLiveMessage = React.useCallback((message: RawMessage) => {
    setLiveMessagesState((prev) => [...prev, message]);
  }, []);

  const clearLiveMessages = React.useCallback(() => {
    setLiveMessagesState([]);
  }, []);

  const value = React.useMemo<contextType>(
    () => ({
      getMessages: customGetMessages,
      liveMessages: () => liveMessagesState,
      addLiveMessage,
      clearLiveMessages,
      sharedSecret: () => currentSharedSecret,
      userId: () => userIdValue,
    }),
    [addLiveMessage, clearLiveMessages, currentSharedSecret, customGetMessages, liveMessagesState, userIdValue],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <context.Provider value={value}>{props.children}</context.Provider>
    </QueryClientProvider>
  );
}

type contextType = {
  getMessages: (amount: number, offset: number) => Promise<RawMessages>;
  liveMessages: () => RawMessages;
  addLiveMessage: (message: RawMessage) => void;
  clearLiveMessages: () => void;
  sharedSecret: () => string;
  userId: () => number;
};

export function useChat(): contextType {
  const ctx = React.useContext(context);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}