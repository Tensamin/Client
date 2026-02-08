/**
 * UserDataLoader component
 * Wraps components that need user data, handling loading states
 *
 * Renamed from Wrap.tsx for clarity
 */

import { useEffect, useState } from "react";

import { useUserContext } from "@/context/UserContext";
import { fallbackUser, UserWithConversations } from "@/lib/types";

export interface UserDataLoaderProps {
  userId: number;
  children?: (user: UserWithConversations) => React.ReactNode;
  /** @deprecated Use children prop instead */
  component?: (user: UserWithConversations) => React.ReactNode;
}

export default function UserDataLoader({
  userId,
  children,
  component,
}: UserDataLoaderProps) {
  const { get, conversations } = useUserContext();
  const [user, setUser] = useState<UserWithConversations>({
    data: fallbackUser,
  });

  useEffect(() => {
    get(userId, false).then((rawUser) => {
      const fullUser = {
        conversation: conversations.filter((c) => c.user_id === userId)[0],
        data: rawUser,
      };
      setUser(fullUser);
    });
  }, [userId, get, conversations]);

  // Support both new and legacy API
  const render = children ?? component;
  if (!render) {
    return null;
  }

  return <>{render(user)}</>;
}

// Legacy export name for backwards compatibility
export { UserDataLoader as Wrap };
