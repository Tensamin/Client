import { createContext, useContext, type ParentProps } from "solid-js";
import { createStore } from "solid-js/store";
import { useSocket } from "@tensamin/ttp/context";

import { socket as schemas } from "@tensamin/shared/data";
import type z from "zod";
import { failedUser } from "./values";

export type User = z.infer<typeof schemas.get_user_data.response>;

interface contextValue {
  get(userId: number): Promise<User>;
}

const UserContext = createContext<contextValue>();

export default function UserProvider(props: ParentProps) {
  const [storage, setStorage] = createStore<Record<number, User>>({});

  const { send } = useSocket();

  async function get(userId: number): Promise<User> {
    if (storage[userId] === undefined) {
      try {
        const userData = await send("get_user_data", { user_id: userId });

        // Temp, add base64 stuff
        userData.data.avatar = userData.data.avatar
          ? `data:image/png;base64,${userData.data.avatar}`
          : undefined;
        // Temp end

        setStorage(userId, userData.data);
      } catch {
        setStorage(userId, failedUser);
      }
    }
    return storage[userId];
  }

  return (
    <UserContext.Provider value={{ get }}>
      {props.children}
    </UserContext.Provider>
  );
}

export function useUser(): contextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
