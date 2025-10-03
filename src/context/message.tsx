"use client";

// Package Imports
import { createContext, useContext, useState } from "react";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { usePageContext } from "@/context/page";
import { useUserContext } from "@/context/user";
import { useCryptoContext } from "@/context/crypto";

// Types
import { AdvancedSuccessMessage, File, Message, Messages } from "@/lib/types";

// Main
type MessageContextType = {
  getMessages: (loaded: number, amount: number) => Promise<Messages>;
  sendMessage: (
    message: Message,
    files?: File[]
  ) => Promise<AdvancedSuccessMessage>;
  addRealtimeMessageToBox: Message | null;
  setAddRealtimeMessageToBox: (message: Message | null) => void;
};

const MessageContext = createContext<MessageContextType | null>(null);

export function useMessageContext() {
  const context = useContext(MessageContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function MessageProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { send, isReady } = useSocketContext();
  const { pageData: id } = usePageContext();
  const { ownUuid, currentReceiverUuid, get } = useUserContext();
  const { get_shared_secret, encrypt, privateKey } = useCryptoContext();
  const [addRealtimeMessageToBox, setAddRealtimeMessageToBox] =
    useState<Message | null>(null);

  async function getMessages(
    loaded: number,
    amount: number
  ): Promise<Messages> {
    if (!isReady)
      throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NOT_READY");
    if (!id) throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NO_USER_ID");
    const messages = await send("messages_get", {
      user_id: id,
      amount: amount,
      offset: loaded,
    }).then((data) => {
      if (data.type === "error") throw new Error();
      if (!data.data.messages) {
        return [
          {
            send_to_server: false,
            sender: "SYSTEM",
            avatar: true,
            display: true,
            tint: "var(--primary)",
            timestamp: Date.now(),
            content: "NO_MESSAGES_WITH_USER",
          } as Message,
        ];
      }
      const sorted = [...data.data.messages]
        .map((m) => {
          const n = m;
          delete n.sent_by_self;
          return {
            send_to_server: false,
            sender: m.sent_by_self ? ownUuid : currentReceiverUuid,
            ...n,
          } as Message;
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .reverse();
      return sorted;
    });

    return {
      messages: messages || [],
      next: loaded + amount,
      previous: loaded - amount,
    };
  }

  async function sendMessage(
    message: Message,
    files?: File[]
  ): Promise<AdvancedSuccessMessage> {
    if (!isReady)
      throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NOT_READY");
    if (!id) throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NO_USER_ID");
    setAddRealtimeMessageToBox(message);
    const ownPublicKey = await get(ownUuid, false).then(
      (data) => data.public_key
    );
    const otherPublicKey = await get(currentReceiverUuid, false).then(
      (data) => data.public_key
    );
    const sharedSecret = await get_shared_secret(
      privateKey,
      ownPublicKey,
      otherPublicKey
    );
    const encrypted = await encrypt(message.content, sharedSecret.message);
    return await send("message_send", {
      ...(files && { files }),
      content: encrypted.message,
      receiver_id: currentReceiverUuid,
    });
  }

  return (
    <MessageContext.Provider
      value={{
        getMessages,
        sendMessage,
        addRealtimeMessageToBox,
        setAddRealtimeMessageToBox,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}
