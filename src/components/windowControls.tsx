// Package Imports
import * as Icon from "lucide-react";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Button } from "@/components/ui/button";

// Main
export function WindowControls() {
  const { isElectron } = useStorageContext();

  const handleMinimize = () => {
    // @ts-expect-error ElectronAPI only available in Electron
    if (window.electronAPI) {
      // @ts-expect-error ElectronAPI only available in Electron
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    // @ts-expect-error ElectronAPI only available in Electron
    if (window.electronAPI) {
      // @ts-expect-error ElectronAPI only available in Electron
      window.electronAPI.maximize();
    }
  };

  const handleClose = () => {
    // @ts-expect-error ElectronAPI only available in Electron
    if (window.electronAPI) {
      // @ts-expect-error ElectronAPI only available in Electron
      window.electronAPI.close();
    }
  };

  if (isElectron) {
    return (
      <div className="flex justify-center items-center gap-0 border border-input bg-background dark:bg-input/30 rounded-lg h-9">
        <Button
          className="h-8 w-8 scale-90 dark:hover:bg-input/50"
          variant="ghost"
          onClick={() => handleMinimize()}
        >
          <Icon.Minus />
        </Button>
        <Button
          className="h-8 w-8 scale-90 dark:hover:bg-input/50"
          variant="ghost"
          onClick={() => handleMaximize()}
        >
          <Icon.Maximize2 />
        </Button>
        <Button
          className="h-8 w-8 scale-90 dark:hover:bg-input/50"
          variant="ghost"
          onClick={() => handleClose()}
        >
          <Icon.X />
        </Button>
      </div>
    );
  }
}

export function FixedWindowControls() {
  return (
    <div className="fixed top-0 right-0 m-2">
      <WindowControls />
    </div>
  );
}
