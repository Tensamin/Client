// Package Imports
import React, { memo, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

// Lib Imports
import { InitialMessages } from "@/lib/utils";

// Context Imports
import { useMessageContext } from "@/context/message";

// Components
import { MessageGroup, Message, Messages } from "@/components/chat/message";

// Main
function flattenPages(
  data: InfiniteData<Messages, number> | undefined
): Message[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.messages);
}

const QUERY_KEY = ["messages", "top-infinite"] as const;
const SCROLL_THRESHOLD = 48;

export const Box = memo(() => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const loadingLockRef = useRef(false);
  const didInitialScrollRef = useRef(false);

  const { getMessages } = useMessageContext();

  const {
    data,
    isLoading,
    isError,
    fetchPreviousPage,
    isFetchingPreviousPage,
    hasPreviousPage,
  } = useInfiniteQuery<
    Messages,
    Error,
    InfiniteData<Messages, number>,
    typeof QUERY_KEY,
    number
  >({
    queryKey: QUERY_KEY,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      await getMessages(pageParam, InitialMessages),
    getNextPageParam: (data: Messages) => {
      if (data.messages.length === 0) return undefined;
      return data.previous;
    },
    getPreviousPageParam: (data: Messages) => data.next,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const messages = useMemo(() => flattenPages(data), [data]);

  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => 64, []);
  const getItemKey = useCallback(
    (index: number) => {
      const msg = messages[index];
      return msg?.message_time ?? `fallback-${index}`;
    },
    [messages]
  );

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement,
    estimateSize,
    overscan: 5,
    getItemKey,
  });

  const maybeLoadOlder = useCallback(async () => {
    if (loadingLockRef.current || !hasPreviousPage || isFetchingPreviousPage) {
      return;
    }
    const el = parentRef.current;
    if (!el) return;

    if (el.scrollTop > SCROLL_THRESHOLD) return;

    loadingLockRef.current = true;

    const prevScrollHeight = el.scrollHeight;

    await fetchPreviousPage();

    requestAnimationFrame(() => {
      const newScrollHeight = el.scrollHeight;
      const delta = newScrollHeight - prevScrollHeight;
      if (delta > 0) {
        el.scrollTop += delta;
      }
      loadingLockRef.current = false;
    });
  }, [fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage]);

  const onScroll = useCallback(
    useMemo(() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          void maybeLoadOlder();
        }, 16);
      };
    }, [maybeLoadOlder]),
    [maybeLoadOlder]
  );

  useEffect(() => {
    if (data && messages.length > 0 && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(messages.length - 1, { align: "end" });
        });
      });
    }
  }, [data, messages.length, rowVirtualizer]);

  {
    /*
  const addMessage = useCallback(
    (text: string) => {
      const wasPinned = isPinnedToBottom();
      nextIdRef.current += 1;
      const newMsg: Message = {
        message_time: Number(nextIdRef.current),
        message_content: text,
        message_state: "sent",
        sender_is_me: false,
      };

      let newTotalLength = messages.length + 1;

      queryClient.setQueryData<InfiniteData<Messages, number>>(
        QUERY_KEY,
        (old: any) => {
          if (!old) {
            newTotalLength = 1;
            return {
              pageParams: [0],
              pages: [{ messages: [newMsg], total: TOTAL_MESSAGES }],
            };
          }

          const lastPageIndex = old.pages.length - 1;
          const lastPage = old.pages[lastPageIndex];
          const newPages = old.pages.slice(0, lastPageIndex);

          newPages.push({
            ...lastPage,
            messages: [...lastPage.messages, newMsg],
          });

          newTotalLength =
            old.pages.reduce((acc: any, p: any) => acc + p.messages.length, 0) +
            1;

          return { ...old, pages: newPages };
        }
      );

      if (wasPinned) {
        requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(newTotalLength - 1, { align: "end" });
        });

        setTimeout(() => {
          requestAnimationFrame(() => {
            rowVirtualizer.scrollToIndex(newTotalLength - 1, { align: "end" });
          });
        }, 16);
      }
    },
    [isPinnedToBottom, queryClient, rowVirtualizer, messages.length]
  );
  */
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm">
        <Ring
          size="30"
          stroke="4"
          bgOpacity="0"
          speed="2"
          color="var(--foreground)"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-sm">
        <Image
          src="/assets/images/megamind.png"
          alt="Error"
          width={200}
          height={200}
        />
        <p className="text-xl">No successfully decrypted messages?</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto scrollbar-hide"
      onScroll={onScroll}
    >
      <div
        className="w-full relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const msg: Message = messages[virtualRow.index];
          if (!msg) return null;

          return (
            <div
              key={`${virtualRow.key}-${msg.message_time}`}
              data-index={virtualRow.index}
              className="absolute left-0 right-0 px-3 py-2"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageGroup data={msg} />
            </div>
          );
        })}
      </div>
    </div>
  );
});
