"use client";

// Package Imports
import { createContext, useContext } from "react";

// Lib Imports
import { AdvancedSuccessMessage } from "@/lib/types";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { usePageContext } from "@/app/page";

// Components
import { Messages, Message } from "@/components/chat/message";

// Main
type MessageContextType = {
  getMessages: (loaded: any, amount: number) => Promise<Messages>;
};

const MessageContext = createContext<MessageContextType | null>(null);

export function useMessageContext() {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
  return context;
}

export function MessageProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { send, isReady } = useSocketContext();
  const { pageData: id } = usePageContext();

  async function getMessages(loaded: any, amount: number): Promise<Messages> {
    if (!isReady) throw new Error("Socket not ready");
    if (!id) throw new Error("No user id");
    const messages = await send(
      "message_get",
      {
        log_level: 0,
        message: "SOCKET_CONTEXT_REQUESTING_MESSAGES",
      },
      { chat_partner_id: id, loaded_messages: loaded, message_amount: amount }
    ).then((data: AdvancedSuccessMessage) => {
      if (data.type === "error") throw new Error(data.log.message);
      if (!data.data.message_chunk) {
        return [
          {
            message_content: "NO_MESSAGES_WITH_USER",
            message_time: 0,
            message_state: "SYSTEM",
            sender_is_me: false,
          } as Message,
        ];
      }
      const getTime = (m: any) => Number(m.message_time) || 0;
      const sorted = [...data.data.message_chunk]
        .sort((a, b) => getTime(b) - getTime(a))
        .reverse();
      return sorted;
    });

    return {
      messages,
      next: loaded + amount,
      previous: loaded - amount,
    };
  }

  return (
    <MessageContext.Provider
      value={{
        getMessages,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}
