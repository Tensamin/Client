import { useCryptoContext } from "@/context/crypto";
import { useUserContext } from "@/context/user";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import * as Icon from "lucide-react";
import { toast } from "sonner";
import { ErrorType } from "@/lib/types";

export type Message = {
  message_content: string;
  message_state: string;
  message_time: number;
  sender_is_me: boolean;
};

export type Messages = {
  messages: Message[];
  next: number;
  previous: number;
};

export function MessageGroup({ data }: { data: Message }) {
  return (
    <div>
      <FinalMessage data={data.message_content} />
    </div>
  );
}

function FinalMessage({ data }: { data: string }) {
  const { decrypt, get_shared_secret, privateKey } = useCryptoContext();
  const { get, ownUuid, currentReceiverUuid, setFailedMessagesAmount } =
    useUserContext();
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (data === "NO_MESSAGES_WITH_USER") {
        setContent(data);
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
          const decrypted = await decrypt(data, sharedSecret.message);
          if (!decrypted.success) throw new Error(decrypted.message);
          setContent(decrypted.message);
        } catch (err: unknown) {
          setFailedMessagesAmount((prev: number) => prev + 1);
          setContent((err as ErrorType).message);
        }
      }
    })();
  }, [data]);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {content === "" ? <Skeleton className="h-5 w-50" /> : content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
              toast.success("Copied to clipboard!");
            } catch {
              toast.error("Failed to copy to clipboard.");
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
