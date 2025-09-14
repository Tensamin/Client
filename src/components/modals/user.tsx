// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";

// Components
import * as Modal from "@/components/modals/raw";

// Main
export function UserModal({ uuid }: { uuid: string }) {
  const { get } = useUserContext();
  const [user, setUser] = useState<any>({
    uuid: "",
    display: "",
    avatar: "",
    status: "",
    loading: true,
  });

  useEffect(() => {
    get(uuid, false).then(setUser);
  }, [uuid]);

  return (
    <Modal.BigModal
      title={user.display}
      description={user.username}
      icon={user.avatar}
      loading={user.loading}
    />
  );
}
