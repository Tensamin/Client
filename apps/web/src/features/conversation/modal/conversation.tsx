import { Basic, Loading } from "@/components/modals/basic";
import Wrapper from "@tensamin/user/wrapper";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@tensamin/ui/cmp/context-menu";
import { useNavigate } from "@tanstack/react-router";
import { type User } from "@tensamin/user/context";

/**
 * Renders the conversation modal user preview card.
 * @param user Loaded user data.
 * @returns Conversation preview card JSX.
 */
function renderConversationUser(user: User) {
  return <Basic user={user} />;
}

/**
 * Renders the conversation modal user preview card skeleton while loading user data.
 * @returns Conversation preview card skeleton JSX.
 */
function renderConversationUserLoading() {
  return <Loading />;
}

/**
 * Renders a conversation context-menu entry for a specific user.
 * @param props Component props with selected user id.
 * @returns Conversation modal trigger and menu JSX.
 */
export default function ConversationModal(props: { userId: number }) {
  const navigate = useNavigate();

  /**
   * Navigates to the selected conversation in chat view.
   * @returns Void.
   */
  const onConversationClick = () => {
    void navigate({ to: "/chat", search: { id: props.userId } });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="select-none cursor-pointer"
          onClick={onConversationClick}
        >
          <Wrapper
            loading={renderConversationUserLoading()}
            userId={props.userId}
            component={renderConversationUser}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>Test</ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
