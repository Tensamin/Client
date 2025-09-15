"use client";

import { createContext, useContext, useEffect, useRef } from "react";

import { user } from "@/lib/endpoints";
import { User } from "@/lib/types";
import { log, getDisplayFromUsername } from "@/lib/utils";

type UserContextType = {
  get: (uuid: string, refetch: boolean) => Promise<User>;
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

  return (
    <UserContext.Provider
      value={{
        get,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
