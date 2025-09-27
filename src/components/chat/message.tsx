"use client";

// Package Imports
import { useEffect, useState } from "react";
import * as Icon from "lucide-react";
import { toast } from "sonner";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";

// Components
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Types
import { ErrorType, Message } from "@/lib/types";

// Main
export function MessageGroup({ data }: { data: Message }) {
  return (
    <div>
      <FinalMessage message={data} />
    </div>
  );
}

function FinalMessage({ message: data }: { message: Message }) {
  const { decrypt, get_shared_secret, privateKey } = useCryptoContext();
  const { translate } = useStorageContext();
  const { get, ownUuid, currentReceiverUuid, setFailedMessagesAmount } =
    useUserContext();
  const [content, setContent] = useState<string>("");
  const [sender, setSender] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (data.content === "NO_MESSAGES_WITH_USER") {
        setContent(data.content);
      } else {
        try {
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
          if (!sharedSecret.success) throw new Error(sharedSecret.message);

          const decrypted = await decrypt(data.content, sharedSecret.message);
          if (!decrypted.success) throw new Error(decrypted.message);
          setContent(decrypted.message);
          setSender(data.sender);
        } catch (err: unknown) {
          // @ts-expect-error Idk TypeScript is dumb
          setFailedMessagesAmount((prev: number) => prev + 1);
          setContent((err as ErrorType).message);
        }
      }
    })();
  }, []);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {content === "" ? <Skeleton className="h-5 w-50" /> : content}
        {sender}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
              toast.success(translate("COPY_MESSAGE_TO_CLIPBOARD"));
            } catch {
              toast.error("ERROR_COPY_MESSAGE_TO_CLIPBOARD");
            }
          }}
        >
          <Icon.Clipboard /> Copy
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled>
          <Icon.Reply /> Reply
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled>
          <Icon.Trash /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
