// Package Imports
import * as Icon from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Button } from "@/components/ui/button";

// Main
export function WindowControls() {
  const appWindow = getCurrentWindow();

  return (
    useStorageContext().isTauri && (
      <div className="flex justify-center items-center gap-0 border border-input bg-background dark:bg-input/30 rounded-lg h-9">
        <Button
          className="h-8 w-8 scale-90 dark:hover:bg-input/50"
          variant="ghost"
          onClick={() => appWindow.minimize()}
        >
          <Icon.Minus />
        </Button>
        <Button
          className="h-8 w-8 scale-90 dark:hover:bg-input/50"
          variant="ghost"
          onClick={() => appWindow.maximize()}
        >
          <Icon.Maximize2 />
        </Button>
        <Button
          className="h-8 w-8 scale-90 dark:hover:bg-input/50"
          variant="ghost"
          onClick={() => appWindow.close()}
        >
          <Icon.X />
        </Button>
      </div>
    )
  );
}
