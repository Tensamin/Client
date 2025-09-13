// Package Imports
import * as Icon from "lucide-react";

// Context Imports
import { usePageContext } from "@/app/page";

// Components
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { setPage } = usePageContext();

  return (
    <div className="w-full px-1 my-1 h-8 flex gap-2 items-center bg-sidebar">
      <Button asChild className="h-8 w-8" variant="outline">
        <SidebarTrigger />
      </Button>
      <Button
        className="h-8 w-8"
        variant="outline"
        onClick={() => {
          setPage("home");
        }}
      >
        <Icon.Home />
      </Button>
      <Button
        className="h-8 w-8"
        variant="outline"
        onClick={() => {
          setPage("settings");
        }}
      >
        <Icon.Settings />
      </Button>

      {/* Only when user is selected */}
      <div className="w-full">Username</div>
      <Button className="h-8 w-8" variant="outline">
        <Icon.Phone />
      </Button>

      {/* Electron Window Controls */}
      <Button className="h-8 w-8" variant="outline">
        <Icon.Minus />
      </Button>
      <Button className="h-8 w-8" variant="outline">
        <Icon.Maximize2 />
      </Button>
      <Button className="h-8 w-8" variant="outline">
        <Icon.X />
      </Button>
    </div>
  );
}
