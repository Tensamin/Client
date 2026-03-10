import { createVirtualizer } from "@tanstack/solid-virtual";
import { useInfiniteQuery } from "@tanstack/solid-query";
import { useChat } from "./context";
import { createEffect, createMemo, createSignal, For } from "solid-js";

import InputComponent from "./components/input";
import Message from "./components/message";

const PAGE_SIZE = 50;

export default function Screen() {
  const { getMessages, liveMessages, clearLiveMessages, userId } = useChat();

  // eslint-disable-next-line no-unassigned-vars
  let scrollRef!: HTMLDivElement;

  const [hasScrolledToBottomInitially, setHasScrolledToBottomInitially] =
    createSignal(false);
  const [lastLiveMessageCount, setLastLiveMessageCount] = createSignal(0);
  const [prependAnchor, setPrependAnchor] = createSignal<{
    totalSize: number;
    scrollTop: number;
  } | null>(null);

  const messagesQuery = useInfiniteQuery(() => ({
    queryKey: ["chat-messages", String(userId())],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getMessages(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }

      return allPages.length * PAGE_SIZE;
    },
  }));

  const historicalMessages = createMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return [...pages].reverse().flat();
  });

  createEffect(() => {
    userId();
    clearLiveMessages();
    setHasScrolledToBottomInitially(false);
    setLastLiveMessageCount(0);
    setPrependAnchor(null);
  });

  const messages = createMemo(() => [
    ...historicalMessages(),
    ...liveMessages(),
  ]);

  async function onScroll() {
    if (!scrollRef) {
      return;
    }

    if (scrollRef.scrollTop > 96) {
      return;
    }

    if (messagesQuery.isFetchingNextPage || !messagesQuery.hasNextPage) {
      return;
    }

    setPrependAnchor({
      totalSize: virtualizer.getTotalSize(),
      scrollTop: scrollRef.scrollTop,
    });

    await messagesQuery.fetchNextPage();
  }

  const virtualizer = createVirtualizer({
    get count() {
      return messages().length;
    },
    getScrollElement: () => scrollRef,
    estimateSize: (index) => {
      const message = messages()[index];

      if (!message) {
        return 56;
      }

      let decodedContent = message.content;
      try {
        decodedContent = atob(message.content);
      } catch {
        /* noop */
      }

      const lineCount = decodedContent.split("\n").length;
      const wrappedLineCount = Math.ceil(decodedContent.length / 42);
      const fileCount = message.files?.length ?? 0;

      return 28 + Math.max(lineCount, wrappedLineCount) * 20 + fileCount * 20;
    },
    overscan: 6,
  });

  createEffect(() => {
    const currentMessages = messages();

    if (
      !scrollRef ||
      hasScrolledToBottomInitially() ||
      currentMessages.length === 0
    ) {
      return;
    }

    queueMicrotask(() => {
      if (!scrollRef) {
        return;
      }

      scrollRef.scrollTop = scrollRef.scrollHeight;
      setHasScrolledToBottomInitially(true);
    });
  });

  createEffect(() => {
    const count = liveMessages().length;

    if (!scrollRef) {
      return;
    }

    if (count > lastLiveMessageCount()) {
      queueMicrotask(() => {
        if (!scrollRef) {
          return;
        }

        scrollRef.scrollTop = scrollRef.scrollHeight;
      });
    }

    setLastLiveMessageCount(count);
  });

  createEffect(() => {
    const anchor = prependAnchor();

    if (!scrollRef || !anchor || messagesQuery.isFetchingNextPage) {
      return;
    }

    queueMicrotask(() => {
      if (!scrollRef) {
        return;
      }

      const delta = virtualizer.getTotalSize() - anchor.totalSize;
      scrollRef.scrollTop = anchor.scrollTop + delta;
      setPrependAnchor(null);
    });
  });

  return (
    <div class="w-full h-full flex flex-col overflow-hidden px-2">
      <div
        ref={scrollRef}
        id="chat_container"
        class={`flex-1 max-h-[calc(100vh-151px)] overflow-y-auto px-2.5`}
        onScroll={onScroll}
      >
        <div
          class="relative w-full"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          <For each={virtualizer.getVirtualItems()}>
            {(virtualRow) => (
              <div
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  padding: "4px 0",
                }}
              >
                <Message
                  message={messages()[virtualRow.index]}
                  notEncrypted={messages()[virtualRow.index].not_encrypted}
                />
              </div>
            )}
          </For>
        </div>
      </div>
      <InputComponent />
    </div>
  );
}
