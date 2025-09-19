// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";
import { usePageContext } from "@/app/page";

// Components
import * as RawModal from "@/components/modals/raw";

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
  const [user, setUser] = useState<any>({
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
    description: user.username,
    icon: user.avatar,
    loading: user.loading,
  };

  switch (size) {
    case "big":
      return <RawModal.BigModal {...props} />;
    case "medium":
      return (
        <RawModal.MediumModal
          {...props}
          description={user.status}
          onClick={() => {
            setPage("chat", user.uuid);
          }}
        />
      );
    default:
      return null;
  }
}
