// Package Imports
import { useMemo, useEffect, useRef } from "react";

// Context Imports
import { useUserContext } from "@/context/user";

// Components
import * as Modal from "@/components/modals/raw";
import { UserModal } from "@/components/modals/user";

// Main
export function Communities() {
  const { communities } = useUserContext();

  return useMemo(
    () =>
      communities.map((c) => (
        <Modal.MediumModal
          key={c.community_address}
          title={c.community_title}
          description={c.community_address}
          loading={false}
        />
      )),
    [communities]
  );
}

export function Conversations() {
  const { conversations } = useUserContext();
  const prev = useRef(conversations);

  useEffect(() => {
    console.log("same ref as before?", prev.current === conversations);
    prev.current = conversations;
  }, [conversations]);

  console.log("RENDER", conversations);
  const items = useMemo(
    () =>
      conversations.map((c) => (
        <UserModal key={c.user_id} uuid={c.user_id} size="medium" />
      )),
    [conversations]
  );

  return <div className="flex flex-col gap-2">{items}</div>;
}
