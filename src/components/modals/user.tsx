// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";
import { usePageContext } from "@/context/page";

// Components
import * as RawModal from "@/components/modals/raw";
import { AvatarSizes, fallbackUser } from "@/lib/types";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

// Main
export function UserModal({
  id,
  size,
  overwriteSize,
  calls,
  extraProps,
}: {
  id: number;
  size: "big" | "medium" | "profile" | "call";
  overwriteSize?: AvatarSizes;
  calls?: string[];
  extraProps?: Record<string, unknown>;
}) {
  const { get, ownState, ownId, fetchedUsers } = useUserContext();
  const { setPage } = usePageContext();

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

  const [profileOpen, setProfileOpen] = useState(false);
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
                  setPage("chat", String(user.id));
                }}
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
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
              className="w-auto rounded-3xl scale-115"
            >
              <DialogHeader>
                <DialogTitle>{user.display}&apos;s Profile</DialogTitle>
              </DialogHeader>
              <RawModal.Profile
                key={id}
                {...props}
                creationTimestamp={user.id}
                description={user.about || ""}
                state={user.state || "NONE"}
              />
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
    case "call":
      return (
        <RawModal.CallModal
          overwriteSize={overwriteSize}
          key={id}
          {...props}
          {...extraProps}
        />
      );
    default:
      return null;
  }
}
