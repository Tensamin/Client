"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
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

  let get = useCallback(
    async (uuid, refetch = false, state = undefined) => {
      if (uuid === "..." || !uuid) return { loading: true };

      return new Promise((resolve) => {
        setUsers((currentUsers) => {
          // Check existing
          if (
            currentUsers[uuid] &&
            !refetch &&
            Object.keys(currentUsers[uuid]).length > 1
          ) {
            // If state is provided, update the existing user with the state
            if (state !== undefined) {
              const updatedUser = { ...currentUsers[uuid], state };
              resolve(updatedUser);
              return {
                ...currentUsers,
                [uuid]: updatedUser,
              };
            }
            resolve(currentUsers[uuid]);
            return currentUsers;
          }

          // Check cache
          if (fetchCacheRef.current.has(uuid) && !refetch) {
            resolve(fetchCacheRef.current.get(uuid));
            return currentUsers;
          }

          // Fetch user
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

              // Set the state if provided
              if (state !== undefined) {
                newUser.state = state;
              }

              setUsers((prevUsers) => ({
                ...prevUsers,
                [uuid]: newUser,
              }));

              return newUser;
            } finally {
              fetchCacheRef.current.delete(uuid);
            }
          })();

          // Add to cache
          fetchCacheRef.current.set(uuid, fetchPromise);
          resolve(fetchPromise);

          return currentUsers;
        });
      });
    },
    [privateKey, get_shared_secret]
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

  // Clear cache on umount
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

  let contextValue = useMemo(
    () => ({
      get,
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
