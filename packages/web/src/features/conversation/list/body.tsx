import { createSignal, For, Show } from "solid-js";
import { useConversation } from "../context";
import { createVirtualizer } from "@tanstack/solid-virtual";

import Switch from "./switch";
import ConversationModal from "../modal/conversation";
import CommunityModal from "../modal/community";

export default function List() {
  const [category, setCategory] = createSignal<"conversations" | "communities">(
    "conversations",
  );

  const { conversations, communities } = useConversation();

  // eslint-disable-next-line no-unassigned-vars
  let scrollRef!: HTMLDivElement;

  const virtualizer = createVirtualizer({
    get count() {
      return category() === "conversations"
        ? conversations.length
        : communities.length;
    },
    estimateSize: () => 80,
    getScrollElement: () => scrollRef,
  });

  return (
    <div class="flex flex-col gap-3">
      <Switch category={category()} setCategory={setCategory} />
      <div
        ref={scrollRef}
        id="conversation-list"
        class="overflow-y-auto flex-1"
      >
        <div
          class="relative w-full flex flex-col gap-2"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          <For each={virtualizer.getVirtualItems()}>
            {(virtualItem) => {
              return (
                <Show
                  when={category() === "conversations"}
                  fallback={
                    <CommunityModal
                      community={communities[virtualItem.index]}
                    />
                  }
                >
                  <ConversationModal
                    userId={conversations[virtualItem.index].user_id}
                  />
                </Show>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
