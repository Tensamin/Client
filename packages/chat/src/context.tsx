import {
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import type { ParentProps } from "solid-js";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import type { RawMessage, RawMessages } from "./values";
import { useSearchParams } from "@solidjs/router";
import { useCrypto } from "@tensamin/core-crypto/context";
import { useUser } from "@tensamin/core-user/context";
import { useStorage } from "@tensamin/core-storage/context";

export const context = createContext<contextType>();

const queryClient = new QueryClient();

export default function Provider(
  props: ParentProps & {
    getMessages: (
      amount: number,
      offset: number,
      user_id: number,
    ) => Promise<RawMessages>;
  },
) {
  const { get_shared_secret } = useCrypto();
  const { get } = useUser();
  const { load } = useStorage();

  const [liveMessages, setLiveMessages] = createSignal<RawMessages>([]);
  const [currentSharedSecret, setCurrentSharedSecret] = createSignal("");

  const [searchParams] = useSearchParams();
  const userId = () => Number(searchParams.id ?? 0);

  createEffect(() => {
    const recipientId = userId();

    if (!recipientId) {
      setCurrentSharedSecret("");
      return;
    }

    get(recipientId).then(async (recipientData) => {
      const ownId = await load("user_id");
      const privateKey = await load("private_key");
      const ownData = await get(ownId);
      const sharedSecret = await get_shared_secret(
        privateKey,
        ownData.public_key,
        recipientData.public_key,
      );

      setCurrentSharedSecret(sharedSecret);
    });
  });

  async function customGetMessages(amount: number, offset: number) {
    const messages = await props.getMessages(amount, offset, userId());
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

    return sorted;
  }

  function addLiveMessage(message: RawMessage) {
    setLiveMessages((prev) => [...prev, message]);
  }

  function clearLiveMessages() {
    setLiveMessages([]);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <context.Provider
        value={{
          getMessages: customGetMessages,
          liveMessages,
          addLiveMessage,
          clearLiveMessages,
          sharedSecret: currentSharedSecret,
          userId,
        }}
      >
        {props.children}
      </context.Provider>
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
  const ctx = useContext(context);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}
