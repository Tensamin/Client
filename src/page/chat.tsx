// Package Imports
import React, { useEffect, useRef, useState } from "react";
import * as Icon from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Lib Imports
import { MaxSendBoxSize } from "@/lib/utils";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Button } from "@/components/ui/button";
import { Box } from "@/components/chat/box";
import { PageDiv, PageTextarea } from "@/components/pageDiv";

// Main
export default function Page() {
  const { data } = useStorageContext();
  const [client] = React.useState(() => new QueryClient());
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function sendMessage() {
    alert("alarm");
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MaxSendBoxSize);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MaxSendBoxSize ? "auto" : "hidden";
  }, [message]);

  return (
    <div className="h-full w-full flex flex-col gap-2 overflow-hidden">
      <PageDiv className="h-full">
        <QueryClientProvider client={client}>
          <Box />
        </QueryClientProvider>
      </PageDiv>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="aspect-square h-10 w-10 flex p-2 rounded-lg border dark:border-border dark:bg-card/46 bg-card/46"
        >
          <Icon.Plus />
        </Button>
        <PageTextarea
          ref={textareaRef}
          value={message}
          onKeyDown={(e) => {
            if (
              data.reverseEnterInChats
                ? e.key === "Enter" && e.shiftKey
                : e.key === "Enter" && !e.shiftKey
            ) {
              e.preventDefault();
              sendMessage();
            }
          }}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send a message"
          className="w-full overflow-hidden min-h-10 max-h-52"
        />
      </div>
    </div>
  );
}
