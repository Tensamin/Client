// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";

// Components
import { displayCallId } from "@/lib/utils";
import * as RawModal from "@/components/modals/raw";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useCallContext } from "@/context/call";
import { fallbackUser } from "@/lib/types";
import { v7 } from "uuid";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Avatar from "./Avatar";
import { useRouter } from "next/navigation";

// Main
export function UserModal({
  id,
  size,
  calls,
  className,
}: {
  id: number;
  size: "big" | "medium" | "profile" | "call" | "avatar" | "callOnHomepage";
  calls?: string[];
  className?: string;
}) {
  const {
    get,
    ownState,
    ownId,
    fetchedUsers,
    conversations,
    currentReceiverId,
  } = useUserContext();
  const { getCallToken, connect, outerState, setDontSendInvite } =
    useCallContext();

  const router = useRouter();

  useEffect(() => {
    const cachedUser = fetchedUsers.get(id);
    if (cachedUser && !cachedUser.loading) {
      return;
    }
    get(id, false);
  }, [id, get, fetchedUsers]);

  const user = fetchedUsers.get(id) ?? fallbackUser;

  const props = {
    title: user.display,
    description: user.username || "",
    icon: user.avatar || undefined,
    loading: user.loading,
    state: user.id === ownId ? ownState : user.state,
  };

  const currentUserCalls =
    conversations.find((conv) => conv?.user_id === user.id)?.calls || [];

  const [profileOpen, setProfileOpen] = useState(false);
  const [callSubMenuOpen, setCallSubMenuOpen] = useState(false);

  switch (size) {
    case "big":
      return <RawModal.BigModal key={id} {...props} />;
    case "medium":
      return (
        <>
          <ContextMenu>
            <ContextMenuTrigger>
              <RawModal.MediumModal
                key={id}
                calls={calls ?? []}
                {...props}
                description={user.status || ""}
                onClick={() => {
                  router.push(`/chat?id=${user.id}`);
                }}
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              {currentUserCalls.length > 1 ? (
                <ContextMenuSub
                  open={callSubMenuOpen}
                  onOpenChange={setCallSubMenuOpen}
                >
                  <ContextMenuSubTrigger>Calls</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {currentUserCalls.map((callId) => (
                      <ContextMenuItem
                        key={callId}
                        onSelect={() => {
                          setCallSubMenuOpen(false);
                          getCallToken(callId).then((token) => {
                            setDontSendInvite(true);
                            connect(token, callId);
                          });
                        }}
                        disabled={
                          outerState === "CONNECTED" ||
                          outerState === "CONNECTING"
                        }
                      >
                        {displayCallId(callId)}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              ) : currentUserCalls.length === 1 ? (
                <ContextMenuItem
                  onSelect={() => {
                    getCallToken(currentUserCalls[0]).then((token) => {
                      setDontSendInvite(true);
                      connect(token, currentUserCalls[0]);
                    });
                  }}
                  disabled={
                    outerState === "CONNECTED" || outerState === "CONNECTING"
                  }
                >
                  Call
                </ContextMenuItem>
              ) : (
                <ContextMenuItem
                  onSelect={() => {
                    const callId = v7();
                    getCallToken(callId).then((token) => {
                      connect(token, callId, currentReceiverId);
                    });
                  }}
                  disabled={
                    outerState === "CONNECTED" || outerState === "CONNECTING"
                  }
                >
                  Call
                </ContextMenuItem>
              )}
              <ContextMenuItem onSelect={() => setProfileOpen(true)}>
                View Profile
              </ContextMenuItem>
              <ContextMenuItem disabled variant="destructive">
                Delete Conversation
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogContent
              aria-describedby={undefined}
              className="max-w-4xl! h-auto"
            >
              <DialogTitle hidden>{user.id}</DialogTitle>
              <div className="w-full">
                <RawModal.BigProfile
                  key={id}
                  {...props}
                  creationTimestamp={user.id}
                  description={user.about || ""}
                  state={user.state || "NONE"}
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    case "profile":
      return (
        <RawModal.Profile
          key={id}
          {...props}
          creationTimestamp={user.id}
          description={user.about || ""}
          state={user.state || "NONE"}
        />
      );
    case "callOnHomepage":
      return (
        <RawModal.CallOnHomepage
          key={id}
          display={user.display}
          avatar={user.avatar}
        />
      );
    case "avatar":
      return (
        <Tooltip>
          <TooltipTrigger>
            <Avatar
              key={id}
              addBorder
              className={className}
              size={10}
              display={user.display}
              image={user.avatar}
              loading={user.loading}
            />
          </TooltipTrigger>
          <TooltipContent>{user.display}</TooltipContent>
        </Tooltip>
      );
    default:
      return null;
  }
}
