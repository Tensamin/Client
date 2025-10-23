// Package Imports
import React, { memo, useRef, useEffect, useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

// Lib Imports
import { InitialMessages } from "@/lib/utils";

// Context Imports
import { useMessageContext } from "@/context/message";
import { useStorageContext } from "@/context/storage";
import { useUserContext } from "@/context/user";

// Components
import { MessageGroup } from "@/components/chat/message";

// Types
import { Messages, Message } from "@/lib/types";

// Main
function flattenPages(
  data: InfiniteData<Messages, number> | undefined
): Message[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.messages);
}

type MessagesQueryKey = ["messages", "top-infinite", string];

const TOTAL_MESSAGES = 500;
const SCROLL_THRESHOLD = 48;
const BOTTOM_DISTANCE_THRESHOLD = 8;

export const Box = memo(ActualBox);

function ActualBox() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const loadingLockRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const nextIdRef = useRef(TOTAL_MESSAGES);

  const { translate } = useStorageContext();
  const { getMessages, addRealtimeMessageToBox, setAddRealtimeMessageToBox } =
    useMessageContext();
  const { currentReceiverUuid } = useUserContext();

  const queryKey = useMemo<MessagesQueryKey>(
    () => ["messages", "top-infinite", currentReceiverUuid || "0"],
    [currentReceiverUuid]
  );
  const shouldLoadMessages = currentReceiverUuid !== "0";

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
    MessagesQueryKey,
    number
  >({
    queryKey,
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
    enabled: shouldLoadMessages,
  });
  const messages = useMemo(() => flattenPages(data), [data]);

  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => 64, []);
  const getItemKey = useCallback(
    (index: number) => {
      const msg = messages[index];
      return msg?.timestamp ?? `fallback-${index}`;
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

  const isPinnedToBottom = useCallback(() => {
    const el = parentRef.current;
    if (!el) return true;

    const { scrollHeight, scrollTop, clientHeight } = el;
    const distance = scrollHeight - scrollTop - clientHeight;

    return distance <= BOTTOM_DISTANCE_THRESHOLD + 2;
  }, []);

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

  const onScroll = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      void maybeLoadOlder();
      timeoutRef.current = null;
    }, 16);
  }, [maybeLoadOlder]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    didInitialScrollRef.current = false;
    loadingLockRef.current = false;
  }, [currentReceiverUuid]);

  const addRealtimeMessage = useCallback(
    (newMsg: Message) => {
      const wasPinned = isPinnedToBottom();
      nextIdRef.current += 1;

      let newTotalLength = messages.length + 1;

      queryClient.setQueryData<InfiniteData<Messages, number>>(
        queryKey,
        (old: InfiniteData<Messages, number> | undefined) => {
          const base: InfiniteData<Messages, number> = old ?? {
            pageParams: [0],
            pages: [
              {
                messages: [newMsg],
                previous: 0,
                next: 0,
              },
            ],
          };

          const lastPageIndex = base.pages.length - 1;
          const lastPage = base.pages[lastPageIndex];
          const newPages = base.pages.slice(0, lastPageIndex);

          newPages.push({
            ...lastPage,
            messages: [...lastPage.messages, newMsg],
          });

          const prevTotal = base.pages.reduce(
            (acc, p) => acc + p.messages.length,
            0
          );
          newTotalLength = prevTotal + 1;

          return { ...base, pages: newPages };
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
    [isPinnedToBottom, queryClient, rowVirtualizer, messages.length, queryKey]
  );

  useEffect(() => {
    if (!addRealtimeMessageToBox) return;
    addRealtimeMessage(addRealtimeMessageToBox);
    setAddRealtimeMessageToBox(null);
  }, [addRealtimeMessageToBox, setAddRealtimeMessageToBox, addRealtimeMessage]);

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
      <div className="flex flex-col gap-5 h-full items-center justify-center text-sm">
        <img
          //width={220}
          //height={220}
          src="./assets/images/megamind.png"
          alt={translate("ERROR")}
          className="w-55 h-55"
        />
        <p className="text-xl">
          {translate("ERROR_CONVERSATION_LOADING_FAILED")}
        </p>
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
              key={`${virtualRow.key}-${msg.timestamp}`}
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
}
