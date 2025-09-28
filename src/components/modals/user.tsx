// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";
import { usePageContext } from "@/context/page";

// Components
import * as RawModal from "@/components/modals/raw";
import { User } from "@/lib/types";

// Main
export function UserModal({
  uuid,
  size,
}: {
  uuid: string;
  size: "big" | "medium" | "profile";
}) {
  const { get, ownState, ownUuid, fetchedUsers } = useUserContext();
  const { setPage } = usePageContext();
  const userFromMap = JSON.stringify(fetchedUsers.get(uuid));
  const [user, setUser] = useState<User>({
    username: "",
    about: "",
    sub_level: 0,
    sub_end: 0,
    created_at: "",
    public_key: "",
    uuid: "",
    display: "",
    avatar: "",
    status: "",
    state: "NONE",
    loading: true,
  });

  useEffect(() => {
    get(uuid, false).then(setUser);
  }, [uuid, get, user.uuid, userFromMap]);

  const props = {
    title: user.display,
    description: user.username || "",
    icon: user.avatar || undefined,
    loading: user.loading,
    state: user.uuid === ownUuid ? ownState : user.state,
  };

  switch (size) {
    case "big":
      return <RawModal.BigModal key={userFromMap} {...props} />;
    case "medium":
      return (
        <RawModal.MediumModal
          key={userFromMap}
          {...props}
          description={user.status || ""}
          onClick={() => {
            setPage("chat", user.uuid);
          }}
        />
      );
    case "profile":
      return (
        <RawModal.Profile
          {...props}
          description={user.about || ""}
          state={user.state || "NONE"}
        />
      );
    default:
      return null;
  }
}
