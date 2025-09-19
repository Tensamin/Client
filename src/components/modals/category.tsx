// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";

// Components
import * as Modal from "@/components/modals/raw";
import { UserModal } from "@/components/modals/user";

// Main
export function Communities() {
  const { communities } = useUserContext();
  return communities.map((community) => (
    <Modal.MediumModal
      key={community.community_address}
      title={community.community_title}
      description={community.community_address}
      loading={false}
    />
  ));
}

export function Conversations() {
  const { conversations } = useUserContext();
  return (
    <div className="flex flex-col gap-2">
      {conversations.map((conversation) => (
        <UserModal
          key={conversation.user_id}
          size="medium"
          uuid={conversation.user_id}
        />
      ))}
    </div>
  );
}
