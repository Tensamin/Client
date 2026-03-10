import Basic from "@/components/modals/basic";
import Wrapper from "@tensamin/core-user/wrapper";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@tensamin/ui/context-menu";
import { useNavigate } from "@solidjs/router";

export default function ConversationModal(props: { userId: number }) {
  const navigate = useNavigate();

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          class="select-none cursor-pointer"
          onClick={() => {
            navigate("/chat?id=" + props.userId);
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
