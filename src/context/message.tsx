"use client";

// Package Imports
import { createContext, useContext } from "react";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { usePageContext } from "@/context/page";

// Components
import { Messages, Message } from "@/components/chat/message";

// Main
type MessageContextType = {
  getMessages: (loaded: number, amount: number) => Promise<Messages>;
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

  async function getMessages(
    loaded: number,
    amount: number
  ): Promise<Messages> {
    if (!isReady)
      throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NOT_READY");
    if (!id) throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NO_USER_ID");
    const messages = await send("message_get", {
      user_id: id,
      amount: amount,
      offset: loaded,
    }).then((data) => {
      if (data.type === "error") throw new Error();
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
      const getTime = (m: Message) => Number(m.message_time) || 0;
      const sorted = [...data.data.message_chunk]
        .sort((a, b) => getTime(b) - getTime(a))
        .reverse();
      return sorted;
    });

    return {
      messages: messages || [],
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
