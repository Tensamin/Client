"use client";

// Package Imports
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Lib Imports
import {
  getDisplayFromUsername,
  RETRIES,
  isElectron,
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

  let get = useCallback(async (uuid, refetch = false) => {
    let mounted = true;
    if (!mounted) return { loading: true };
    if (uuid === "...") return { loading: true };
    if (users[uuid] && !refetch) {
      if (Object.keys(users[uuid]).length === 1) {
        return { loading: true };
      } else {
        return users[uuid];
      }
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
      } catch {}
    }

    newUser.display = getDisplayFromUsername(newUser.username, newUser.display);
    let sharedSecret = await get_shared_secret(privateKey, newUser.public_key);
    newUser.shared_secret = sharedSecret.sharedSecretHex;

    setUsers((prevUsers) => ({
      ...prevUsers,
      [uuid]: { ...prevUsers[uuid], ...newUser },
    }));

    return newUser;
  });

  async function updateState(uuid, value) {
    if (!users[uuid]) await get(uuid, true);

    let updatedUser = { ...users[uuid], state: value };
    setUsers((prevUsers) => ({
      ...prevUsers,
      [uuid]: updatedUser,
    }));
  }

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
        updateState,
        users,
        usingElectron,

        ownUuid: ls.get("auth_uuid"),

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
