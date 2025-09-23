// Package Imports
import * as Icon from "lucide-react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";

// Components
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/windowControls";

export function Navbar() {
  const { setPage, page } = usePageContext();
  const { open, isMobile } = useSidebar();
  const { failedMessagesAmount } = useUserContext();
  const { translate } = useStorageContext();

  return (
    <div
      className={`${open && !isMobile ? "pr-2 pl-1" : "px-2"} w-full my-2 h-9 flex gap-2 items-center bg-sidebar shrink-0`}
    >
      <Button asChild className="h-9 w-9" variant="outline">
        <SidebarTrigger />
      </Button>
      <Button
        className="h-9 w-9"
        variant="outline"
        onClick={() => {
          setPage("home");
        }}
      >
        <Icon.Home />
      </Button>
      <Button
        className="h-9 w-9"
        variant="outline"
        onClick={() => {
          setPage("settings");
        }}
      >
        <Icon.Settings />
      </Button>

      {/* Only when user is selected */}
      {page === "chat" && <p>Username</p>}
      <div className="w-full" />
      {failedMessagesAmount > 0 && page === "chat" && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button className="h-9 w-9" variant="outline">
              <Icon.TriangleAlert />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-full">
            <div>
              {failedMessagesAmount +
                translate(
                  failedMessagesAmount === 1
                    ? "FAILED_MESSAGES_SINGLE"
                    : "FAILED_MESSAGES_MULTIPLE"
                )}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
      {page === "chat" && (
        <Button className="h-9 w-9" variant="outline">
          <Icon.Phone />
        </Button>
      )}

      {/* Electron Window Controls */}
      <WindowControls />
    </div>
  );
}
