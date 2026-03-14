import Basic from "@/components/modals/basic";
import Wrapper from "@tensamin/user/wrapper";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@tensamin/ui/context-menu";
import { useNavigate } from "@tanstack/react-router";

export default function ConversationModal(props: { userId: number }) {
  const navigate = useNavigate();

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="select-none cursor-pointer"
          onClick={() => {
            void navigate({ to: "/chat", search: { id: props.userId } });
          }}
        >
          <Wrapper
            userId={props.userId}
            component={(user) => <Basic user={user} />}
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
