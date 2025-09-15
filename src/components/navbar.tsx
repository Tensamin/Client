// Package Imports
import * as Icon from "lucide-react";

// Lib Imports
import { Padding } from "@/lib/utils";

// Context Imports
import { usePageContext } from "@/app/page";
import { useSidebar } from "@/components/ui/sidebar";

// Components
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { setPage } = usePageContext();
  const { open } = useSidebar();

  return (
    <div
      className={`${open ? `pr-${Padding}` : `px-${Padding}`} w-full my-${Padding} h-9 flex gap-${Padding} items-center bg-sidebar`}
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
