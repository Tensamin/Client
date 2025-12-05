// Package Imports
import { useEffect } from "react";

// Context Imports
import { useUserContext } from "@/context/user";
import { usePageContext } from "@/context/page";

// Components
import * as RawModal from "@/components/modals/raw";
import { fallbackUser } from "@/lib/types";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
} from "@/components/ui/context-menu";

// Main
export function UserModal({
  uuid,
  size,
  calls,
  extraProps,
}: {
  uuid: string;
  size: "big" | "medium" | "profile" | "call";
  calls?: string[];
  extraProps?: Record<string, unknown>;
}) {
  const { get, ownState, ownUuid, fetchedUsers } = useUserContext();
  const { setPage } = usePageContext();

  useEffect(() => {
    const cachedUser = fetchedUsers.get(uuid);
    if (cachedUser && !cachedUser.loading) {
      return;
    }
    get(uuid, false);
  }, [uuid, get, fetchedUsers]);

  const user = fetchedUsers.get(uuid) ?? fallbackUser;

  const props = {
    title: user.display,
    description: user.username || "",
    icon: user.avatar || undefined,
    loading: user.loading,
    state: user.uuid === ownUuid ? ownState : user.state,
  };

  switch (size) {
    case "big":
      return <RawModal.BigModal key={uuid} {...props} />;
    case "medium":
      return (
        <ContextMenu>
          <ContextMenuTrigger>
            <RawModal.MediumModal
              key={uuid}
              calls={calls ?? []}
              {...props}
              description={user.status || ""}
              onClick={() => {
                setPage("chat", user.uuid);
              }}
            />
          </ContextMenuTrigger>
          <ContextMenuContent className="p-0 bg-background rounded-xl border-none">
            <RawModal.Profile
              {...props}
              description={user.about || ""}
              state={user.state || "NONE"}
            />
          </ContextMenuContent>
        </ContextMenu>
      );
    case "profile":
      return (
        <RawModal.Profile
          key={uuid}
          {...props}
          description={user.about || ""}
          state={user.state || "NONE"}
        />
      );
    case "call":
      return <RawModal.CallModal key={uuid} {...props} {...extraProps} />;
    default:
      return null;
  }
}
