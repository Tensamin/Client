import * as React from "react";
import { useSocket } from "@tensamin/ttp/context";

import { toast } from "@tensamin/shared/log";
import type {
  Community,
  Conversation,
} from "@tensamin/shared/features/conversation/schema";

interface contextValue {
  conversations: Conversation[];
  communities: Community[];
}

const ConversationContext = React.createContext<contextValue | undefined>(
  undefined,
);

/**
 * Executes ConversationProvider.
 * @param props Parameter props.
 * @returns unknown.
 */
export default function ConversationProvider(props: {
  children: React.ReactNode;
}) {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [communities, setCommunities] = React.useState<Community[]>([]);

  const { send } = useSocket();

  React.useEffect(() => {
    let active = true;

    send("get_conversations", {})
      .then((data) => {
        if (active) {
          setConversations(data.data.user_ids);
        }
      })
      .catch(() => {
        toast("error", "Failed to load conversations");
      });

    send("get_communities", {})
      .then((data) => {
        if (active) {
          setCommunities(data.data.communities);
        }
      })
      .catch(() => {
        toast("error", "Failed to load communities");
      });

    return () => {
      active = false;
    };
  }, [send]);

  const value = React.useMemo(
    () => ({ conversations, communities }),
    [communities, conversations],
  );

  return (
    <ConversationContext.Provider value={value}>
      {props.children}
    </ConversationContext.Provider>
  );
}

/**
 * Executes useConversation.
 * @param none This function has no parameters.
 * @returns contextValue.
 */
export function useConversation(): contextValue {
  const context = React.useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversation must be used within a ConversationProvider",
    );
  }
  return context;
}
