"use client";

// Package Imports
import { createContext, useContext, useState, useRef, useEffect } from "react";

// Lib Imports
import { user } from "@/lib/endpoints";
import { User } from "@/lib/types";
import { log, getDisplayFromUsername } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";

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

  async function getMessages(loaded: any, amount: number) {
    const messages = Array.from({ length: amount }).map((_, i: number) => {
      return {
        id: String(i + loaded),
        text: "hell",
      } as Message;
    });

    return {
      messages: messages,
      total: loaded + amount,
    } as Messages;
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
