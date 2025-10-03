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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Types
import { ErrorType, Message, User, systemUser } from "@/lib/types";
import { UserAvatar } from "../modals/raw";

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
  const [sender, setSender] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      if (data.content === "NO_MESSAGES_WITH_USER") {
        setContent(translate("NO_MESSAGES_WITH_USER"));
        setSender(systemUser);
      } else {
        try {
          const ownPublicKey = await get(ownUuid, false).then(
            (data) => data.public_key
          );
          const currentReceiver = await get(currentReceiverUuid, false);

          const sharedSecret = await get_shared_secret(
            privateKey,
            ownPublicKey,
            currentReceiver.public_key
          );

          if (!sharedSecret.success) throw new Error(sharedSecret.message);

          const decrypted = await decrypt(data.content, sharedSecret.message);

          if (!decrypted.success) throw new Error(decrypted.message);

          setContent(decrypted.message);

          if (data.sender !== "SYSTEM") {
            setSender(currentReceiver);
          } else {
            setSender(systemUser);
          }
        } catch (err: unknown) {
          // @ts-expect-error Idk TypeScript is dumb
          setFailedMessagesAmount((prev: number) => prev + 1);
          setContent((err as ErrorType).message);
        }
      }
    })();
  }, [
    data,
    translate,
    get,
    ownUuid,
    currentReceiverUuid,
    get_shared_secret,
    privateKey,
    decrypt,
    setFailedMessagesAmount,
  ]);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="h-auto w-full flex rounded-lg border"
        style={{
          background: data.tint
            ? `color-mix(in srgb, ${data.tint} 30%, transparent)`
            : "transparent",
          borderColor: data.tint
            ? `color-mix(in srgb, ${data.tint} 35%, transparent)`
            : "transparent",
        }}
      >
        <div className="flex gap-1 w-full py-3 px-2">
          {data.avatar && ( // replace with Activity in the future
            <div className="pt-0.5">
              <UserAvatar
                icon={sender?.avatar || undefined}
                title={sender?.display || ""}
                size="medium"
                border={false}
              />
            </div>
          )}
          <div className="flex flex-col">
            {data.display && (
              <span className="font-medium">{sender?.display}</span>
            )}
            <span className="text-sm">{content}</span>
          </div>
        </div>
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
        <ContextMenuItem disabled={data.sender !== ownUuid || true}>
          <Icon.Trash /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
