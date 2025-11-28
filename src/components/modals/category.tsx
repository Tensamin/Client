// Context Imports
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";

// Components
import * as Modal from "@/components/modals/raw";
import { UserModal } from "@/components/modals/user";

// Main
export function Communities() {
  const { communities } = useUserContext();
  useStorageContext();
  return (
    <div className="flex flex-col gap-2 pb-3">
      {communities.length === 0 && (
        <div className="text-sm text-center text-muted-foreground">
          {"No communities"}
        </div>
      )}
      {communities.map((community) => (
        <Modal.MediumModal
          calls={[]}
          key={community.community_address}
          title={community.community_title}
          description={community.community_address}
          loading={false}
        />
      ))}
    </div>
  );
}

export function Conversations() {
  const { conversations } = useUserContext();
  useStorageContext();
  return (
    <div className="flex flex-col gap-2 pb-3">
      {conversations.length === 0 && (
        <div className="text-sm text-center text-muted-foreground">
          {"No conversations"}
        </div>
      )}
      {conversations.map((conversation) => (
        <UserModal
          key={conversation.user_id}
          uuid={conversation.user_id}
          calls={conversation.calls}
          size="medium"
        />
      ))}
    </div>
  );
}
