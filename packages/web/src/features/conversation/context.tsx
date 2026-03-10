import {
  createContext,
  createEffect,
  useContext,
  type ParentProps,
} from "solid-js";
import { createStore } from "solid-js/store";
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

const ConversationContext = createContext<contextValue>();

export default function ConversationProvider(props: ParentProps) {
  const [conversations, setConversations] = createStore<Conversation[]>([]);
  const [communities, setCommunities] = createStore<Community[]>([]);

  const { send } = useSocket();

  createEffect(() => {
    send("get_chats", {})
      .then((data) => {
        setConversations(data.data.user_ids);
      })
      .catch(() => {
        toast("error", "Failed to load conversations");
      });
    send("get_communities", {})
      .then((data) => {
        setCommunities(data.data.communities);
      })
      .catch(() => {
        toast("error", "Failed to load communities");
      });
  });

  return (
    <ConversationContext.Provider value={{ conversations, communities }}>
      {props.children}
    </ConversationContext.Provider>
  );
}

export function useConversation(): contextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversation must be used within a ConversationProvider",
    );
  }
  return context;
}
