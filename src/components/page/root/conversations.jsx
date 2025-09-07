"use client";

// Package Imports
import { useEffect, useTransition } from "react";

// Lib Imports
import { safeParseCommunityAddress } from "@/lib/utils";

// Contexts
import { useWebSocketContext } from "@/components/context/websocket";
import { useUsersContext } from "@/components/context/users";
import { usePageContext } from "@/components/context/page";

// Components
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SmallUserModal } from "@/components/page/root/user-modal/main";
import { SmallCommunityModal } from "@/components/page/root/community-modal/main";

// Main
export function Conversations({ variant = "chats" }) {
  let isChats = variant === "chats";

  let [isDataPending, startDataTransition] = useTransition();
  let [isNavPending, startNavTransition] = useTransition();

  let { send, connected, identified } = useWebSocketContext();
  let { setPage } = usePageContext();

  let {
    forceLoad,
    chatsArray,
    setChatsArray,
    fetchChats,
    setFetchChats,
    communitiesArray,
    setCommunitiesArray,
    fetchCommunities,
    setFetchCommunities,
  } = useUsersContext();

  let items = isChats ? chatsArray : communitiesArray;
  let shouldFetch = isChats ? fetchChats : fetchCommunities;
  let setShouldFetch = isChats ? setFetchChats : setFetchCommunities;
  let setArray = isChats ? setChatsArray : setCommunitiesArray;

  useEffect(() => {
    if (!connected || !identified || forceLoad || !shouldFetch) return;

    let active = true;

    if (isChats) {
      send("get_chats", { log_level: 0, message: "Getting all chats" }, {})
        .then((res) => {
          if (!active) return;
          let sorted =
            (res?.data?.user_ids || []).sort(
              (a, b) => (b?.last_message_at || 0) - (a?.last_message_at || 0)
            ) || [];
          startDataTransition(() => {
            if (!active) return;
            setArray(sorted);
          });
        })
        .catch(() => {})
        .finally(() => {
          if (active) setShouldFetch(false);
        });
    } else {
      send(
        "get_communities",
        { log_level: 0, message: "Getting all communities" },
        {}
      )
        .then((res) => {
          if (!active) return;
          let sorted =
            (res?.data?.communities || []).sort(
              (a, b) => (a?.position || 0) - (b?.position || 0)
            ) || [];
          startDataTransition(() => {
            if (!active) return;
            setArray(sorted);
          });
        })
        .catch(() => {})
        .finally(() => {
          if (active) setShouldFetch(false);
        });
    }

    return () => {
      active = false;
    };
  }, [
    isChats,
    connected,
    identified,
    forceLoad,
    shouldFetch,
    send,
    setArray,
    setShouldFetch,
  ]);

  return (
    <div
      className="flex flex-col gap-2 mx-3"
      aria-busy={isDataPending ? "true" : "false"}
    >
      {items && items.length > 0 ? (
        items.map((item) => {
          if (isChats) {
            // Chats
            return (
              <SidebarMenuItem key={item.user_id}>
                <Button
                  className="w-full h-full p-1 pr-2.5 pl-0 rounded-2xl transition-all duration-200 ease-in-out"
                  variant="outline"
                  onClick={() =>
                    startNavTransition(() =>
                      setPage({ name: "chat", data: item.user_id })
                    )
                  }
                  disabled={forceLoad || isNavPending}
                >
                  <div
                    variant="outline"
                    className="w-full text-left justify-start"
                  >
                    {forceLoad ? (
                      <SmallUserModal
                        uuid="..."
                        showIotaStatus={false}
                        forceLoad={true}
                      />
                    ) : (
                      <SmallUserModal
                        uuid={item.user_id}
                        showIotaStatus={true}
                        callActive={item.call_active}
                        callId={item.call_id || ""}
                        encCallSecret={item.call_secret || ""}
                      />
                    )}
                  </div>
                </Button>
              </SidebarMenuItem>
            );
          }

          // Communities
          let [ip, port] = safeParseCommunityAddress(item.community_address);

          return (
            <SidebarMenuItem key={item.community_address}>
              <Button
                className="w-full h-full p-1 pr-2.5 pl-0 rounded-2xl transition-all duration-200 ease-in-out"
                variant="outline"
                onClick={() =>
                  startNavTransition(() =>
                    setPage({
                      name: "community",
                      data: item.community_address,
                    })
                  )
                }
                disabled={forceLoad || isNavPending}
              >
                <div
                  variant="outline"
                  className="w-full text-left justify-start"
                >
                  {forceLoad ? (
                    <SmallCommunityModal forceLoad={true} />
                  ) : (
                    <SmallCommunityModal
                      ip={ip}
                      port={port}
                      title={item.community_title}
                    />
                  )}
                </div>
              </Button>
            </SidebarMenuItem>
          );
        })
      ) : (
        <p className="w-full text-xs text-center">
          {isChats ? "No Chats" : "No Communities"}
        </p>
      )}
    </div>
  );
}
