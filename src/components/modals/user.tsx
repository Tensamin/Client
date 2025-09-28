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
  const { get, reloadUsers, setReloadUsers } = useUserContext();
  const { setPage } = usePageContext();
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
    if (user.uuid !== "" && !reloadUsers) return;
    get(uuid, false).then(setUser);
    setReloadUsers(false);
  }, [uuid, get, user.uuid, reloadUsers, setReloadUsers]);

  const props = {
    title: user.display,
    description: user.username || "",
    icon: user.avatar || undefined,
    loading: user.loading,
    statusIcon: user.state,
  };

  switch (size) {
    case "big":
      return <RawModal.BigModal {...props} />;
    case "medium":
      return (
        <RawModal.MediumModal
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
          status={user.status || ""}
        />
      );
    default:
      return null;
  }
}
