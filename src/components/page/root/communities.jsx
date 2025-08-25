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
  let { communitiesArray, setCommunitiesArray, forceLoad, refreshCommunities } = useUsersContext();
  let { setPage } = usePageContext();

  useEffect(() => {
    if (connected && identified && !forceLoad) {
      send("get_communities", {
        log_level: 0,
        message: "Getting all communities",
      }, {})
        .then((data) => {
          let sortedCommunities = data.data.communities.sort(
            (a, b) => a.position - b.position
          );
          setCommunitiesArray(sortedCommunities);
        });
    } else {
      setCommunitiesArray([
        { position: 0, ip: "", port: 0, secure: false, state: "none" }
      ])
    }
  }, [connected, identified, forceLoad, refreshCommunities]);

  return (
    <div className="flex flex-col gap-2 mr-2 ml-3">
      {communitiesArray.map((community) => (
        <SidebarMenuItem key={community.position}>
          <Button
            className="w-full h-full p-1 pr-2.5 pl-0 rounded-2xl transition-all duration-200 ease-in-out"
            variant="outline"
            onClick={() => {
              setPage({
                name: "community", data: JSON.stringify({
                  ip: community.ip,
                  port: community.port,
                  secure: community.secure,
                })
              });
            }}
            disabled={forceLoad}
          >
            <div variant="outline" className="w-full text-left justify-start">
              {forceLoad ? (
                <SmallCommunityModal forceLoad={true} />
              ) : (
                <SmallCommunityModal
                  ip={community.ip}
                  port={community.port}
                  secure={community.secure}
                  state={community.state}
                />
              )}
            </div>
          </Button>
        </SidebarMenuItem>
      ))}
    </div>
  );
}