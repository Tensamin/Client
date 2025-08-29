// Context Imports
import { useUsersContext } from "@/components/context/users";
import { useThemeContext } from "@/components/context/theme";
import { useCallContext } from "@/components/context/call";
import { usePageContext } from "@/components/context/page";

// Components
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserModal } from "@/components/page/root/user-modal/main"
import { Chats } from "@/components/page/root/chats";
import { Communities } from "@/components/page/root/communities";
import { VoiceControls } from "@/components/page/voice/controls";

// Main
export function AppSidebar(props) {
  let { forceLoad, ownUuid } = useUsersContext();
  let { sidebarRightSide } = useThemeContext();
  let { connected } = useCallContext();
  let { sidebarCategory, setSidebarCategory } = usePageContext();

  return (
    <Sidebar side={sidebarRightSide ? "right" : "left"} variant="inset" {...props}>
      <SidebarHeader className="pb-0">
        <SidebarMenu>
          <SidebarMenuItem className="border-1 bg-card rounded-xl">
            <SidebarMenuButton size="lg" asChild>
              <UserModal
                id={ownUuid}
                state="ONLINE"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {connected && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <VoiceControls />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarMenu className="pt-3 pb-3">
          <SidebarMenuItem>
            <div className="border flex w-full justify-center rounded-full bg-card py-1 px-1.5 gap-1">
              <Button
                variant={sidebarCategory !== "communities" ? "ghost" : "outline"}
                className="w-1/2 rounded-full select-none"
                disabled={forceLoad}
                onClick={() => {
                  if (sidebarCategory !== "communities") {
                    setSidebarCategory("communities");
                  }
                }}
              >
                Communities
              </Button>
              <Button
                variant={sidebarCategory !== "chats" ? "ghost" : "outline"}
                className="w-1/2 rounded-full select-none"
                disabled={forceLoad}
                onClick={() => {
                  if (sidebarCategory !== "chats") {
                    setSidebarCategory("chats");
                  }
                }}
              >
                Chats
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarMenu>
          {sidebarCategory === "chats" ? <Chats /> : <Communities />}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
    </Sidebar>
  );
}