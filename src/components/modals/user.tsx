// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";
import { usePageContext } from "@/app/page";

// Components
import * as RawModal from "@/components/modals/raw";
import { User } from "@/lib/types";

// Main
export function UserModal({
  uuid,
  size,
}: {
  uuid: string;
  size: "big" | "medium";
}) {
  const { get } = useUserContext();
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
    loading: true,
  });

  useEffect(() => {
    get(uuid, false).then(setUser);
  }, [uuid, get]);

  const props = {
    title: user.display,
    description: user.username || "",
    icon: user.avatar || undefined,
    loading: user.loading,
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
    default:
      return null;
  }
}
