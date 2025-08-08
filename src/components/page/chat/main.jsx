// Package Imports
import { useRef, useEffect, useState, useLayoutEffect } from "react";

// Context Imports
import { useMessageContext } from "@/components/context/message";

// Components
import { Card } from "@/components/ui/card";
import { Message, MessageLoading } from "@/components/page/chat/message";
import { MessageSend } from "@/components/page/chat/send";

// Main
export function Main({ data }) {
  let containerRef = useRef(null);
  let prevScrollHeightRef = useRef(null);

  let {
    messages,
    resetReceiver,
    navbarLoading,
    setLoadMoreMessages,
    moreMessagesLoadedOnce,
    loadedAllMessages,
    noMessageWithUser,
  } = useMessageContext();

  useEffect(() => {
    resetReceiver(data);
  }, [data]);

  useLayoutEffect(() => {
    let container = containerRef.current;
    if (!container) return;

    if (prevScrollHeightRef.current !== null) {
      let scrollOffset = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop = scrollOffset;

      prevScrollHeightRef.current = null;
    } else if (!moreMessagesLoadedOnce && !navbarLoading) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, navbarLoading, moreMessagesLoadedOnce]);

  useEffect(() => {
    let container = containerRef.current;
    if (!container) return;

    let handleScroll = () => {
      if (
        container.scrollTop < 5 &&
        !navbarLoading &&
        !loadedAllMessages &&
        !noMessageWithUser
      ) {
        
        prevScrollHeightRef.current = container.scrollHeight;
        setLoadMoreMessages(true);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [navbarLoading, loadedAllMessages, noMessageWithUser, setLoadMoreMessages]);

  return (
    <div className="flex h-full w-full flex-col gap-2 rounded-xl">
      <Card
        className="flex flex-grow flex-col items-center gap-0 overflow-y-auto px-2.5 py-0 font-normal"
        ref={containerRef}
      >

        {loadedAllMessages && !noMessageWithUser ? (
          <p className="p-2 text-sm">Loaded all messages.</p>
        ) : null}
        {noMessageWithUser ? (
          <p className="p-2 text-sm">You have no messages with this user.</p>
        ) : null}

        {navbarLoading ? (
          <>
            {messages.map((message) => (
              <MessageLoading
                key={message.id}
                message={message}
              />
            ))}
          </>
        ) : (
          <>
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
              />
            ))}
          </>
        )}
      </Card>
      <MessageSend />
    </div>
  );
}