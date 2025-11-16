// Package Imports
import { useRef, useEffect, useCallback, useMemo, useEffectEvent } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

// Lib Imports
import { InitialMessages } from "@/lib/utils";

// Context Imports
import { useMessageContext } from "@/context/message";
import { useStorageContext } from "@/context/storage";
import { useUserContext } from "@/context/user";

// Components
import { MessageGroup as MessageGroupComponent } from "@/components/chat/message";
import { DelayedLoadingIcon } from "@/components/loading";

// Types
import {
  Messages,
  Message,
  MessageGroup as MessageGroupType,
} from "@/lib/types";

const GROUP_WINDOW_MS = 60 * 1000;

// Main
function flattenPages(
  data: InfiniteData<Messages, number> | undefined
): MessageGroupType[] {
  if (!data) return [];
  const orderedPages = [...data.pages].reverse();
  return orderedPages.flatMap((p) => p.messages);
}

type MessagesQueryKey = ["messages", "top-infinite", string];

const TOTAL_MESSAGES = 500;
const SCROLL_THRESHOLD = 48;
const BOTTOM_DISTANCE_THRESHOLD = 8;

export function Box() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const nextIdRef = useRef(TOTAL_MESSAGES);
  const isInitialLoadRef = useRef(true);
  const scrollMetaRef = useRef<{
    prevScrollHeight: number;
    prevScrollTop: number;
    prevOffset: number;
  } | null>(null);

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
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    isSuccess,
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
    getNextPageParam: (lastPage: Messages) => {
      if (lastPage.messages.length === 0) return undefined;
      return lastPage.next;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: shouldLoadMessages,
    refetchOnWindowFocus: false,
  });
  const messageGroups = useMemo(() => flattenPages(data), [data]);

  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => 64, []);
  const getItemKey = useCallback(
    (index: number) => {
      const msg = messageGroups[index];
      if (!msg) return `fallback-${index}`;
      return msg.id || `${msg.sender}-${msg.timestamp}-${index}`;
    },
    [messageGroups]
  );

  // eslint-disable-next-line
  const rowVirtualizer = useVirtualizer({
    count: messageGroups.length,
    getScrollElement,
    estimateSize,
    overscan: 5,
    getItemKey,
    measureElement: (element, entry) => {
      if (entry) return entry.contentRect.height;
      return element.getBoundingClientRect().height;
    },
  });

  const isPinnedToBottom = useCallback(() => {
    const el = parentRef.current;
    if (!el) return true;

    const { scrollHeight, scrollTop, clientHeight } = el;
    const distance = scrollHeight - scrollTop - clientHeight;

    return distance <= BOTTOM_DISTANCE_THRESHOLD + 2;
  }, []);

  const loadMore = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage || !parentRef.current) return;

    const el = parentRef.current;
    scrollMetaRef.current = {
      prevScrollHeight: el.scrollHeight,
      prevScrollTop: el.scrollTop,
      prevOffset: rowVirtualizer.scrollOffset ?? el.scrollTop,
    };

    try {
      await fetchNextPage();
    } catch (error) {
      scrollMetaRef.current = null;
      throw error;
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, rowVirtualizer]);

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    if (el.scrollTop <= SCROLL_THRESHOLD) {
      void loadMore();
    }
  }, [loadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    if (isInitialLoadRef.current && isSuccess && messageGroups.length > 0) {
      isInitialLoadRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(messageGroups.length - 1, {
            align: "end",
          });
          const scrollEl = parentRef.current;
          if (scrollEl) {
            scrollEl.scrollTop = scrollEl.scrollHeight;
          }
        });
      });
      return;
    }

    const meta = scrollMetaRef.current;
    if (meta) {
      const newScrollHeight = el.scrollHeight;
      const delta = newScrollHeight - meta.prevScrollHeight;
      const nextScrollTop = meta.prevScrollTop + delta;
      el.scrollTop = nextScrollTop;
      rowVirtualizer.scrollToOffset(meta.prevOffset + delta);
      scrollMetaRef.current = null;
    }
  }, [isSuccess, messageGroups.length, rowVirtualizer]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    scrollMetaRef.current = null;
  }, [currentReceiverUuid]);

  const handleRealtimeMessage = useEffectEvent((newMsg: Message) => {
    const wasPinned = isPinnedToBottom();
    nextIdRef.current += 1;

    let newTotalLength = messageGroups.length;

    queryClient.setQueryData<InfiniteData<Messages, number>>(
      queryKey,
      (old: InfiniteData<Messages, number> | undefined) => {
        const base: InfiniteData<Messages, number> = old ?? {
          pageParams: [0],
          pages: [
            {
              messages: [],
              previous: 0,
              next: 0,
            },
          ],
        };

        const clonedPages = base.pages.map((page) => ({
          ...page,
          messages: [...page.messages],
        }));

        let targetIndex = clonedPages.length - 1;
        if (targetIndex < 0) {
          clonedPages.push({ messages: [], previous: 0, next: 0 });
          targetIndex = 0;
        }

        const targetPage = { ...clonedPages[targetIndex] };
        const lastGroup = targetPage.messages.at(-1);
        const lastGroupLastMessage = lastGroup?.messages.at(-1);

        const shouldMerge =
          lastGroup &&
          lastGroup.sender === newMsg.sender &&
          lastGroupLastMessage &&
          newMsg.timestamp - lastGroupLastMessage.timestamp <= GROUP_WINDOW_MS;

        if (shouldMerge && lastGroup) {
          const updatedGroup: MessageGroupType = {
            ...lastGroup,
            timestamp: newMsg.timestamp,
            messages: [...lastGroup.messages, newMsg],
          };
          targetPage.messages = [
            ...targetPage.messages.slice(0, -1),
            updatedGroup,
          ];
        } else {
          const newGroup: MessageGroupType = {
            id: `${newMsg.sender}-${newMsg.timestamp}-${nextIdRef.current}`,
            sender: newMsg.sender,
            avatar: newMsg.avatar,
            display: newMsg.display,
            tint: newMsg.tint,
            timestamp: newMsg.timestamp,
            messages: [newMsg],
          };
          targetPage.messages = [...targetPage.messages, newGroup];
        }

        clonedPages[targetIndex] = targetPage;
        newTotalLength = clonedPages.reduce(
          (acc, page) => acc + page.messages.length,
          0
        );

        return { ...base, pages: clonedPages };
      }
    );

    if (wasPinned && newTotalLength > 0) {
      requestAnimationFrame(() => {
        rowVirtualizer.scrollToIndex(newTotalLength - 1, { align: "end" });
      });

      setTimeout(() => {
        requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(newTotalLength - 1, { align: "end" });
        });
      }, 16);
    }
  });

  useEffect(() => {
    if (!addRealtimeMessageToBox) return;
    handleRealtimeMessage(addRealtimeMessageToBox);
    setAddRealtimeMessageToBox(null);
  }, [addRealtimeMessageToBox, setAddRealtimeMessageToBox]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm">
        <DelayedLoadingIcon />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-5 h-full items-center justify-center text-sm">
        {/* eslint-disable-next-line */}
        <img
          //width={220}
          //height={220}
          src="/assets/images/megamind.png"
          alt={translate("ERROR")}
          className="w-55 h-55"
        />
        <p className="text-xl">
          {translate("ERROR_CONVERSATION_LOADING_FAILED")}
        </p>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto scrollbar-hide"
      onScroll={onScroll}
    >
      <div className="min-h-full flex flex-col justify-end">
        <div
          className="w-full relative"
          style={{
            height: `${totalHeight}px`,
          }}
        >
          {isFetchingNextPage && (
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-center py-1 text-xs text-muted-foreground">
              Loading...
            </div>
          )}
          {virtualItems.map((virtualRow, index) => {
            const msgGroup: MessageGroupType = messageGroups[virtualRow.index];
            if (!msgGroup) return null;

            return (
              <div
                ref={rowVirtualizer.measureElement}
                key={`${virtualRow.key}-${index}-${msgGroup.messages.length}`}
                data-index={virtualRow.index}
                className="absolute left-0 right-0 pt-2"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <MessageGroupComponent data={msgGroup} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
