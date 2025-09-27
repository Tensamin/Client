"use client";

// Package Imports
import { createContext, useContext, useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// Lib Imports
import { user } from "@/lib/endpoints";
import {
  AdvancedSuccessMessageData,
  Community,
  Conversation,
  ErrorType,
  User,
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
  conversations: Conversation[];
  communities: Community[];
  setConversations: (conversations: Conversation[]) => void;
  setCommunities: (communities: Community[]) => void;
  refetchConversations: () => Promise<void>;
  reloadUsers: boolean;
  setReloadUsers: (reload: boolean) => void;
};

// Main
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
  const fetchedUsersRef = useRef<Map<string, User>>(new Map());
  const prevLastMessageRef = useRef<unknown>(null);
  const { translate } = useStorageContext();
  const [currentReceiverUuid, setCurrentReceiverUuid] = useState<string>("0");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [failedMessagesAmount, setFailedMessagesAmount] = useState<number>(0);
  const [reloadUsers, setReloadUsers] = useState<boolean>(false);

  async function refetchConversations() {
    await send("get_chats").then((data) => {
      if (data.type !== "error") {
        setConversations(data.data.user_ids || []);
      } else {
        toast.error(translate("ERROR_USER_CONTEXT_GET_CONVERSATIONS"));
      }
    });
  }

  const { ownUuid } = useCryptoContext();
  const { send, isReady, lastMessage } = useSocketContext();
  const { page, pageData } = usePageContext();
  const { debugLog } = useStorageContext();

  useEffect(() => {
    if (page === "chat" && pageData !== currentReceiverUuid) {
      // Reset Receiver
      setCurrentReceiverUuid(pageData);
      setFailedMessagesAmount(0);
    }
  }, [page, pageData, currentReceiverUuid]);

  useEffect(() => {
    if (isReady && conversations.length === 0) {
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
    }
  }, [isReady, send, conversations.length, translate]);

  useEffect(() => {
    if (isReady && communities.length === 0) {
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
    }
  }, [isReady, send, communities.length, translate]);

  if (lastMessage && lastMessage !== prevLastMessageRef.current) {
    prevLastMessageRef.current = lastMessage;

    if (lastMessage.type === "client_changed") {
      const data = lastMessage.data as AdvancedSuccessMessageData;
      if (!data.user_id || !data.user_state) return null;
      get(data.user_id, true).then((user) => {
        fetchedUsersRef.current.set(user.uuid, {
          ...user,
          state: data.user_state || "NONE",
        });
      });
    }

    if (lastMessage.type === "get_states") {
      const data = lastMessage.data as AdvancedSuccessMessageData & {
        user_states: Record<string, string>;
      };

      Object.keys(data.user_states).forEach((uuid) => {
        const existingUser = fetchedUsersRef.current.get(uuid);
        let user: User;
        if (existingUser) {
          user = { ...existingUser, state: data.user_states[uuid] };
        } else {
          user = {
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
            state: data.user_states[uuid],
            loading: true,
          };
        }
        fetchedUsersRef.current.set(uuid, user);
      });
    }
  }

  async function get(uuid: string, refetch: boolean = false): Promise<User> {
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
        display: getDisplayFromUsername(data.data.username, data.data.display),
        avatar: data.data.avatar,
        about: atob(data.data.about),
        status: data.data.status,
        sub_level: data.data.sub_level,
        sub_end: data.data.sub_end,
        public_key: data.data.public_key,
        created_at: data.data.created_at,
      };

      const newUser: User = {
        ...apiUserData,
        loading: false,
        ...(existingUser ? { state: existingUser.state } : { state: "NONE" }),
      };

      fetchedUsersRef.current.set(uuid, newUser);
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
        fetchedUsersRef.current.set(uuid, failedUser);
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
  }

  return (
    <UserContext.Provider
      value={{
        get,
        ownUuid,
        currentReceiverUuid,
        failedMessagesAmount,
        setFailedMessagesAmount,
        conversations,
        communities,
        setConversations,
        setCommunities,
        refetchConversations,
        reloadUsers,
        setReloadUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
