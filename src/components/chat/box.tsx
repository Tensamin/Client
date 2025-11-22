// Package Imports
import { useRef, useEffect, useMemo, useEffectEvent, useState } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";

// Lib Imports
import { InitialMessages } from "@/lib/utils";

// Context Imports
import { useMessageContext } from "@/context/message";
import { useStorageContext } from "@/context/storage";
import { useUserContext } from "@/context/user";

// Components
import { MessageGroup as MessageGroupComponent } from "@/components/chat/message";
import { DelayedLoadingIcon } from "@/components/loading";
import { MessagesTop } from "@/components/chat/messagesTop";

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
  return data.pages.flatMap((page) => [...page.messages].reverse());
}

type MessagesQueryKey = ["messages", "top-infinite", string];

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

  const topSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (topSentinelRef.current) {
      observer.observe(topSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  };

  const onScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(isBottom);
  };

  // initally scroll to bottom
  useEffect(() => {
    if (messageGroups.length > 0 && !isLoading) {
      scrollToBottom();
    }
  }, [currentReceiverUuid, isLoading]);

  // auto scroll down when new messages come and already at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messageGroups, isAtBottom]);

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
      className="h-full w-full overflow-y-auto flex flex-col-reverse contain-strict"
      onScroll={onScroll}
    >
      {messageGroups.map((messageGroup) => (
        <div key={messageGroup.id}>
          <MessageGroupComponent data={messageGroup} />
        </div>
      ))}

      {!hasNextPage && (
        <div className="w-full flex justify-center">
          <MessagesTop />
        </div>
      )}

      {isFetchingNextPage && (
        <div className="py-2 flex justify-center shrink-0">
          <DelayedLoadingIcon />
        </div>
      )}

      <div ref={topSentinelRef} className="h-4 w-full shrink-0" />
    </div>
  );
}
