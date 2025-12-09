"use client";

// Package Imports
import * as Icon from "lucide-react";
import { useEffect, useState } from "react";

// Components
import { Button } from "@/components/ui/button";

// Main
export function WindowControls() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // @ts-expect-error ignore
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsElectron(true);
    }
  }, []);

  const handleMinimize = () => {
    // @ts-expect-error ignore
    if (typeof window !== "undefined" && window.electronAPI) {
      // @ts-expect-error ignore
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    // @ts-expect-error ignore
    if (typeof window !== "undefined" && window.electronAPI) {
      // @ts-expect-error ignore
      window.electronAPI.maximize();
    }
  };

  const handleClose = () => {
    // @ts-expect-error ignore
    if (typeof window !== "undefined" && window.electronAPI) {
      // @ts-expect-error ignore
      window.electronAPI.close();
    }
  };

  if (!isElectron) {
    return null;
  }

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

export function FixedWindowControls() {
  return (
    <div className="fixed top-0 right-0 w-full flex">
      <div className="flex-1 h-11 electron-drag" />
      <div className="ml-auto mt-2 mr-2 electron-no-drag">
        <WindowControls />
      </div>
    </div>
  );
}
