// Package Imports
import { useRef, useEffect } from "react";

// Context Imports
import { useMessageContext } from "@/components/context/message";

// Components
import { Card } from "@/components/ui/card";
import { Message, MessageLoading } from "@/components/page/chat/message";
import { MessageSend } from "@/components/page/chat/send";

// Main
export function Main({ data }) {
  let containerRef = useRef(null);
  let { resetReceiver, navbarLoading, loadedAllMessages, noMessageWithUser } =
    useMessageContext();

  useEffect(() => {
    resetReceiver(data);
  }, [data]);

  return (
    <div className="flex h-full w-full flex-col gap-2 rounded-xl">
      <Card
        className="scrollbar-hide flex flex-grow flex-col items-center gap-0 overflow-y-auto px-2.5 py-0 font-normal relative"
        ref={containerRef}
      >
        {navbarLoading ? (
          <>
            <p className="text-red-500">
              All messages are unavailable while the message display is fully
              reworked
            </p>
            {/*
            <MessageLoading amount={3} />
            <MessageLoading amount={5} />
            <MessageLoading amount={2} />
            <MessageLoading amount={1} />
            */}
          </>
        ) : (
          <>
            {/*loadedAllMessages && !noMessageWithUser ? (
              <p className="p-2 text-sm">Loaded all messages.</p>
            ) : null}
            {noMessageWithUser ? (
              <p className="p-2 text-sm">
                You have no messages with this user.
              </p>
            ) : null*/}
            <p className="text-red-500">
              All messages are unavailable while the message display is fully
              reworked
            </p>
            {/* Messages here */}
          </>
        )}
      </Card>
      <MessageSend />
    </div>
  );
}
