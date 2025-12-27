// Package Imports
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Icon from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

// Lib Imports
import { MaxSendBoxSize } from "@/lib/utils";

// Context Imports
import { useMessageContext } from "@/context/message";
import { useStorageContext } from "@/context/storage";
import { useUserContext } from "@/context/user";

// Components
import { Box } from "@/components/chat/box";
import { PageDiv, PageTextarea } from "@/components/pageDiv";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Main
export default function Page() {
  const { data } = useStorageContext();
  const { sendMessage } = useMessageContext();
  const { ownId } = useUserContext();
  const [client] = React.useState(() => new QueryClient());
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
        <PageTextarea
          ref={textareaRef}
          value={message}
          onKeyDown={(e) => {
            if (
              data.reverseEnterInChats
                ? e.key === "Enter" && e.shiftKey
                : e.key === "Enter" && !e.shiftKey
            ) {
              if (message.trim() === "") return;
              e.preventDefault();
              sendMessage({
                send_to_server: true,
                sender: ownId,
                timestamp: Date.now(),
                //files
                content: message,
              }).then((data) => {
                console.log("meeewwooo", data);
              });
              setMessage("");
            }
          }}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full overflow-hidden min-h-10 max-h-52 placeholder:select-none"
        />
        <Button
          disabled
          variant="outline"
          className="aspect-square h-10 w-10 flex rounded-lg border dark:border-border dark:bg-card/46 bg-card/46"
        >
          <Icon.Plus />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="aspect-square h-10 w-10 flex rounded-lg border dark:border-border dark:bg-card/46 bg-card/46"
            >
              <Icon.HandMetal />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="h-80 w-120 flex flex-col gap-3">
            <p className="text-lg font-semibold">Emojis</p>
            <div className="text-muted-foreground/50">Coming soon...</div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
