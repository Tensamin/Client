"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// Lib Imports
import * as CommunicationValue from "@/lib/wsMessageTypes";

// Context Imports
import { useCryptoContext } from "@/context/CryptoContext";
import { useSocketContext } from "@/context/SocketContext";
import { useStorageContext } from "@/context/StorageContext";
import { useUserContext } from "@/context/UserContext";

// Components

// Types
import { Text } from "@/components/markdown/MarkdownText";
import Avatar from "@/components/common/Avatar";
import { DataContainer } from "@/lib/wsMessageTypes";
import { playSound } from "@/features/audio/soundPlayer";
import { Message, MessageGroup, Messages } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { defaults } from "@/config/defaults";

const GROUP_WINDOW_MS = 60 * 1000;

// Main
type MessageContextType = {
  getMessages: (loaded: number, amount: number) => Promise<Messages>;
  sendMessage: (message: Message, files?: File[]) => Promise<DataContainer>;
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
  const { send, identified, lastMessage } = useSocketContext();

  const { data: storageData } = useStorageContext();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));

  const { ownId, currentReceiverId, get, updateConversationPosition } =
    useUserContext();
  const { get_shared_secret, encrypt, privateKey } = useCryptoContext();
  const newUserNotification = useNewUserNotification();
  const [addRealtimeMessageToBox, setAddRealtimeMessageToBox] =
    useState<Message | null>(null);
  const processedMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== "message_live") return;
    const data = lastMessage.data as CommunicationValue.message_live;
    const messageId = `${lastMessage.id}-${data.sender_id}-${data.send_time}`;

    if (processedMessageRef.current === messageId) return;
    processedMessageRef.current = messageId;

    if (data.sender_id === currentReceiverId) {
      setAddRealtimeMessageToBox({
        send_to_server: false,
        sender: data.sender_id ?? "",
        content: data.message ?? "",
        timestamp: Number(data.send_time) ?? 0,
        showAvatar: true,
        showName: true,
        message_state:
          (storageData.sendMessageReadFeedback ??
          defaults.sendMessageReadFeedback)
            ? "read"
            : "received",
      });
      send(
        "message_live",
        {
          message_state:
            (storageData.sendMessageReadFeedback ??
            defaults.sendMessageReadFeedback)
              ? "read"
              : "received",
        },
        true,
        lastMessage.id,
      );
    } else {
      newUserNotification(data.sender_id, data.message);
      send(
        "message_live",
        {
          message_state: "received",
        },
        true,
        lastMessage.id,
      );
    }
  }, [
    currentReceiverId,
    lastMessage,
    newUserNotification,
    storageData.sendMessageReadFeedback,
    send,
  ]);

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
            showAvatar: message.showAvatar,
            showName: message.showName,
            timestamp: message.timestamp,
            tint: message.tint,
            messages: [message],
          });
        }
      }

      return grouped;
    },
    [],
  );

  const getMessages = useCallback(
    async (loaded: number, amount: number): Promise<Messages> => {
      if (!identified)
        throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NOT_READY");
      if (!id) throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NO_USER_ID");
      const groupedMessages = await send("messages_get", {
        user_id: Number(id),
        amount: amount,
        offset: loaded,
      }).then((raw) => {
        const data = raw as CommunicationValue.messages_get;
        if ((data.messages?.length === 0 || !data.messages) && loaded === 0) {
          return groupMessages([]);
        }
        if (!data.messages) return [];
        const sorted = [...data.messages]
          .map((m) => {
            return {
              send_to_server: false,
              sender: m.sent_by_self ? ownId : currentReceiverId,
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
    [currentReceiverId, groupMessages, id, identified, ownId, send],
  );

  const sendMessage = useCallback(
    async (message: Message, files?: File[]): Promise<DataContainer> => {
      if (!identified)
        throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NOT_READY");
      if (!id) throw new Error("ERROR_SOCKET_CONTEXT_GET_MESSAGES_NO_USER_ID");
      setAddRealtimeMessageToBox(message);
      const ownPublicKey = await get(ownId, false).then(
        (data) => data.public_key,
      );
      const otherPublicKey = await get(currentReceiverId, false).then(
        (data) => data.public_key,
      );
      const sharedSecret = await get_shared_secret(
        privateKey,
        ownPublicKey,
        otherPublicKey,
      );
      updateConversationPosition(currentReceiverId);
      const encrypted = await encrypt(message.content, sharedSecret.message);
      return await send("message_send", {
        ...(files && { files }),
        content: encrypted.message,
        receiver_id: currentReceiverId,
      });
    },
    [
      updateConversationPosition,
      currentReceiverId,
      encrypt,
      get,
      get_shared_secret,
      id,
      identified,
      ownId,
      privateKey,
      send,
    ],
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
  const { get, ownId, updateConversationPosition, currentReceiverId } =
    useUserContext();
  const { decrypt, get_shared_secret, privateKey } = useCryptoContext();
  const { data } = useStorageContext();

  return useCallback(
    (userId: number, encryptedMessage: string) => {
      if (!userId || !encryptedMessage) return;
      void (async () => {
        try {
          const [otherUser, ownUser] = await Promise.all([
            get(userId, false),
            get(ownId, false),
          ]);

          const sharedSecret = await get_shared_secret(
            privateKey,
            ownUser.public_key,
            otherUser.public_key,
          );

          const decrypted = await decrypt(
            encryptedMessage,
            sharedSecret.message,
          );

          if (!decrypted.success) return;

          updateConversationPosition(currentReceiverId);

          const showFallback = () => {
            toast(otherUser.display, {
              duration: 5000,
              description: <Text text={decrypted.message} />,
              icon: (
                <Avatar
                  className="block"
                  addBorder
                  size={10}
                  display={otherUser.display}
                  image={otherUser.avatar}
                  loading={otherUser.loading}
                />
              ),
            });

            playSound("message");
          };

          if (!data.enableNotifications) {
            showFallback();
            return;
          }

          const showRealNotification = () => {
            const notification = new Notification(otherUser.display, {
              icon: otherUser.avatar || "/assets/images/logo.png",
              body: decrypted.message,
              silent: true,
            });

            playSound("message");

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
    [
      updateConversationPosition,
      currentReceiverId,
      decrypt,
      get,
      get_shared_secret,
      ownId,
      privateKey,
      data.enableNotifications,
    ],
  );
}
