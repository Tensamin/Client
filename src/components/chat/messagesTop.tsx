// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";

// Types
import { User } from "@/lib/types";

// Main
export function MessagesTop() {
  const { currentReceiverUuid, get } = useUserContext();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    get(currentReceiverUuid, false).then((fetchedUser) => {
      if (isMounted) setUser(fetchedUser);
    });
    return () => {
      isMounted = false;
    };
  }, [currentReceiverUuid, get]);

  return (
    <div className="relative aspect-16/2 w-2/3 flex justify-center items-end">
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-foreground">
          <p className="text-md mx-auto font-medium">
            This is the start of your conversation with {user?.display}
          </p>
        </div>
      </div>
    </div>
  );
}
