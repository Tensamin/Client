"use client";

// Package Imports
import React, { createContext, useContext, useEffect, useState } from "react";

// Context Imports
import { useCallContext } from "@/components/context/call";
import { useCryptoContext } from "@/components/context/crypto";
import { useEncryptionContext } from "@/components/context/encryption";
import { useMessageContext } from "@/components/context/message";
import { usePageContext } from "@/components/context/page";
import { useThemeContext } from "@/components/context/theme";
import { useUsersContext } from "@/components/context/users";
import { useWebSocketContext } from "@/components/context/websocket";
import ls from "@/lib/localStorageManager";

// Main
let ModsContext = createContext();

// Use Context Function
export function useModsContext() {
  let context = useContext(ModsContext);
  if (context === undefined) {
    throw new Error("useModsContext must be used within a ModsProvider");
  }
  return context;
}

// Provider
export function ModsProvider({ children }) {
  let [mods, setMods] = useState({});
  let [failed, setFailed] = useState([]);

  let callContext = useCallContext();
  let cryptoContext = useCryptoContext();
  let encryptionContext = useEncryptionContext();
  let messageContext = useMessageContext();
  let pageContext = usePageContext();
  let themeContext = useThemeContext();
  let userContext = useUsersContext();
  let webSocketContext = useWebSocketContext();

  useEffect(() => {
    if (!ls.get("mods") || ls.get("mods") === "") return;
    let mods = JSON.parse(ls.get("mods"));
    setMods(mods);
  }, []);

  useEffect(() => {
    if (!mods || mods === "") return;
    ls.set("mods", JSON.stringify(mods));
    Object.keys(mods).forEach((key) => {
      let mod = mods[key];
      if (mod.enabled) {
        try {
          let data = atob(mod.src);

          let contexts = {
            useCallContext: callContext,
            useCryptoContext: cryptoContext,
            useEncryptionContext: encryptionContext,
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

          let modCode = new Function(
            "intents",
            data.replace(data.split("\n")[0], ""),
          );

          try {
            modCode(functions);
          } catch (err) {
            setFailed((prev) => [
              ...prev, // move down to reverse order
              { name: mod.name, error: err.message },
            ]);
            console.log(
              `Failed to load [${mod.name}] [Execution]: ${err.message}`,
            );
          }
        } catch (err) {
          setFailed((prev) => [
            ...prev,
            { name: mod.name, error: err.message },
          ]);
          console.log(
            `Failed to load [${mod.name}] [Invalid Structure]: ${err.message}`,
          );
        }
      } else {
        console.log("Did not load: " + mod.name);
      }
    });
  }, [mods]);

  return (
    <ModsContext.Provider
      value={{
        mods,
        setMods,
      }}
    >
      {children}
    </ModsContext.Provider>
  );
}
