import * as Icon from "lucide-react";

import { isElectron } from "@/lib/utils";

import { Button } from "@/components/ui/button";

export function WindowControls() {
  return isElectron() ? (
    <div className="flex justify-center items-center gap-0 border border-input bg-background dark:bg-input/30 rounded-lg h-9">
      <Button
        className="h-8 w-8 scale-80 dark:hover:bg-input/25"
        variant="ghost"
      >
        <Icon.Minus />
      </Button>
      <Button
        className="h-8 w-8 scale-80 dark:hover:bg-input/25"
        variant="ghost"
      >
        <Icon.Maximize2 />
      </Button>
      <Button
        className="h-8 w-8 scale-80 dark:hover:bg-input/25"
        variant="ghost"
      >
        <Icon.X />
      </Button>
    </div>
  ) : null;
}
