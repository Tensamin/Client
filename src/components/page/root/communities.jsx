"use client";

// Package Imports
import { useEffect } from "react";

// Context Imports
import { useWebSocketContext } from "@/components/context/websocket";
import { useUsersContext } from "@/components/context/users";
import { usePageContext } from "@/components/context/page";

// Components
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SmallCommunityModal } from "@/components/page/root/community-modal/main";

// Main
export function Communities() {
  let { send, connected, identified } = useWebSocketContext();
  let {
    communitiesArray,
    setCommunitiesArray,
    forceLoad,
    fetchCommunities,
    setFetchCommunities,
  } = useUsersContext();
  let { setPage } = usePageContext();

  useEffect(() => {
    if (connected && identified && !forceLoad) {
      if (fetchCommunities) {
        send(
          "get_communities",
          {
            log_level: 0,
            message: "Getting all communities",
          },
          {},
        ).then((data) => {
          let sortedCommunities = data.data.communities.sort(
            (a, b) => a.position - b.position,
          );

          setFetchCommunities(false);
          setCommunitiesArray(sortedCommunities);
        });
      }
    } else {
      setCommunitiesArray([
        { position: 0, ip: "", port: 0, secure: false, state: "none" },
      ]);
    }
  }, [connected, identified, forceLoad, fetchCommunities]);

  return (
    <div className="flex flex-col gap-2 mx-3">
      {communitiesArray.length > 0 ? (
        communitiesArray.map((community) => {
          let betterCommunityDomain = JSON.parse(community.community_address);

          return (
            <SidebarMenuItem key={community.community_address}>
              <Button
                className="w-full h-full p-1 pr-2.5 pl-0 rounded-2xl transition-all duration-200 ease-in-out"
                variant="outline"
                onClick={() => {
                  setPage({
                    name: "community",
                    data: community.community_address,
                  });
                }}
                disabled={forceLoad}
              >
                <div
                  variant="outline"
                  className="w-full text-left justify-start"
                >
                  {forceLoad ? (
                    <SmallCommunityModal forceLoad={true} />
                  ) : (
                    <SmallCommunityModal
                      ip={betterCommunityDomain[0]}
                      port={betterCommunityDomain[1]}
                      title={community.community_title}
                    />
                  )}
                </div>
              </Button>
            </SidebarMenuItem>
          );
        })
      ) : (
        <p className="w-full text-xs text-center">No Communities</p>
      )}
    </div>
  );
}
