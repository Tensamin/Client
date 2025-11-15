"use client";

// Package Imports
import { useEffect, useMemo, useState } from "react";
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
import { UserAvatar } from "@/components/modals/raw";

// Main
export function MessageGroup({ data }: { data: Message }) {
  return (
    <div>
      <FinalMessage message={data} />
    </div>
  );
}

function FinalMessage({ message: data }: { message: Message }) {
  const { decrypt } = useCryptoContext();
  const { translate } = useStorageContext();
  const {
    get,
    fetchedUsers,
    ownUuid,
    currentReceiverSharedSecret,
    setFailedMessagesAmount,
  } = useUserContext();
  const [content, setContent] = useState<string>("");
  const cachedSender = useMemo(() => {
    if (data.sender === "SYSTEM") return systemUser;
    if (!data.sender) return null;
    return fetchedUsers.get(data.sender) ?? null;
  }, [data.sender, fetchedUsers]);
  const [sender, setSender] = useState<User | null>(cachedSender);

  useEffect(() => {
    setSender(cachedSender);
  }, [cachedSender]);

  useEffect(() => {
    (async () => {
      if (data.content === "NO_MESSAGES_WITH_USER") {
        setContent(translate("NO_MESSAGES_WITH_USER"));
        setSender(systemUser);
      } else {
        try {
          if (data.send_to_server) {
            setContent(data.content);
          } else {
            decrypt(data.content, currentReceiverSharedSecret).then(
              (sharedSecretData) => {
                if (!sharedSecretData.success) {
                  // @ts-expect-error Idk TypeScript is (still) dumb
                  setFailedMessagesAmount((prev: number) => prev + 1);
                  setContent(translate("ERROR_DECRYPTING_MESSAGE"));
                  return;
                }
                setContent(sharedSecretData.message);
              }
            );
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
    currentReceiverSharedSecret,
    decrypt,
    setFailedMessagesAmount,
  ]);

  useEffect(() => {
    if (!data.sender || data.sender === "SYSTEM") {
      setSender(systemUser);
      return;
    }

    if (cachedSender && !cachedSender.loading) {
      setSender(cachedSender);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const fetched = await get(data.sender, false);
        if (!cancelled) {
          setSender(fetched);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          // @ts-expect-error Idk TypeScript is dumb
          setFailedMessagesAmount((prev: number) => prev + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.sender, cachedSender, get, setFailedMessagesAmount]);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-auto w-full flex rounded-lg">
        <div className="flex gap-2 pl-1 w-full items-center">
          {data.avatar !== false && (
            <UserAvatar
              icon={sender?.avatar || undefined}
              title={sender?.display || ""}
              size="medium"
              border
            />
          )}
          <div className="flex flex-col">
            {data.display !== false && (
              <span className="font-medium text-md">{sender?.display}</span>
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
