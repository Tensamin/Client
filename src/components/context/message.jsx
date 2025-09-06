"use client";

// Package Imports
import {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { toast } from "sonner";

// Lib Imports
import { log } from "@/lib/utils";
import ls from "@/lib/local_storage";

// Context Imports
import { useCryptoContext } from "@/components/context/crypto";
import { useWebSocketContext } from "@/components/context/websocket";
import { useUsersContext } from "@/components/context/users";
import { endpoint } from "@/lib/endpoints";

// Main
let MessageContext = createContext();
let initialMessages = 40;

// Use Context Function
export function useMessageContext() {
  let context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
}

// Provider
export function MessageProvider({ children }) {
  let { get, makeChatTop, ownUuid } = useUsersContext();
  let { send, connected, message } = useWebSocketContext();
  let {
    encrypt_base64_using_aes,
    decrypt_base64_using_aes,
    get_shared_secret,
    privateKey,
  } = useCryptoContext();

  let [receiver, setReceiver] = useState("");
  let [receiverPublicKey, setReceiverPublicKey] = useState("");
  let [messages, setMessages] = useState([]);
  let [messagesAmount, setMessagesAmount] = useState(initialMessages);
  let [sharedSecret, setSharedSecret] = useState("");
  let [failedMessages, setFailedMessages] = useState(0);
  let [navbarLoading, setNavbarLoading] = useState(false);
  let [navbarLoadingMessage, setNavbarLoadingMessage] = useState(false);
  let [loadMoreMessages, setLoadMoreMessages] = useState(false);
  let [loadedAllMessages, setLoadedAllMessages] = useState(false);
  let [noMessageWithUser, setNoMessageWithUser] = useState(false);
  let [loadedMessagesAmount, setLoadedMessagesAmount] = useState(0);
  let navbarLoadingTimeoutRef = useRef(null);
  let notificationSoundRef = useRef(null);

  // Notifications
  let [notificationPermission, setNotificationPermission] = useState("default");
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      log("Notifications are not supported by this browser.", "warning");
    }
  }, []);

  let requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return {
        success: false,
        message: "Notifications are not supported by this browser.",
      };
    }

    try {
      let permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        return { success: true, message: "Notifications enabled!" };
      } else {
        return { success: false, message: "Notifications have been denied!" };
      }
    } catch (err) {
      return "Error requesting notification permission: " + err.message;
    }
  }, []);

  let playMessageSound = useCallback(() => {
    try {
      let audio = notificationSoundRef.current;
      if (!audio) {
        audio = new Audio(endpoint.sound_message);
        audio.preload = "auto";
        notificationSoundRef.current = audio;
      }
      audio.currentTime = 0;
      audio.play()?.catch(() => {});
    } catch (_) {
      // no-op
    }
  }, []);

  function sendNotification(sender, body, icon) {
    playMessageSound();

    if (!("Notification" in window)) {
      toast.info(
        `${sender} sent you a message, enable notifications in the settings!`
      );
      return;
    }

    if (notificationPermission === "granted") {
      new Notification(sender, {
        body: body,
        icon: icon,
        silent: true,
      });
    } else {
      toast.info(
        `${sender} sent you a message, enable notifications in the settings!`
      );
    }
  }

  // Main Stuff
  class Message {
    constructor(msgData) {
      this.id = msgData.id ? parseInt(msgData.id, 10) : Date.now();
      this.sender = msgData.sender;

      this.subMessages = [];

      if (msgData.content) {
        this.subMessages.push({
          content: msgData.content,
          sendToServer: msgData.sendToServer || false,
        });
      } else if (Array.isArray(msgData.messages)) {
        this.subMessages = msgData.messages;
      }
    }

    addSubMessage(content, sendToServer) {
      this.subMessages.push({ content, sendToServer });
    }
  }

  let updateNavbarLoading = useCallback((isLoading) => {
    if (navbarLoadingTimeoutRef.current) {
      clearTimeout(navbarLoadingTimeoutRef.current);
      navbarLoadingTimeoutRef.current = null;
    }

    if (isLoading) {
      setNavbarLoading(true);
    } else {
      navbarLoadingTimeoutRef.current = setTimeout(() => {
        setNavbarLoading(false);
      }, 500);
    }
  }, []);

  function resetReceiver(newReceiver) {
    setReceiver(newReceiver);
    setSharedSecret("");
    setReceiverPublicKey("");
    setFailedMessages(0);
    setLoadedMessagesAmount(0);
    setMessagesAmount(initialMessages);
    setLoadedAllMessages(false);
    setNoMessageWithUser(false);
  }

  function removeSecondsFromUnixTimestamp(oldTime) {
    let middleTime = Math.floor(oldTime / 1000 / 60);
    let newTime = middleTime * 60 * 1000;
    return newTime;
  }

  async function processAndAddMessage(id, sender, content) {
    try {
      addMessage({
        id: id,
        sender: sender,
        content: atob(await decrypt_base64_using_aes(content, sharedSecret)),
        sendToServer: false,
      });
    } catch (err) {
      let stringErr = err.toString();
      if (
        stringErr === "OperationError" ||
        stringErr ===
          "OperationError: The operation failed for an operation-specific reason"
      ) {
        setFailedMessages((prev) => prev + 1);
      } else {
        log(stringErr, "error");
      }
    }
  }

  // addMessage Function
  let addMessage = useCallback((newMessageData) => {
    setMessages((prevMessages) => {
      if (prevMessages.length > 0) {
        let lastGroup = prevMessages[prevMessages.length - 1];
        if (
          lastGroup.sender === newMessageData.sender &&
          removeSecondsFromUnixTimestamp(lastGroup.id) ===
            removeSecondsFromUnixTimestamp(newMessageData.id)
        ) {
          let newLastGroup = new Message({
            id: lastGroup.id,
            sender: lastGroup.sender,
            messages: [...lastGroup.subMessages],
          });
          newLastGroup.addSubMessage(
            newMessageData.content,
            newMessageData.sendToServer || false
          );
          return [...prevMessages.slice(0, -1), newLastGroup];
        }
      }
      return [...prevMessages, new Message(newMessageData)];
    });
  }, []);

  function addToChunk(chunk, newMessageData) {
    if (chunk.length > 0) {
      let lastGroup = chunk[chunk.length - 1];
      if (
        lastGroup.sender === newMessageData.sender &&
        removeSecondsFromUnixTimestamp(lastGroup.id) ===
          removeSecondsFromUnixTimestamp(newMessageData.id)
      ) {
        let newLastGroup = new Message({
          id: lastGroup.id,
          sender: lastGroup.sender,
          messages: [...lastGroup.subMessages],
        });

        newLastGroup.addSubMessage(
          newMessageData.content,
          newMessageData.sendToServer || false
        );
        return [...chunk.slice(0, -1), newLastGroup];
      }
    }
    return [...chunk, new Message(newMessageData)];
  }

  // Loading of more messages
  useEffect(() => {
    if (loadMoreMessages && !loadedAllMessages) {
      updateNavbarLoading(true);
      setNavbarLoadingMessage("Loading more messages.");
      send(
        "message_get",
        {
          message: "Getting messages",
          log_level: 0,
        },
        {
          chat_partner_id: receiver,
          loaded_messages: messagesAmount,
          message_amount: initialMessages,
        }
      ).then(async (data) => {
        if (typeof data.data.message_chunk === "undefined") {
          setNavbarLoadingMessage("");
          updateNavbarLoading(false);
          setLoadMoreMessages(false);
          setLoadedAllMessages(true);
        } else {
          let sortedChunk = [...data.data.message_chunk].sort(
            (a, b) => a.message_time - b.message_time
          );

          let decryptedChunks = await Promise.all(
            sortedChunk.map(async (chunk) => {
              try {
                let decryptedContent = atob(
                  await decrypt_base64_using_aes(
                    chunk.message_content,
                    sharedSecret
                  )
                );
                return {
                  id: chunk.message_time,
                  sender: chunk.sender_is_me ? ownUuid : receiver,
                  content: decryptedContent,
                  sendToServer: false,
                };
              } catch (err) {
                let stringErr = err.toString();
                if (
                  stringErr === "OperationError" ||
                  stringErr ===
                    "OperationError: The operation failed for an operation-specific reason"
                ) {
                  setFailedMessages((prev) => prev + 1);
                } else {
                  log(stringErr, "error");
                }
                return null;
              }
            })
          );

          let chunkMessages = [];
          decryptedChunks.forEach((data) => {
            if (data) {
              chunkMessages = addToChunk(chunkMessages, data);
            }
          });

          setMessages((prev) => [...chunkMessages, ...prev]);
          setNavbarLoadingMessage("");
          updateNavbarLoading(false);
          setMessagesAmount((prev) => prev + initialMessages);
          setLoadMoreMessages(false);
        }
      });
    }
  }, [loadMoreMessages, loadedAllMessages]);

  async function getMoreMessages(amount) {
    let messages = await send(
      "message_get",
      {
        message: "Getting messages",
        log_level: 0,
      },
      {
        chat_partner_id: receiver,
        loaded_messages: loadedMessagesAmount,
        message_amount: amount,
      }
    );
    setLoadedMessagesAmount((prev) => prev + amount);
    return messages;
  }

  // Initial Loading of Messages
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      if (receiver === "") return;

      try {
        setMessages([]);

        updateNavbarLoading(true);
        setNavbarLoadingMessage("Loading receiver information.");
        let user = await get(receiver);
        if (cancelled) return;
        setReceiverPublicKey(user.public_key);

        setNavbarLoadingMessage("Computing shared secret.");
        let secret = await get_shared_secret(privateKey, user.public_key);
        if (cancelled) return;
        setSharedSecret(secret.sharedSecretHex);

        setNavbarLoadingMessage("Loading messages.");
        let data = await send(
          "message_get",
          {
            message: "Getting messages",
            log_level: 0,
          },
          {
            chat_partner_id: receiver,
            loaded_messages: 0,
            message_amount: initialMessages,
          }
        );
        if (cancelled) return;

        if (typeof data.data.message_chunk !== "undefined") {
          let sortedChunk = [...data.data.message_chunk].sort(
            (a, b) => a.message_time - b.message_time
          );
          let decryptedMessages = await Promise.all(
            sortedChunk.map(async (chunk) => {
              try {
                let decryptedContent = atob(
                  await decrypt_base64_using_aes(
                    chunk.message_content,
                    secret.sharedSecretHex
                  )
                );
                return {
                  id: chunk.message_time,
                  sender: chunk.sender_is_me ? ownUuid : receiver,
                  content: decryptedContent,
                  sendToServer: false,
                };
              } catch (err) {
                let stringErr = err.toString();
                if (
                  stringErr === "OperationError" ||
                  stringErr ===
                    "OperationError: The operation failed for an operation-specific reason"
                ) {
                  setFailedMessages((prev) => prev + 1);
                } else {
                  log(stringErr, "error");
                }
                return null;
              }
            })
          );
          let processedMessages = [];
          decryptedMessages.forEach((msgData) => {
            if (msgData) {
              processedMessages = addToChunk(processedMessages, msgData);
            }
          });
          setMessages(processedMessages);
          setNoMessageWithUser(false);
        } else {
          setNoMessageWithUser(true);
        }
      } finally {
        setNavbarLoadingMessage("");
        updateNavbarLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [receiver]);

  // Live Messages
  useEffect(() => {
    async function doStuff() {
      if (!connected || !message || message.type !== "message_live") return;

      let messageSender = message.data.sender_id;
      let messageContent = message.data.message;

      if (messageSender === receiver) {
        await processAndAddMessage(
          message.data.send_time,
          messageSender,
          messageContent
        );
        return;
      }

      try {
        let data = await get(messageSender);
        let secret = await get_shared_secret(privateKey, data.public_key);
        let tmpSharedSecret = secret.sharedSecretHex;

        makeChatTop(messageSender);

        let body = atob(
          await decrypt_base64_using_aes(messageContent, tmpSharedSecret)
        );

        sendNotification(data.display, body, data.avatar);
      } catch (err) {
        log(err?.message || String(err), "error");
      } finally {
        setNavbarLoadingMessage("");
        updateNavbarLoading(false);
      }
    }
    doStuff();
  }, [message, connected, receiver]);

  // Message Sending stuff
  useEffect(() => {
    if (receiver !== "" && sharedSecret !== "") {
      messages.forEach(async (msgGroup, groupIdx) => {
        let subMessageToSendIndex = msgGroup.subMessages.findIndex(
          (subMsg) => subMsg.sendToServer
        );

        if (subMessageToSendIndex !== -1) {
          let subMessage = msgGroup.subMessages[subMessageToSendIndex];
          try {
            let encrypted_message = await encrypt_base64_using_aes(
              btoa(subMessage.content),
              sharedSecret
            );

            await send(
              "message",
              {
                message: "",
                log_level: -1,
              },
              {
                receiver_id: receiver,
                message_content: encrypted_message,
              }
            );

            setMessages((prevMessages) => {
              let newPrevMessages = [...prevMessages];
              let targetGroup = newPrevMessages[groupIdx];

              if (targetGroup) {
                let updatedGroup = new Message({
                  id: targetGroup.id,
                  sender: targetGroup.sender,
                  messages: [...targetGroup.subMessages],
                });

                if (updatedGroup.subMessages[subMessageToSendIndex]) {
                  updatedGroup.subMessages[subMessageToSendIndex] = {
                    ...updatedGroup.subMessages[subMessageToSendIndex],
                    sendToServer: false,
                  };
                }
                newPrevMessages[groupIdx] = updatedGroup;
              }
              return newPrevMessages;
            });
          } catch (err) {
            log(err.message, "error");
          }
        }
      });
    }
  }, [messages, privateKey, receiverPublicKey, receiver, sharedSecret]);

  // Navbar Loading Timeout thing
  useEffect(() => {
    return () => {
      if (navbarLoadingTimeoutRef.current) {
        clearTimeout(navbarLoadingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <MessageContext.Provider
      value={{
        messages,
        addMessage,
        setReceiver,
        receiver,
        sharedSecret,
        resetReceiver,
        failedMessages,
        setFailedMessages,
        navbarLoading,
        navbarLoadingMessage,
        loadMoreMessages,
        setLoadMoreMessages,
        loadedAllMessages,
        setLoadedAllMessages,
        sendNotification,
        requestNotificationPermission,
        noMessageWithUser,
        getMoreMessages,
        loadedMessagesAmount,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}
