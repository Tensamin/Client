"use client";

// Package Imports
import { useLocalParticipant } from "@livekit/components-react";
import * as Icon from "lucide-react";

// Core Context Imports
import { useCallSession } from "./CallSessionContext";

// Components
import { Button } from "@/components/ui/button";

// Mute Button
export function MuteButton({
  ghostMode,
  className,
}: {
  ghostMode?: boolean;
  className?: string;
}) {
  const { toggleMute } = useCallSession();
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
      onClick={() => toggleMute()}
      aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
    >
      {isMicrophoneEnabled ? <Icon.Mic /> : <Icon.MicOff />}
    </Button>
  );
}

// Deafen Button
export function DeafButton({
  ghostMode,
  className,
}: {
  ghostMode?: boolean;
  className?: string;
}) {
  const { isDeafened, toggleDeafen } = useCallSession();

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
      onClick={() => toggleDeafen()}
      aria-label={isDeafened ? "Undeafen" : "Deafen"}
    >
      {isDeafened ? <Icon.HeadphoneOff /> : <Icon.Headphones />}
    </Button>
  );
}

// Leave Button
export function LeaveButton({
  className,
  onLeave,
}: {
  className?: string;
  onLeave?: () => void;
}) {
  const { disconnect } = useCallSession();

  const handleLeave = () => {
    if (onLeave) {
      onLeave();
    } else {
      disconnect();
    }
  };

  return (
    <Button
      className={`h-9 ${className}`}
      variant="destructive"
      onClick={handleLeave}
      aria-label="Leave call"
    >
      <Icon.LogOut />
    </Button>
  );
}

// Simple button variants that accept props instead of using context
// These are useful for anonymous mode where we manage state externally

export function SimpleMuteButton({
  isMuted,
  onToggle,
  className,
  ghostMode = true,
}: {
  isMuted: boolean;
  onToggle: () => void;
  className?: string;
  ghostMode?: boolean;
}) {
  return (
    <Button
      className={`h-9 ${className}`}
      variant={
        ghostMode
          ? isMuted
            ? "destructive"
            : "ghost"
          : isMuted
            ? "destructive"
            : "outline"
      }
      onClick={onToggle}
      aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
    >
      {isMuted ? <Icon.MicOff /> : <Icon.Mic />}
    </Button>
  );
}

export function SimpleDeafButton({
  isDeafened,
  onToggle,
  className,
  ghostMode = true,
}: {
  isDeafened: boolean;
  onToggle: () => void;
  className?: string;
  ghostMode?: boolean;
}) {
  return (
    <Button
      className={`h-9 ${className}`}
      variant={
        ghostMode
          ? isDeafened
            ? "destructive"
            : "ghost"
          : isDeafened
            ? "destructive"
            : "outline"
      }
      onClick={onToggle}
      aria-label={isDeafened ? "Undeafen" : "Deafen"}
    >
      {isDeafened ? <Icon.HeadphoneOff /> : <Icon.Headphones />}
    </Button>
  );
}

export function SimpleLeaveButton({
  onLeave,
  className,
}: {
  onLeave: () => void;
  className?: string;
}) {
  return (
    <Button
      className={`h-9 ${className}`}
      variant="destructive"
      onClick={onLeave}
      aria-label="Leave call"
    >
      <Icon.LogOut />
    </Button>
  );
}
