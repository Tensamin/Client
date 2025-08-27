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
import { SmallUserModal } from "@/components/page/root/user-modal/main";

// Main
export function Chats() {
  let { send, connected, identified } = useWebSocketContext();
  let { chatsArray, setChatsArray, forceLoad, getUserState, refreshChats } = useUsersContext();
  let { setPage } = usePageContext();

  useEffect(() => {
    if (connected && identified && !forceLoad) {
      send("get_chats", {
        log_level: 0,
        message: "Getting all chats",
      }, {})
        .then((data) => {
          let sortedChats = data.data.user_ids.sort(
            (a, b) => b.last_message_at - a.last_message_at
          );
          setChatsArray(sortedChats);
        });
    } else {
      setChatsArray([
        { user_id: "", last_message_at: 0 }
      ])
    }
  }, [connected, identified, forceLoad, refreshChats]);

  return (
    <div className="flex flex-col gap-2 mr-2 ml-3">
      {chatsArray.length > 0 ? chatsArray.map((chat) => (
        <SidebarMenuItem key={chat.user_id}>
          <Button
            className="w-full h-full p-1 pr-2.5 pl-0 rounded-2xl transition-all duration-200 ease-in-out"
            variant="outline"
            onClick={() => {
              setPage({ name: "chat", data: chat.user_id });
            }}
            disabled={forceLoad}
          >
            <div variant="outline" className="w-full text-left justify-start">
              {forceLoad ? (
                <SmallUserModal
                  id=""
                  state="none"
                  showIotaStatus={false}
                  forceLoad={true}
                />
              ) : (
                <SmallUserModal
                  id={chat.user_id}
                  state={getUserState(chat.user_id)}
                  showIotaStatus={true}
                  callActive={chat.call_active}
                  callId={chat.call_id || ""}
                  encCallSecret={chat.call_secret || ""}
                />
              )}
            </div>
          </Button>
        </SidebarMenuItem>
      )) : (
        <p className="w-full text-xs text-center">No Chats</p>
      )}
    </div>
  );
}