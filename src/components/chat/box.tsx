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
  // data.pages is [latestPage, olderPage, oldestPage]
  // We want [newestMessageGroup, ..., oldestMessageGroup]
  return data.pages.flatMap((page) => [...page.messages].reverse());
}

type MessagesQueryKey = ["messages", "top-infinite", string];

const SCROLL_THRESHOLD = 100;

export function Box() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const nextIdRef = useRef(0);

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

  const rowVirtualizer = useVirtualizer({
    count: messageGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
    getItemKey: (index) => {
      const group = messageGroups[index];
      return group.id || `${group.sender}-${group.timestamp}-${index}`;
    },
  });

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;

    const { scrollHeight, scrollTop, clientHeight } = el;
    const distanceToTop = scrollHeight - scrollTop - clientHeight;

    if (
      distanceToTop <= SCROLL_THRESHOLD &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    let targetScrollTop = el.scrollTop;
    let rafId: number | null = null;

    const update = () => {
      const current = el.scrollTop;
      const diff = targetScrollTop - current;

      if (Math.abs(diff) < 0.5) {
        el.scrollTop = targetScrollTop;
        rafId = null;
        return;
      }

      el.scrollTop = current + diff * 0.075;
      rafId = requestAnimationFrame(update);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();

      if (rafId === null) {
        targetScrollTop = el.scrollTop;
      }

      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        delta *= 40;
      } else if (e.deltaMode === 2) {
        delta *= el.clientHeight;
      }

      targetScrollTop -= delta;

      const maxScroll = el.scrollHeight - el.clientHeight;
      targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));

      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isLoading]);

  const handleRealtimeMessage = useEffectEvent((newMsg: Message) => {
    nextIdRef.current += 1;

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

        let targetIndex = 0;
        if (clonedPages.length === 0) {
          clonedPages.push({ messages: [], previous: 0, next: 0 });
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
            id: `${newMsg.sender}-${newMsg.timestamp}-${nextIdRef.current}-rt`,
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
        return { ...base, pages: clonedPages };
      }
    );
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

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-y-auto flex flex-col contain-strict"
      style={{ transform: "scaleY(-1)" }}
      onScroll={onScroll}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem, index) => {
          const messageGroup = messageGroups[virtualItem.index];
          return (
            <div
              key={index}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px) scaleY(-1)`,
              }}
            >
              <MessageGroupComponent data={messageGroup} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
