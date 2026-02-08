"use client";

import { useLocalParticipant } from "@livekit/components-react";
import * as Icon from "lucide-react";

import { useSubCallContext } from "@/context/call/CallContext";
import { Button } from "@/components/ui/button";

interface MicButtonProps {
  ghostMode?: boolean;
  className?: string;
}

export default function MicButton({ ghostMode, className }: MicButtonProps) {
  const { toggleMute } = useSubCallContext();
  const { isMicrophoneEnabled } = useLocalParticipant();

  return (
    <Button
      className={`h-9 flex-3 ${className}`}
      variant={
        ghostMode
          ? isMicrophoneEnabled
            ? "ghost"
            : "destructive"
          : isMicrophoneEnabled
            ? "outline"
            : "destructive"
      }
      onClick={toggleMute}
      aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
    >
      {isMicrophoneEnabled ? <Icon.Mic /> : <Icon.MicOff />}
    </Button>
  );
}
