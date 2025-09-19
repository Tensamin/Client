"use client";

// Package Imports
import { createContext, useContext, useState, useRef, useEffect } from "react";

// Lib Imports
import { user } from "@/lib/endpoints";
import { User } from "@/lib/types";
import { log, getDisplayFromUsername } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { usePageContext } from "@/app/page";

type UserContextType = {
  get: (uuid: string, refetch: boolean) => Promise<User>;
  ownUuid: string;
  failedMessagesAmount: number;
  setFailedMessagesAmount: (amount: number) => void;
  currentReceiverUuid: string;
  conversations: any[];
  communities: any[];
  setConversations: (conversations: any[]) => void;
  setCommunities: (communities: any[]) => void;
};

const UserContext = createContext<UserContextType | null>(null);

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
  return context;
}

export function UserProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fetchedUsersRef = useRef(new Map());
  const ownUuid = localStorage.getItem("auth_uuid") || "0";
  const [currentReceiverUuid, setCurrentReceiverUuid] = useState<string>("0");
  const [conversations, setConversations] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [failedMessagesAmount, setFailedMessagesAmount] = useState<number>(0);

  const { send, isReady } = useSocketContext();
  const { page, pageData } = usePageContext();

  async function get(uuid: string, refetch: boolean = false): Promise<User> {
    try {
      if (!uuid || uuid === "0") throw new Error("Invalid UUID");
      if (fetchedUsersRef.current.has(uuid) && !refetch) {
        log("debug", "USER_CONTEXT", "USER_CONTEXT_USER_ALREADY_FETCHED");
        return fetchedUsersRef.current.get(uuid);
      } else {
        log("debug", "USER_CONTEXT", "USER_CONTEXT_USER_NOT_FETCHED");
        const newUser = await fetch(`${user}${uuid}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.type === "success") {
              const newUser: User = {
                uuid,
                username: data.data.username,
                display: getDisplayFromUsername(
                  data.data.username,
                  data.data.display
                ),
                avatar: data.data.avatar,
                about: atob(data.data.about),
                status: data.data.status,
                sub_level: data.data.sub_level,
                sub_end: data.data.sub_end,
                public_key: data.data.public_key,
                created_at: data.data.created_at,
                loading: false,
              };
              fetchedUsersRef.current.set(uuid, newUser);
              return newUser;
            }
          });
        return newUser as User;
      }
    } catch (err: any) {
      return {
        uuid: "0",
        username: "failed",
        display: "Failed to load",
        avatar: null,
        about: err.message,
        status: "",
        sub_level: 0,
        sub_end: 0,
        public_key: "",
        created_at: new Date().toISOString(),
      } as User;
    }
  }

  useEffect(() => {
    if (page === "chat" && pageData !== currentReceiverUuid) {
      // Reset Receiver
      setCurrentReceiverUuid(pageData);
      setFailedMessagesAmount(0);
    }
  }, [currentReceiverUuid, page, pageData]);

  useEffect(() => {
    if (isReady) {
      send(
        "get_chats",
        {
          log_level: 0,
          message: "USER_CONTEXT_GET_CONVERSATIONS",
        },
        {} as JSON
      ).then((data) => {
        if (data.type !== "error") {
          setConversations(data.data.user_ids);
        } else {
          log(
            "error",
            "USER_CONTEXT",
            "ERROR_USER_CONTEXT_GET_CONVERSATIONS",
            data.message
          );
        }
      });
      send(
        "get_communities",
        {
          log_level: 0,
          message: "USER_CONTEXT_GET_COMMUNITIES",
        },
        {} as JSON
      ).then((data) => {
        if (data.type !== "error") {
          setCommunities(data.data.communities);
        } else {
          log(
            "error",
            "USER_CONTEXT",
            "ERROR_USER_CONTEXT_GET_COMMUNITIES",
            data.message
          );
        }
      });
    }
  }, [send, isReady]);

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
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
