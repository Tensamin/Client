"use client";

// Package Imports
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { v7 } from "uuid";

// Lib Imports
import { log, log as logFunction } from "@/lib/utils";

// Context Imports
import { useCryptoContext } from "@/components/context/crypto";
import { useUsersContext } from "@/components/context/users";
import { useWebSocketContext } from "@/components/context/websocket";
import { useMessageContext } from "@/components/context/message";

// Main
let CommunityContext = createContext(null);

// Use Context Function
export let useCommunityContext = () => {
  let context = useContext(CommunityContext);
  if (!context) {
    throw new Error(
      "useCommunityContext must be used within a CommunityProvider",
    );
  }
  return context;
};

// Provider
export let CommunityProvider = ({ children }) => {
  // WebSocket Send Function
  let pendingRequests = useRef(new Map());
  let responseTimeout = 10000;

  // Basic Functions
  let {
    encrypt_base64_using_aes,
    decrypt_base64_using_aes,
    get_shared_secret,
    privateKey,
  } = useCryptoContext();
  let { ownUuid } = useUsersContext();
  
  // Community
  let [domain, setDomain] = useState(null);
  let [port, setPort] = useState(null);
  let [connectToCommunity, setConnectToCommunity] = useState(false);
  let [connected, setConnected] = useState(false);
  let [clientPing, setClientPing] = useState("?");
  let [identified, setIdentified] = useState(false);
  let [communityPublicKey, setCommunityPublicKey] = useState("");
  let [communitySecret, setCommunitySecret] = useState("");

  // Handle WebSocket Messages
  let handleWebSocketMessage = useCallback(
    async (event) => {
      let message = JSON.parse(event.data);

      if (message.type !== "pong") {
        logFunction(message, "debug", "Community WebSocket (Received):");
      }

      switch (message.type) {
        case "asd":
          console.log("asd");
          break;

        default:
          break;
      }

      if (message.id && pendingRequests.current.has(message.id)) {
        let { resolve, reject, timeoutId } = pendingRequests.current.get(
          message.id,
        );
        clearTimeout(timeoutId);
        pendingRequests.current.delete(message.id);

        if (message.type !== "error" || !identified) {
          resolve(message);
        } else {
          reject(
            new Error(
              `Received unknown response type '${message.type}' for request ID '${message.id}'.`,
            ),
          );
        }
      } else logFunction(message.log.message, "info");
    },
    [decrypt_base64_using_aes, encrypt_base64_using_aes, identified],
  );

  // Init WebSocket
  let { sendMessage, readyState } = useWebSocket(
    connectToCommunity && domain && port ? `wss://${domain}:${port}` : null,
    {
      onOpen: async () => {
        logFunction(
          `Community connected (wss://${domain}:${port})`,
          "info",
          "Community WebSocket:",
        );
      },
      onClose: () => {
        logFunction("Community disconnected", "info", "Community WebSocket:");
        pendingRequests.current.forEach(({ reject, timeoutId }) => {
          clearTimeout(timeoutId);
          reject(
            new Error(
              "Community WebSocket connection closed before response was received.",
            ),
          );
        });
        pendingRequests.current.clear();
      },
      onError: () => {
        console.log("TEST");
      },
      onMessage: handleWebSocketMessage,
      shouldReconnect: () => connectToCommunity && domain && port,
      share: true,
      reconnectAttempts: 5,
      reconnectInterval: 3000,
    },
  );

  // Send Function
  let send = useCallback(
    async (requestType, log, data = {}, awaitResponse = true) => {
      if (
        readyState !== ReadyState.CLOSED &&
        readyState !== ReadyState.CLOSING
      ) {
        if (awaitResponse) {
          return new Promise((resolve, reject) => {
            let id = v7();

            let messageToSend = {
              id,
              type: requestType,
              log,
              data,
            };

            if (messageToSend.type !== "ping") {
              logFunction(
                messageToSend,
                "debug",
                "Community WebSocket (Sent):",
              );
            }

            let timeoutId = setTimeout(() => {
              pendingRequests.current.delete(id);
              let timeoutError = new Error(
                `Community WebSocket request timed out for ID: ${id} (Type: ${requestType}) after ${responseTimeout}ms.`,
              );
              reject(timeoutError);
            }, responseTimeout);

            pendingRequests.current.set(id, { resolve, reject, timeoutId });

            try {
              sendMessage(JSON.stringify(messageToSend));
            } catch (e) {
              clearTimeout(timeoutId);
              pendingRequests.current.delete(id);
              let sendError = new Error(
                `Failed to send Community WebSocket message: ${e.message}`,
              );
              logFunction(sendError, "error");
              reject(sendError);
            }
          });
        } else {
          let messageToSend = {
            type: requestType,
            log,
            data,
          };

          if (messageToSend.type !== "ping") {
            logFunction(messageToSend, "debug", "Community WebSocket (Sent):");
          }

          sendMessage(JSON.stringify(messageToSend));
        }
      } else {
        logFunction(
          "Community WebSocket not connected",
          "warning",
          "Voice WebSocket:",
        );
      }
    },
    [sendMessage, connected],
  );

  // Update Connected State
  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      setConnected(true);
    } else {
      setConnected(false);
    }
  }, [readyState]);

  // Pings
  useEffect(() => {
    let interval;
    if (connected) {
      interval = setInterval(async () => {
        let time = Date.now();
        await send("ping", { message: "Ping from Client", log_level: -1 })
          .then(() => {
            let newTime = Date.now();
            setClientPing(newTime - time);
          })
          .catch((err) => {
            logFunction(err.message, "info");
          });
      }, 10000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [connected, send]);

  // Identification
  useEffect(() => {
    async function sendIdentification() {
      if (connected) {
        send(
          "identification",
          {
            message: "Client signing in",
            log_level: 1,
          },
          {
            user_id: ownUuid,
          },
        ).then(async (data) => {
          if (data.type !== "error") {
            let newPublicKey = data.data.public_key;
            let secret = await get_shared_secret(privateKey, newPublicKey);

            let decryptedSecret = await decrypt_base64_using_aes(
              data.data.challenge,
              secret,
            );

            await send(
              "challenge_response",
              {
                message: "Solved challenge",
                log_level: 1,
              },
              {
                challenge: decryptedSecret,
              },
            ).then((data) => {
              if (data.type !== "error") {
                setCommunityPublicKey(newPublicKey);
                setCommunitySecret(secret);
                setIdentified(true);
              } else {
                log(data.log.message, "error");
              }
            });
          } else {
            log(data.log.message, "error");
            setIdentified(false);
          }
        });
      } else {
        setIdentified(false);
      }
    }

    sendIdentification();
  }, [connected, send]);

  // Unmount Cleanup
  useEffect(() => {
    return () => {
      pendingRequests.current.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId);
        let unmountError = new Error(
          "WebSocket provider unmounted before response was received.",
        );
        logFunction(unmountError.toString(), "error");
        reject(unmountError);
      });
      pendingRequests.current.clear();
    };
  }, []);

  return (
    <CommunityContext.Provider
      value={{
        connected,
        domain,
        setDomain,
        port,
        setPort,
        clientPing,
        setConnectToCommunity,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};
