"use client";

// Package Imports
import { createContext, useContext, useEffect, useState } from "react";

// Context Imports
import { useCallContext } from "@/components/context/call";
import { useCryptoContext } from "@/components/context/crypto";
import { useMessageContext } from "@/components/context/message";
import { usePageContext } from "@/components/context/page";
import { useThemeContext } from "@/components/context/theme";
import { useUsersContext } from "@/components/context/users";
import { useWebSocketContext } from "@/components/context/websocket";
import ls from "@/lib/local_storage";

// Main
let ExtensionsContext = createContext();

// Use Context Function
export function useExtensionsContext() {
  let context = useContext(ExtensionsContext);
  if (context === undefined) {
    throw new Error(
      "useExtensionsContext must be used within an ExtensionsProvider",
    );
  }
  return context;
}

// Provider
export function ExtensionsProvider({ children }) {
  let [extensions, setExtensions] = useState({});
  let [failed, setFailed] = useState([]);

  let callContext = useCallContext();
  let cryptoContext = useCryptoContext();
  let messageContext = useMessageContext();
  let pageContext = usePageContext();
  let themeContext = useThemeContext();
  let userContext = useUsersContext();
  let webSocketContext = useWebSocketContext();

  useEffect(() => {
    if (!ls.get("extensions") || ls.get("extensions") === "") return;
    let exts = JSON.parse(ls.get("extensions"));
    setExtensions(exts);
  }, []);

  useEffect(() => {
    if (!extensions || extensions === "") return;
    ls.set("extensions", JSON.stringify(extensions));
    Object.keys(extensions).forEach((key) => {
      let extension = extensions[key];
      if (extension.enabled) {
        try {
          let data = atob(extension.src);

          let contexts = {
            useCallContext: callContext,
            useCryptoContext: cryptoContext,
            useMessageContext: messageContext,
            usePageContext: pageContext,
            useThemeContext: themeContext,
            useUsersContext: userContext,
            useWebSocketContext: webSocketContext,
          };
          let functions = {};
          let intents = JSON.parse(data.split("\n")[0]);

          intents.forEach((intent) => {
            functions[intent] = contexts[intent];
          });

          let extensionCode = new Function(
            "intents",
            data.replace(data.split("\n")[0], ""),
          );

          try {
            extensionCode(functions);
          } catch (err) {
            setFailed((prev) => [
              ...prev, // move down to reverse order
              { name: extension.name, error: err.message },
            ]);
            console.log(
              "Failed to load [" +
                extension.name +
                "] [Execution]: " +
                err.message,
            );
          }
        } catch (err) {
          setFailed((prev) => [
            ...prev,
            { name: extension.name, error: err.message },
          ]);
          console.log(
            "Failed to load [" +
              extension.name +
              "] [Invalid Structure]: " +
              err.message,
          );
        }
      } else {
        console.log("Did not load: " + extension.name);
      }
    });
  }, [extensions]);

  return (
    <ExtensionsContext.Provider
      value={{
        extensions,
        setExtensions,
      }}
    >
      {children}
    </ExtensionsContext.Provider>
  );
}