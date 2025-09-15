// Package Imports
import React, { useEffect, useRef, useState } from "react";
import * as Icon from "lucide-react";

// Lib Imports
import { MaxSendBoxSize } from "@/lib/utils";

// Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MessageBox from "@/components/messagetemp";

// Main
export default function Page({
  uuid,
}: Readonly<{
  uuid: string;
}>) {
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
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex-1 flex flex-col p-2 bg-card/46 border rounded-lg overflow-y-auto">
        <MessageBox />
      </div>
      <div className="flex gap-2 items-end">
        <Button
          variant="outline"
          className="aspect-square h-10 w-10 flex p-2 rounded-lg border dark:border-border dark:bg-card/46 bg-card/46"
        >
          <Icon.Plus />
        </Button>
        <Textarea
          ref={textareaRef}
          value={message}
          onKeyDown={(e) => {
            const sendWithShiftEnter = false;
            if (
              sendWithShiftEnter
                ? e.key === "Enter" && e.shiftKey
                : e.key === "Enter" && !e.shiftKey
            ) {
              e.preventDefault();
              sendMessage();
            }
          }}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send a message"
          className="w-full p-2 rounded-lg resize-none overflow-hidden min-h-10 max-h-52 border dark:border-border dark:bg-card/46 bg-card/46"
        />
      </div>
    </div>
  );
}
