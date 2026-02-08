// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/UserContext";

// Types
import { User } from "@/lib/types";

// Main
export function MessagesTop() {
  const { currentReceiverId, get } = useUserContext();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    get(currentReceiverId, false).then((fetchedUser) => {
      if (isMounted) setUser(fetchedUser);
    });
    return () => {
      isMounted = false;
    };
  }, [currentReceiverId, get]);

  return (
    <p className="text-md mx-auto font-medium pb-10">
      This is the start of your conversation with {user?.display}
    </p>
  );
}

export default MessagesTop;
