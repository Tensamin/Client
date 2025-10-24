"use client";

// Package Imports
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";

// Lib Imports
import { user } from "@/lib/endpoints";
import {
  AdvancedSuccessMessageData,
  Community,
  Conversation,
  ErrorType,
  User,
  UserState,
  StoredUser,
} from "@/lib/types";
import { getDisplayFromUsername } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { usePageContext } from "@/context/page";
import { useCryptoContext } from "@/context/crypto";
import { useStorageContext } from "@/context/storage";

// Types
type UserContextType = {
  get: (uuid: string, refetch: boolean) => Promise<User>;
  ownUuid: string;
  failedMessagesAmount: number;
  setFailedMessagesAmount: (amount: number) => void;
  currentReceiverUuid: string;
  currentReceiverSharedSecret: string;
  conversations: Conversation[];
  communities: Community[];
  setConversations: (conversations: Conversation[]) => void;
  setCommunities: (communities: Community[]) => void;
  refetchConversations: () => Promise<void>;
  reloadUsers: boolean;
  setReloadUsers: (reload: boolean) => void;
  doCustomEdit: (uuid: string, user: User) => void;
  fetchedUsers: Map<string, User>;
  ownState: UserState;
  setOwnState: (state: UserState) => void;
};

// Main
let chatsFetched = false;
let communitiesFetched = false;

const UserContext = createContext<UserContextType | null>(null);

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function UserProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [fetchedUsers, setFetchedUsers] = useState<Map<string, User>>(
    new Map()
  );
  const fetchedUsersRef = useRef(fetchedUsers);
  const prevLastMessageRef = useRef<unknown>(null);

  const {
    translate,
    debugLog,
    offlineData,
    addOfflineUser,
    setOfflineCommunities,
    setOfflineConversations,
  } = useStorageContext();
  const { ownUuid, get_shared_secret, privateKey } = useCryptoContext();
  const { send, isReady, lastMessage, initialUserState } = useSocketContext();
  const { page, pageData } = usePageContext();

  const [currentReceiverUuid, setCurrentReceiverUuid] = useState<string>("0");
  const [currentReceiverSharedSecret, setCurrentReceiverSharedSecret] =
    useState<string>("0");
  const [conversations, setConversations] = useState<Conversation[]>(
    offlineData.storedConversations
  );
  const [communities, setCommunities] = useState<Community[]>(
    offlineData.storedCommunities
  );
  const [failedMessagesAmount, setFailedMessagesAmount] = useState<number>(0);
  const [reloadUsers, setReloadUsers] = useState<boolean>(false);
  const [ownState, setOwnState] = useState<UserState>(initialUserState);

  useEffect(() => {
    setOfflineConversations(conversations);
  }, [conversations, setOfflineConversations]);

  useEffect(() => {
    setOfflineCommunities(communities);
  }, [communities, setOfflineCommunities]);

  useEffect(() => {
    fetchedUsersRef.current = fetchedUsers;
  }, [fetchedUsers]);

  const updateFetchedUsers = useCallback(
    (updater: (next: Map<string, User>) => void) => {
      setFetchedUsers((prev) => {
        const next = new Map(prev);
        updater(next);
        fetchedUsersRef.current = next;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    updateFetchedUsers((draft) => {
      offlineData.storedUsers.forEach((offlineUser: StoredUser) => {
        draft.set(offlineUser.user.uuid, offlineUser.user);
      });
    });
  }, [offlineData, updateFetchedUsers]);

  const get = useCallback(
    async (uuid: string, refetch: boolean = false): Promise<User> => {
      try {
        if (!uuid || uuid === "0") {
          throw new Error("ERROR_USER_CONTEXT_GET_NO_USER_ID");
        }

        const hasUser = fetchedUsersRef.current.has(uuid);
        const existingUser = hasUser
          ? fetchedUsersRef.current.get(uuid)
          : undefined;
        const shouldFetch =
          refetch || !hasUser || !!(existingUser && existingUser.loading);

        if (hasUser && !shouldFetch) {
          debugLog("USER_CONTEXT", "USER_CONTEXT_USER_ALREADY_FETCHED");
          return existingUser!;
        }

        setReloadUsers(true);
        debugLog("USER_CONTEXT", "USER_CONTEXT_USER_NOT_FETCHED");
        const response = await fetch(`${user}${uuid}`);
        const data = await response.json();

        if (data.type !== "success") {
          throw new Error(`API error: ${data.message || "Unknown error"}`);
        }

        const apiUserData: Omit<User, "state" | "loading"> = {
          uuid,
          username: data.data.username,
          display: getDisplayFromUsername(
            data.data.username,
            data.data.display
          ),
          avatar: data.data.avatar,
          about: data.data.about,
          status: data.data.status,
          sub_level: data.data.sub_level,
          sub_end: data.data.sub_end,
          public_key: data.data.public_key,
          created_at: data.data.created_at,
        };

        const latest = fetchedUsersRef.current.get(uuid);
        const newUser: User = {
          ...(latest ?? { state: "NONE", loading: true }),
          ...apiUserData,
          loading: false,
        };

        updateFetchedUsers((draft) => {
          draft.set(uuid, newUser);
        });
        addOfflineUser(newUser);
        return newUser;
      } catch (err: unknown) {
        const error = err as ErrorType;

        const currentExisting = fetchedUsersRef.current.get(uuid);
        if (currentExisting) {
          const failedUser: User = {
            ...currentExisting,
            about: error.message,
            loading: false,
          };
          updateFetchedUsers((draft) => {
            draft.set(uuid, failedUser);
          });
          return failedUser;
        }

        return {
          uuid: "0",
          username: "failed",
          display: "Failed to load",
          avatar: null,
          about: error.message,
          status: "",
          sub_level: 0,
          sub_end: 0,
          public_key: "",
          created_at: new Date().toISOString(),
          state: "NONE",
          loading: false,
        } as User;
      }
    },
    [debugLog, addOfflineUser, updateFetchedUsers]
  );

  const refetchConversations = useCallback(async () => {
    await send("get_chats").then((data) => {
      if (data.type !== "error") {
        setConversations(data.data.user_ids || []);
      } else {
        toast.error(translate("ERROR_USER_CONTEXT_GET_CONVERSATIONS"));
      }
    });
  }, [send, translate]);

  useEffect(() => {
    if (page === "chat" && pageData !== currentReceiverUuid) {
      // Reset Receiver
      setCurrentReceiverUuid(pageData);
      get(pageData).then((otherUser) => {
        get(ownUuid).then((ownUser) => {
          get_shared_secret(
            privateKey,
            ownUser.public_key,
            otherUser.public_key
          ).then((sharedSecret) => {
            if (!sharedSecret.success) {
              toast.error(translate(sharedSecret.message));
              return;
            }
            setCurrentReceiverSharedSecret(sharedSecret.message);
          });
        });
      });
      setFailedMessagesAmount(0);
    }
  }, [
    page,
    pageData,
    currentReceiverUuid,
    get,
    get_shared_secret,
    ownUuid,
    privateKey,
    translate,
  ]);

  useEffect(() => {
    if (!isReady || chatsFetched) return;
    chatsFetched = true;

    send("get_chats").then((data) => {
      if (data.type !== "error") {
        setConversations(data.data.user_ids || []);
      } else {
        setConversations([
          {
            user_id: "0",
            call_active: false,
            last_message_at: 0,
          },
        ]);
        toast.error(translate("ERROR_USER_CONTEXT_GET_CONVERSATIONS"));
      }
    });
  }, [isReady, send, translate]);

  useEffect(() => {
    if (!isReady || communitiesFetched) return;
    communitiesFetched = true;

    send("get_communities").then((data) => {
      if (data.type !== "error") {
        setCommunities(data.data.communities || []);
      } else {
        setCommunities([
          {
            community_address: "error",
            community_title: translate("ERROR_USER_CONTEXT_GET_COMMUNITIES"),
            position: "0",
          },
        ]);
        toast.error(translate("ERROR_USER_CONTEXT_GET_COMMUNITIES"));
      }
    });
  }, [isReady, send, translate]);

  useEffect(() => {
    if (!lastMessage || lastMessage === prevLastMessageRef.current) return;
    prevLastMessageRef.current = lastMessage;

    if (lastMessage.type === "client_changed") {
      const data = lastMessage.data as AdvancedSuccessMessageData;
      if (!data.user_id || !data.user_state) return;
      get(data.user_id, true).then((user) => {
        updateFetchedUsers((draft) => {
          draft.set(user.uuid, {
            ...user,
            state: data.user_state || "NONE",
          });
        });
      });
    }

    if (lastMessage.type === "get_states") {
      const data = lastMessage.data as AdvancedSuccessMessageData & {
        user_states: Record<string, string>;
      };

      updateFetchedUsers((draft) => {
        Object.entries(data.user_states).forEach(([uuid, nextState]) => {
          const existingUser = draft.get(uuid);
          if (existingUser) {
            draft.set(uuid, { ...existingUser, state: nextState });
            return;
          }

          draft.set(uuid, {
            uuid,
            username: uuid,
            display: uuid,
            avatar: null,
            about: "",
            status: "",
            sub_level: 0,
            sub_end: 0,
            public_key: "",
            created_at: new Date().toISOString(),
            state: nextState,
            loading: true,
          });
        });
      });
    }
  }, [get, lastMessage, updateFetchedUsers]);

  const doCustomEdit = useCallback(
    (uuid: string, user: User) => {
      const newUser = {
        ...user,
        display: getDisplayFromUsername(user.username, user.display),
      };
      updateFetchedUsers((draft) => {
        draft.set(uuid, newUser);
      });
    },
    [updateFetchedUsers]
  );

  return (
    <UserContext.Provider
      value={{
        get,
        ownUuid,
        currentReceiverUuid,
        currentReceiverSharedSecret,
        failedMessagesAmount,
        setFailedMessagesAmount,
        conversations,
        communities,
        setConversations,
        setCommunities,
        refetchConversations,
        reloadUsers,
        setReloadUsers,
        doCustomEdit,
        fetchedUsers,
        ownState,
        setOwnState,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
