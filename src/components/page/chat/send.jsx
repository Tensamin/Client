// Package Imports
import * as Icon from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

// Lib Imports
import ls from "@/lib/localStorageManager";

// Context Imports
import { useWebSocketContext } from "@/components/context/websocket";
import { useMessageContext } from "@/components/context/message";
import { useUsersContext } from "@/components/context/users";

// Components
import { Button } from "@/components/ui/button";

// Main
export function MessageSend() {
  let [message, setMessage] = useState("");
  let { ownUuid, makeChatTop } = useUsersContext();
  let { connected } = useWebSocketContext();
  let { addMessage, navbarLoading, navbarLoadingMessage, receiver } = useMessageContext();
  let textareaRef = useRef(null);

  let handleGlobalKeyDown = useCallback((event) => {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable)
    ) {
      if (activeElement !== textareaRef.current) {
        return;
      }
    }

    const isNavigationOrControlKey = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Tab",
      "Escape",
    ].includes(event.key);

    const isTypingKey =
      !isNavigationOrControlKey &&
      (event.key.length === 1 ||
        event.key === "Backspace" ||
        event.key === "Delete" ||
        event.key === "Enter");

    if (
      isTypingKey &&
      textareaRef.current &&
      activeElement !== textareaRef.current
    ) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "46px";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (connected) {
      if (message.trim().length === 0) {
        return;
      }

      addMessage({
        id: Math.floor(Date.now()).toString(),
        sender: ownUuid,
        content: message,
        sendToServer: true,
      });
      makeChatTop(receiver);

      setMessage("");
    } else {
      toast.error("You are not connected to a Omikron Server!");
    }
  }

  return (
    <form className="flex gap-3 w-full items-center" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="p-2.5 w-full rounded-xl text-sm resize-none placeholder:text-muted-foreground border outline-0 text-md border-input bg-card overflow-hidden"
        placeholder={navbarLoading ? navbarLoadingMessage || "Send a message..." : "Send a message..."}
        id="message"
        name="message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button
        variant="outline"
        className="w-10.5 h-10.5 rounded-full"
        type="submit"
        id="submit"
        name="submit"
      >
        <Icon.Send />
      </Button>
    </form>
  );
}