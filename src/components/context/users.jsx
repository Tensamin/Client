"use client";

// Package Imports
import React, { createContext, useContext, useEffect, useState } from "react";

// Lib Imports
import {
  log,
  getDisplayFromUsername,
  RETRIES,
  isElectron,
  safeAtob,
} from "@/lib/utils";
import { endpoint } from "@/lib/endpoints";
import ls from "@/lib/local_storage";

// Context Imports
import { useCryptoContext } from "@/components/context/crypto.jsx";

// Main
let UsersContext = createContext();

// Use Context Function
export function useUsersContext() {
  let context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error("useUsersContext must be used within a UsersProvider");
  }
  return context;
}

// Provider
export function UsersProvider({ children }) {
  let [users, setUsers] = useState({});
  let [chatsArray, setChatsArray] = useState([]);
  let [communitiesArray, setCommunitiesArray] = useState([]);
  let [forceLoad, setForceLoad] = useState(false);
  let [ownState, setOwnState] = useState("ONLINE");
  let [fetchChats, setFetchChats] = useState(true);
  let [fetchCommunities, setFetchCommunities] = useState(true);

  let { get_shared_secret, privateKey } = useCryptoContext();

  // Check for Electron
  let [usingElectron, setUsingElectron] = useState(false);
  useEffect(() => {
    let tmpIsElectron = isElectron();
    if (tmpIsElectron) {
      setUsingElectron(true);
      document.body.classList.add("rounded-xl");
    } else {
      setUsingElectron(false);
    }
  }, []);

  async function get(uuid, refetch = false, state) {
    if (users[uuid] && !refetch) {
      return users[uuid];
    }

    let newUser;

    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        await fetch(`${endpoint.user}${uuid}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.type !== "error") {
              newUser = data.data;
            }
          });
        break;
      } catch (err) {}
    }

    newUser.display = getDisplayFromUsername(newUser.username, newUser.display);
    newUser.shared_secret = await get_shared_secret(
      privateKey,
      newUser.public_key
    );
    if (typeof state !== "undefined") {
      newUser.state = state;
    }

    setUsers((prevUsers) => ({
      ...prevUsers,
      [uuid]: newUser,
    }));

    return newUser;
  }

  // clearFromCache
  // doChatRefresh
  // doCommunityRefresh

  function makeChatTop(uuid) {
    let newArray = [...chatsArray];
    let indexToMove = newArray.findIndex((item) => item.user_id === uuid);
    if (indexToMove > 0) {
      let [itemToMove] = newArray.splice(indexToMove, 1);
      newArray.unshift(itemToMove);
      setChatsArray(newArray);
    }
  }

  return (
    <UsersContext.Provider
      value={{
        get,
        users,
        usingElectron,

        ownUuid: ls.get("auth_uuid"),
        ownState,
        setOwnState,

        forceLoad,
        setForceLoad,

        chatsArray,
        setChatsArray,
        fetchChats,
        setFetchChats,
        makeChatTop,

        communitiesArray,
        setCommunitiesArray,
        fetchCommunities,
        setFetchCommunities,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}
