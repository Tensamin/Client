import * as React from "react";
import { useSocket } from "@tensamin/ttp/context";

import { socket as schemas } from "@tensamin/shared/data";
import type z from "zod";
import { failedUser } from "./values";

export type User = z.infer<typeof schemas.get_user_data.response>;

interface contextValue {
  get(userId: number): Promise<User>;
}

const UserContext = React.createContext<contextValue | undefined>(undefined);

export default function UserProvider(props: { children: React.ReactNode }) {
  const storageRef = React.useRef<Record<number, User>>({});

  const { send } = useSocket();

  async function get(userId: number): Promise<User> {
    if (storageRef.current[userId] === undefined) {
      try {
        const userData = await send("get_user_data", { user_id: userId });

        // Temp, add base64 stuff
        userData.data.avatar = userData.data.avatar
          ? `data:image/png;base64,${userData.data.avatar}`
          : undefined;
        // Temp end

        storageRef.current[userId] = userData.data;
      } catch {
        storageRef.current[userId] = failedUser;
      }
    }
    return storageRef.current[userId];
  }

  return (
    <UserContext.Provider value={{ get }}>
      {props.children}
    </UserContext.Provider>
  );
}

export function useUser(): contextValue {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
