import { useEffect, useState } from "react";

import { useUserContext } from "@/context/user";
import { fallbackUser, UserWithConversations } from "@/lib/types";

export default function Wrap({
  userId,
  component,
}: {
  userId: number;
  component: (user: UserWithConversations) => React.ReactNode;
}) {
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

  return <>{component(user)}</>;
}
