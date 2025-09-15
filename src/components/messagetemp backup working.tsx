"use client";

import * as React from "react";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

type Message = {
  id: string;
  text: string;
};

type Page = {
  items: Message[];
  total: number;
};

const TOTAL_MESSAGES = 500;

// Oldest -> Newest: 1..TOTAL_MESSAGES
const ALL_MESSAGES: Message[] = Array.from(
  { length: TOTAL_MESSAGES },
  (_, i) => ({
    id: String(i + 1),
    text: `Message ${i + 1}`,
  })
);

export async function loadMoreMessages(
  alreadyLoaded: number,
  count: number
): Promise<Page> {
  await new Promise((r) => setTimeout(r, 300));

  const endExclusive = Math.max(0, TOTAL_MESSAGES - alreadyLoaded);
  const start = Math.max(0, endExclusive - count);

  const items = ALL_MESSAGES.slice(start, endExclusive);

  return {
    items,
    total: TOTAL_MESSAGES,
  };
}

export default function ChatExample() {
  const [client] = React.useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <MessagesList />
    </QueryClientProvider>
  );
}

const PAGE_SIZE = 50;
const QUERY_KEY = ["messages", "top-infinite"] as const;

function flattenPages(data: InfiniteData<Page, number> | undefined): Message[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.items);
}

function MessagesList() {
  const parentRef = React.useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    fetchPreviousPage,
    isFetchingPreviousPage,
    hasPreviousPage,
  } = useInfiniteQuery<
    Page,
    Error,
    InfiniteData<Page, number>,
    typeof QUERY_KEY,
    number
  >({
    queryKey: QUERY_KEY,
    initialPageParam: 0, // start by loading the latest PAGE_SIZE messages
    queryFn: async ({ pageParam }) => {
      // pageParam is "alreadyLoaded"
      return loadMoreMessages(pageParam as number, PAGE_SIZE);
    },
    // We don't use forward pagination in this demo
    getNextPageParam: () => undefined,
    // When asking for "previous", we want the next older chunk.
    getPreviousPageParam: (_firstPage: Page, pages: Page[]) => {
      const total = pages[0]?.total ?? 0;
      const loaded = pages.reduce((acc, p) => acc + p.items.length, 0);
      // If we haven't loaded all TOTAL yet, return how many are loaded
      // so the fetcher can load the next older set.
      return loaded < total ? loaded : undefined;
    },
    // We want pages ordered as [older, ..., newest] so that flatten order
    // is natural (oldest at top, newest at bottom).
  });

  const messages = flattenPages(data);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // rough average row height in px
    overscan: 8,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  // Helper: are we pinned to bottom?
  const isPinnedToBottom = React.useCallback(() => {
    const el = parentRef.current;
    if (!el) return false;
    // Check if near bottom, with a small tolerance
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance < 8; // Tighter threshold
  }, []);

  // Load older when near top
  const loadingLockRef = React.useRef(false);
  const maybeLoadOlder = React.useCallback(async () => {
    if (loadingLockRef.current || !hasPreviousPage || isFetchingPreviousPage) {
      return;
    }
    const el = parentRef.current;
    if (!el) return;

    const threshold = 48;
    if (el.scrollTop > threshold) return;

    // Lock to avoid duplicate concurrent fetches
    loadingLockRef.current = true;

    // Record current scrollHeight to maintain visual position after prepend
    const prevScrollHeight = el.scrollHeight;

    // Fetch the next older page (prepends items at the top)
    await fetchPreviousPage();

    // After DOM updates, adjust scrollTop by the amount content grew
    requestAnimationFrame(() => {
      const newScrollHeight = el.scrollHeight;
      const delta = newScrollHeight - prevScrollHeight;
      if (delta > 0) {
        el.scrollTop += delta;
      }
      loadingLockRef.current = false;
    });
  }, [
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    queryClient,
    rowVirtualizer,
  ]);

  // Attach scroll listener
  const onScroll = React.useCallback(() => {
    void maybeLoadOlder();
  }, [maybeLoadOlder]);

  // On first load, scroll to the bottom
  const didInitialScrollRef = React.useRef(false);
  React.useEffect(() => {
    if (data && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      requestAnimationFrame(() => {
        const total = messages.length || 1;
        rowVirtualizer.scrollToIndex(total - 1, { align: "end" });
      });
    }
  }, [data, messages.length, rowVirtualizer]);

  // Real-time: append messages to the bottom.
  const nextIdRef = React.useRef(TOTAL_MESSAGES);
  const addRealtimeMessage = React.useCallback(
    (text: string) => {
      // Check if pinned BEFORE adding the message
      const wasPinned = isPinnedToBottom();
      nextIdRef.current += 1;
      const newMsg: Message = {
        id: String(nextIdRef.current),
        text,
      };

      queryClient.setQueryData<InfiniteData<Page, number>>(QUERY_KEY, (old) => {
        if (!old) {
          return {
            pageParams: [0],
            pages: [
              {
                items: [newMsg],
                total: TOTAL_MESSAGES,
              },
            ],
          };
        }
        const pages = [...old.pages];
        const last = pages[pages.length - 1];
        const updatedLast: Page = {
          ...last,
          items: [...last.items, newMsg],
        };
        pages[pages.length - 1] = updatedLast;
        return { ...old, pages };
      });

      if (wasPinned) {
        // Use setTimeout to ensure DOM updates have completed
        setTimeout(() => {
          const total =
            flattenPages(
              queryClient.getQueryData<InfiniteData<Page, number>>(QUERY_KEY)
            ).length || 1;
          rowVirtualizer.scrollToIndex(total - 1, { align: "end" });
        }, 0);
      }
    },
    [isPinnedToBottom, queryClient, rowVirtualizer]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-sm">
        Failed to load
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2 border-b p-2">
        <button
          className="rounded border px-2 py-1 text-sm hover:bg-zinc-50"
          onClick={() => addRealtimeMessage("New real-time message")}
        >
          Add real-time message
        </button>
        <button
          className="rounded border px-2 py-1 text-sm hover:bg-zinc-50"
          onClick={() => {
            const total = messages.length || 1;
            rowVirtualizer.scrollToIndex(total - 1, { align: "end" });
          }}
        >
          Scroll to bottom
        </button>
        {isFetchingPreviousPage && (
          <span className="ml-auto text-xs text-zinc-500">Loading older…</span>
        )}
      </div>

      <div
        ref={parentRef}
        className="h-full overflow-y-auto"
        onScroll={onScroll}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const msg = messages[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 right-0 px-3 py-2"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <MessageBubble message={msg} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className="flex w-full">
      <div className="max-w-[75%] rounded-lg bg-zinc-100 px-3 py-2 text-sm">
        <div className="text-[10px] text-zinc-500">id: {message.id}</div>
        <div className="text-zinc-900">{message.text}</div>
      </div>
    </div>
  );
}
