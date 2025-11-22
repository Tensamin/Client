"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { usePageContext } from "@/context/page";
import { useUserContext } from "@/context/user";
import { useCryptoContext } from "@/context/crypto";
import { useStorageContext } from "@/context/storage";

// Components
import { UserAvatar } from "@/components/modals/raw";

// Types
import {
  AdvancedSuccessMessage,
  File,
  Message,
  MessageGroup,
  Messages,
} from "@/lib/types";

const GROUP_WINDOW_MS = 60 * 1000;

// Main
type MessageContextType = {
  getMessages: (loaded: number, amount: number) => Promise<Messages>;
  sendMessage: (
    message: Message,
    files?: File[]
  ) => Promise<AdvancedSuccessMessage>;
  addRealtimeMessageToBox: Message | null;
  setAddRealtimeMessageToBox: (message: Message | null) => void;
};

const MessageContext = createContext<MessageContextType | null>(null);

export function useMessageContext() {
  const context = useContext(MessageContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function MessageProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { send, isReady, lastMessage } = useSocketContext();
  const { pageData: id } = usePageContext();
  const { ownUuid, currentReceiverUuid, get } = useUserContext();
  const { get_shared_secret, encrypt, privateKey } = useCryptoContext();
  const newUserNotification = useNewUserNotification();
  const [addRealtimeMessageToBox, setAddRealtimeMessageToBox] =
    useState<Message | null>(null);

  useEffect(() => {
    if (lastMessage && lastMessage.type === "message_live") {
      if (lastMessage.data.sender_id === currentReceiverUuid) {
        setAddRealtimeMessageToBox({
          send_to_server: false,
          sender: lastMessage.data.sender_id ?? "",
          content: lastMessage.data.message ?? "",
          timestamp: Number(lastMessage.data.send_time) ?? 0,
          avatar: true,
          display: true,
        });
      } else {
        newUserNotification(
          lastMessage.data.sender_id ?? "",
          lastMessage.data.message ?? ""
        );
      }
    }
  }, [currentReceiverUuid, lastMessage, newUserNotification]);

  const groupMessages = useCallback(
    (messagesList: Message[]): MessageGroup[] => {
      const grouped: MessageGroup[] = [];

      for (const message of messagesList) {
        const lastGroup = grouped[grouped.length - 1];
        const lastGroupLastMessage = lastGroup?.messages.at(-1);
        const isWithinWindow =
          lastGroup &&
          lastGroup.sender === message.sender &&
          lastGroupLastMessage &&
          message.timestamp - lastGroupLastMessage.timestamp <= GROUP_WINDOW_MS;

        if (isWithinWindow && lastGroupLastMessage) {
          lastGroup.messages = [...lastGroup.messages, message];
          lastGroup.timestamp = message.timestamp;
        } else {
          grouped.push({
            id: `${message.sender}-${message.timestamp}`,
            sender: message.sender,
            avatar: message.avatar,
            display: message.display,
            timestamp: message.timestamp,
            tint: message.tint,
            messages: [message],
          });
        }
      }

      return grouped;
    },
    []
  );

  const getMessages = useCallback(
    async (loaded: number, amount: number): Promise<Messages> => {
      if (!isReady)
        throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NOT_READY");
      if (!id) throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NO_USER_ID");
      const groupedMessages = await send("messages_get", {
        user_id: id,
        amount: amount,
        offset: loaded,
      }).then((data) => {
        if (data.type === "error") throw new Error();
        if (
          (data.data.messages?.length === 0 || !data.data.messages) &&
          loaded === 0
        ) {
          const emptyStateMessage: Message = {
            send_to_server: false,
            sender: "SYSTEM",
            avatar: true,
            display: true,
            tint: "var(--primary)",
            timestamp: Date.now(),
            content: "NO_MESSAGES_WITH_USER",
          };

          return groupMessages([emptyStateMessage]);
        }
        if (!data.data.messages) return [];
        const sorted = [...data.data.messages]
          .map((m) => {
            return {
              send_to_server: false,
              sender: m.sent_by_self ? ownUuid : currentReceiverUuid,
              ...m,
            } as Message;
          })
          .sort((a, b) => b.timestamp - a.timestamp)
          .reverse();
        return groupMessages(sorted);
      });

      return {
        messages: groupedMessages || [],
        next: loaded + amount,
        previous: loaded - amount,
      };
    },
    [currentReceiverUuid, groupMessages, id, isReady, ownUuid, send]
  );

  const sendMessage = useCallback(
    async (
      message: Message,
      files?: File[]
    ): Promise<AdvancedSuccessMessage> => {
      if (!isReady)
        throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NOT_READY");
      if (!id) throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NO_USER_ID");
      setAddRealtimeMessageToBox(message);
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
      const encrypted = await encrypt(message.content, sharedSecret.message);
      return await send("message_send", {
        ...(files && { files }),
        content: encrypted.message,
        receiver_id: currentReceiverUuid,
      });
    },
    [
      currentReceiverUuid,
      encrypt,
      get,
      get_shared_secret,
      id,
      isReady,
      ownUuid,
      privateKey,
      send,
    ]
  );

  return (
    <MessageContext.Provider
      value={{
        getMessages,
        sendMessage,
        addRealtimeMessageToBox,
        setAddRealtimeMessageToBox,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useNewUserNotification() {
  const { get, ownUuid } = useUserContext();
  const { decrypt, get_shared_secret, privateKey } = useCryptoContext();
  const { data } = useStorageContext();

  return useCallback(
    (userId: string, encryptedMessage: string) => {
      if (!userId || !encryptedMessage) return;
      void (async () => {
        try {
          const [otherUser, ownUser] = await Promise.all([
            get(userId, false),
            get(ownUuid, false),
          ]);

          const sharedSecret = await get_shared_secret(
            privateKey,
            ownUser.public_key,
            otherUser.public_key
          );

          const decrypted = await decrypt(
            encryptedMessage,
            sharedSecret.message
          );

          if (!decrypted.success) return;

          const playSound = async () => {
            try {
              const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
              const response = await fetch("/assets/sounds/message.wav");
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await audioContext.decodeAudioData(
                arrayBuffer
              );
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              source.start(0);
            } catch (err: unknown) {
              toast.error(String(err));
            }
          };

          const showFallback = () => {
            toast(otherUser.display, {
              duration: 5000,
              description: decrypted.message,
              icon: (
                <UserAvatar
                  className="block"
                  border
                  size="small"
                  title={otherUser.display}
                  icon={otherUser.avatar}
                />
              ),
            });

            playSound();
          };

          if (!data.enableNotifications) {
            showFallback();
            return;
          }

          const showRealNotification = () => {
            const notification = new Notification(otherUser.display, {
              icon:
                otherUser.avatar || "/assets/app/web-app-manifest-192x192.png",
              body: decrypted.message,
              silent: true,
            });

            playSound();

            notification.onclick = () => {
              window.focus();
            };
          };

          if (typeof window === "undefined" || !("Notification" in window)) {
            showFallback();
            return;
          }

          if (Notification.permission === "granted") {
            showRealNotification();
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                showRealNotification();
              } else {
                showFallback();
              }
            });
          } else {
            showFallback();
          }
        } catch (error) {
          toast.error(String(error));
        }
      })();
    },
    [decrypt, get, get_shared_secret, ownUuid, privateKey]
  );
}
