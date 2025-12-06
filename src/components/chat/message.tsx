"use client";

// Package Imports
import { useEffect, useMemo, useState } from "react";
import * as Icon from "lucide-react";
import { toast } from "sonner";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { useUserContext } from "@/context/user";

// Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Types
import {
  ErrorType,
  Message,
  MessageGroup as MessageGroupType,
  User,
  systemUser,
} from "@/lib/types";
import { UserAvatar } from "@/components/modals/raw";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "../markdown/text";

// This needs restructuring!

// Main
export function MessageGroup({ data }: { data: MessageGroupType }) {
  const { get, fetchedUsers, setFailedMessagesAmount } = useUserContext();
  const cachedSender = useMemo(() => {
    if (data.sender === 0) return systemUser;
    if (!data.sender) return null;
    return fetchedUsers.get(data.sender) ?? null;
  }, [data.sender, fetchedUsers]);
  const [sender, setSender] = useState<User | null>(cachedSender);

  useEffect(() => {
    setSender(cachedSender);
  }, [cachedSender]);

  useEffect(() => {
    if (!data.sender || data.sender === 0) {
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
      } catch {
        if (!cancelled) {
          // @ts-expect-error Idk TypeScript is dumb
          setFailedMessagesAmount((prev: number) => prev + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cachedSender, data.sender, get, setFailedMessagesAmount]);

  return (
    <div className="flex gap-2 pl-1 w-full items-start pb-4.25">
      {data.avatar !== false && (
        <UserAvatar
          icon={sender?.avatar || undefined}
          title={sender?.display || ""}
          size="medium"
          border
        />
      )}
      <div className="flex flex-col w-full">
        {data.display !== false && (
          <span className="font-medium text-md select-none pb-px">
            {sender?.display ?? <Skeleton className="h-4 w-24 rounded-md" />}
          </span>
        )}
        {data.messages.map((message, index) => (
          <FinalMessage
            key={`${data.id}-${message.timestamp}-${index}`}
            message={message}
          />
        ))}
      </div>
    </div>
  );
}

function FinalMessage({ message: data }: { message: Message }) {
  const { decrypt } = useCryptoContext();
  const { ownId, currentReceiverSharedSecret, setFailedMessagesAmount } =
    useUserContext();
  const [content, setContent] = useState<string>("");
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const isEncryptedMessage =
      !data.send_to_server &&
      data.content !== "NO_MESSAGES_WITH_USER" &&
      data.sender !== 0;
    setIsDecrypting(isEncryptedMessage);

    if (data.content === "NO_MESSAGES_WITH_USER") {
      setContent("You have no messages with this user.");
      setIsDecrypting(false);
      return () => {
        cancelled = true;
      };
    }

    if (data.send_to_server) {
      setContent(data.content);
      setIsDecrypting(false);
      return () => {
        cancelled = true;
      };
    }

    const decryptMessage = async () => {
      try {
        const sharedSecretData = await decrypt(
          data.content,
          currentReceiverSharedSecret,
        );
        if (cancelled) return;
        if (!sharedSecretData.success) {
          // @ts-expect-error Idk TypeScript is (still) dumb
          setFailedMessagesAmount((prev: number) => prev + 1);
          setContent("Error decrypting message");
          return;
        }
        setContent(sharedSecretData.message);
      } catch (err: unknown) {
        if (cancelled) return;
        // @ts-expect-error Idk TypeScript is dumb
        setFailedMessagesAmount((prev: number) => prev + 1);
        setContent((err as ErrorType).message);
      } finally {
        if (!cancelled) {
          setIsDecrypting(false);
        }
      }
    };

    void decryptMessage();

    return () => {
      cancelled = true;
    };
  }, [data, currentReceiverSharedSecret, decrypt, setFailedMessagesAmount]);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-auto w-full rounded-lg text-left">
        <div className="text-sm min-h-4 py-px">
          {isDecrypting ? (
            <Skeleton className="h-4 w-24 rounded-md" />
          ) : (
            <Text text={content} />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
              toast.success("Message copied to clipboard!");
            } catch {
              toast.error("Failed to copy message to clipboard.");
            }
          }}
        >
          <Icon.Clipboard /> {"Copy"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled>
          <Icon.Reply /> {"Reply"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={data.sender !== ownId || true}>
          <Icon.Trash /> {"Delete"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
