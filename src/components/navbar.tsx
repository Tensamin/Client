// Package Imports
import * as Icon from "lucide-react";

// Lib Imports
import { Padding } from "@/lib/utils";

// Context Imports
import { usePageContext } from "@/context/page";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserContext } from "@/context/user";

// Components
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { setPage } = usePageContext();
  const { open, isMobile } = useSidebar();
  const { failedMessagesAmount } = useUserContext();

  return (
    <div
      className={`${open && !isMobile ? `pr-${Padding}` : `px-${Padding}`} w-full my-${Padding} h-9 flex gap-${Padding} items-center bg-sidebar`}
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
      <div className="w-full">Username</div>
      {failedMessagesAmount > 0 && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button className="h-9 w-9" variant="outline">
              <Icon.TriangleAlert />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-full">
            <div>
              {failedMessagesAmount} message{failedMessagesAmount !== 1 && "s"} could not be loaded!
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
      <Button className="h-9 w-9" variant="outline">
        <Icon.Phone />
      </Button>

      {/* Electron Window Controls */}
      <Button className="h-9 w-9" variant="outline">
        <Icon.Minus />
      </Button>
      <Button className="h-9 w-9" variant="outline">
        <Icon.Maximize2 />
      </Button>
      <Button className="h-9 w-9" variant="outline">
        <Icon.X />
      </Button>
    </div>
  );
}
