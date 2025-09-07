"use client";

// Package Imports
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Lib Imports
import { getDisplayFromUsername, RETRIES, isElectron } from "@/lib/utils";
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
  let { get_shared_secret, privateKey } = useCryptoContext();
  let [users, setUsers] = useState({});
  let [chatsArray, setChatsArray] = useState([]);
  let [communitiesArray, setCommunitiesArray] = useState([]);
  let [forceLoad, setForceLoad] = useState(false);
  let [fetchChats, setFetchChats] = useState(true);
  let [fetchCommunities, setFetchCommunities] = useState(true);
  let fetchCacheRef = useRef(new Map());
  let usersRef = useRef(users);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  let get = useCallback(
    async (uuid, refetch = false) => {
      if (uuid === "..." || !uuid) return { loading: true };

      let currentUsers = usersRef.current;

      if (currentUsers[uuid] && !refetch) {
        if (Object.keys(currentUsers[uuid]).length === 1) {
        } else {
          return currentUsers[uuid];
        }
      }

      if (fetchCacheRef.current.has(uuid) && !refetch) {
        return fetchCacheRef.current.get(uuid);
      }

      let fetchPromise = (async () => {
        try {
          let newUser = null;

          for (let attempt = 0; attempt <= RETRIES; attempt++) {
            try {
              let controller = new AbortController();
              let timeoutId = setTimeout(() => controller.abort(), 5000);

              let response = await fetch(`${endpoint.user}${uuid}`, {
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              let data = await response.json();
              if (data.type !== "error") {
                newUser = data.data;
                break;
              }
            } catch (error) {
              console.warn(
                `Failed to fetch user ${uuid} (attempt ${attempt + 1}/${RETRIES + 1}):`,
                error
              );

              if (attempt === RETRIES) {
                return { loading: true };
              }

              if (attempt < RETRIES) {
                await new Promise((resolve) =>
                  setTimeout(resolve, Math.pow(2, attempt) * 1000)
                );
              }
            }
          }

          if (!newUser) {
            return { loading: true };
          }

          newUser.display = getDisplayFromUsername(
            newUser.username,
            newUser.display
          );

          let sharedSecret = await get_shared_secret(
            privateKey,
            newUser.public_key
          );
          newUser.shared_secret = sharedSecret.sharedSecretHex;

          setUsers((prevUsers) => ({
            ...prevUsers,
            [uuid]: newUser,
          }));

          return newUser;
        } finally {
          fetchCacheRef.current.delete(uuid);
        }
      })();

      fetchCacheRef.current.set(uuid, fetchPromise);

      return fetchPromise;
    },
    [privateKey, get_shared_secret]
  );

  let updateState = useCallback(
    async (uuid, value) => {
      let user = await get(uuid, false);

      if (user && !user.loading) {
        setUsers((prevUsers) => ({
          ...prevUsers,
          [uuid]: { ...prevUsers[uuid], state: value },
        }));
      }
    },
    [get]
  );

  let makeChatTop = useCallback((uuid) => {
    setChatsArray((prevArray) => {
      let newArray = [...prevArray];
      let indexToMove = newArray.findIndex((item) => item.user_id === uuid);
      if (indexToMove > 0) {
        let [itemToMove] = newArray.splice(indexToMove, 1);
        newArray.unshift(itemToMove);
      }
      return newArray;
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      fetchCacheRef.current.clear();
    };
  }, []);

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

  let contextValue = React.useMemo(
    () => ({
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
    }),
    [
      get,
      updateState,
      users,
      usingElectron,
      forceLoad,
      chatsArray,
      fetchChats,
      makeChatTop,
      communitiesArray,
      fetchCommunities,
    ]
  );

  return (
    <UsersContext.Provider value={contextValue}>
      {children}
    </UsersContext.Provider>
  );
}
