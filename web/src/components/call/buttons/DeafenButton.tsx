"use client";

import * as Icon from "lucide-react";

import { useSubCallContext } from "@/context/call/CallContext";
import { Button } from "@/components/ui/button";

interface DeafenButtonProps {
  ghostMode?: boolean;
  className?: string;
}

export default function DeafenButton({ ghostMode, className }: DeafenButtonProps) {
  const { isDeafened, toggleDeafen } = useSubCallContext();

  return (
    <Button
      className={`h-9 flex-3 ${className}`}
      variant={
        ghostMode
          ? isDeafened
            ? "destructive"
            : "ghost"
          : isDeafened
            ? "destructive"
            : "outline"
      }
      onClick={toggleDeafen}
      aria-label={isDeafened ? "Undeafen" : "Deafen"}
    >
      {isDeafened ? <Icon.HeadphoneOff /> : <Icon.Headphones />}
    </Button>
  );
}
