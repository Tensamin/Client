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
const PAGE_SIZE = 50;
const QUERY_KEY = ["messages", "top-infinite"] as const;
const SCROLL_THRESHOLD = 48;
const BOTTOM_DISTANCE_THRESHOLD = 8;

// Optimized constant data - created once at module level
const ALL_MESSAGES: readonly Message[] = Array.from(
  { length: TOTAL_MESSAGES },
  (_, i) => ({
    id: String(i + 1),
    text: `Message ${i + 1}`,
  })
);

// Optimized with better performance and reduced calculations
export async function loadMoreMessages(
  alreadyLoaded: number,
  count: number
): Promise<Page> {
  // Simulate network delay - reduced from 300ms to 100ms for better UX
  await new Promise((r) => setTimeout(r, 100));

  const endExclusive = TOTAL_MESSAGES - alreadyLoaded;
  const start = Math.max(0, endExclusive - count);

  // Use a more efficient slice operation
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

// Optimized function for better performance
function flattenPages(data: InfiniteData<Page, number> | undefined): Message[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.items);
}

// Optimized MessagesList with better performance
const MessagesList = React.memo(() => {
  const parentRef = React.useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const loadingLockRef = React.useRef(false);
  const didInitialScrollRef = React.useRef(false);
  const nextIdRef = React.useRef(TOTAL_MESSAGES);

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
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => loadMoreMessages(pageParam, PAGE_SIZE),
    getNextPageParam: () => undefined,
    getPreviousPageParam: (_firstPage: Page, pages: Page[]) => {
      const total = pages[0]?.total ?? 0;
      const loaded = pages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < total ? loaded : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Memoize messages to prevent unnecessary recalculations
  const messages = React.useMemo(() => flattenPages(data), [data]);

  // Fixed virtualizer configuration to prevent flashing
  const getScrollElement = React.useCallback(() => parentRef.current, []);
  const estimateSize = React.useCallback(() => 64, []);
  const getItemKey = React.useCallback((index: number) => {
    const msg = messages[index];
    return msg?.id ?? `fallback-${index}`;
  }, [messages]);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement,
    estimateSize,
    overscan: 5,
    getItemKey,
    // Remove measureElement to prevent re-measurements causing flashing
  });

  // Improved bottom detection with better reliability
  const isPinnedToBottom = React.useCallback(() => {
    const el = parentRef.current;
    if (!el) return true; // Default to true if no element (safer for new messages)
    
    const { scrollHeight, scrollTop, clientHeight } = el;
    const distance = scrollHeight - scrollTop - clientHeight;
    
    // More lenient threshold to catch edge cases
    return distance <= BOTTOM_DISTANCE_THRESHOLD + 2;
  }, []);

  // Load older when near top - optimized callback
  const maybeLoadOlder = React.useCallback(async () => {
    if (loadingLockRef.current || !hasPreviousPage || isFetchingPreviousPage) {
      return;
    }
    const el = parentRef.current;
    if (!el) return;

    if (el.scrollTop > SCROLL_THRESHOLD) return;

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
  }, [fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage]);

  // Optimized scroll listener with throttling
  const onScroll = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          void maybeLoadOlder();
        }, 16); // ~60fps throttling
      };
    }, [maybeLoadOlder]),
    [maybeLoadOlder]
  );

  // Optimized initial scroll - only run once when data is available
  React.useEffect(() => {
    if (data && messages.length > 0 && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      // Use double requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(messages.length - 1, { align: "end" });
        });
      });
    }
  }, [data, messages.length, rowVirtualizer]);

  // Real-time: append messages to the bottom - fixed scroll behavior
  const addRealtimeMessage = React.useCallback(
    (text: string) => {
      const wasPinned = isPinnedToBottom();
      nextIdRef.current += 1;
      const newMsg: Message = {
        id: String(nextIdRef.current),
        text,
      };

      let newTotalLength = messages.length + 1;

      // Optimized query data update with better performance
      queryClient.setQueryData<InfiniteData<Page, number>>(QUERY_KEY, (old) => {
        if (!old) {
          newTotalLength = 1;
          return {
            pageParams: [0],
            pages: [{ items: [newMsg], total: TOTAL_MESSAGES }],
          };
        }
        
        // More efficient array operations
        const lastPageIndex = old.pages.length - 1;
        const lastPage = old.pages[lastPageIndex];
        const newPages = old.pages.slice(0, lastPageIndex);
        
        newPages.push({
          ...lastPage,
          items: [...lastPage.items, newMsg],
        });
        
        // Calculate accurate new length
        newTotalLength = old.pages.reduce((acc, p) => acc + p.items.length, 0) + 1;
        
        return { ...old, pages: newPages };
      });

      // Improved scroll-to-bottom with multiple timing strategies
      if (wasPinned) {
        // Strategy 1: Immediate attempt
        requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(newTotalLength - 1, { align: "end" });
        });
        
        // Strategy 2: Delayed attempt for reliability (in case virtualizer needs time)
        setTimeout(() => {
          requestAnimationFrame(() => {
            rowVirtualizer.scrollToIndex(newTotalLength - 1, { align: "end" });
          });
        }, 16); // One frame delay
      }
    },
    [isPinnedToBottom, queryClient, rowVirtualizer, messages.length]
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
            if (messages.length > 0) {
              // Use setTimeout to ensure DOM is updated
              setTimeout(() => {
                requestAnimationFrame(() => {
                  rowVirtualizer.scrollToIndex(messages.length - 1, { align: "end" });
                });
              }, 0);
            }
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
            if (!msg) return null; // Guard against undefined messages
            
            return (
              <div
                key={`${virtualRow.key}-${msg.id}`} // More stable key combining virtualRow key and message id
                data-index={virtualRow.index}
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
});

// Heavily optimized MessageBubble with custom comparison
const MessageBubble = React.memo(
  ({ message }: { message: Message }) => {
    return (
      <div className="flex w-full">
        <div className="max-w-[75%] rounded-lg bg-zinc-100 px-3 py-2 text-sm">
          <div className="text-[10px] text-zinc-500">id: {message.id}</div>
          <div className="text-zinc-900">{message.text}</div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.text === nextProps.message.text
    );
  }
);
