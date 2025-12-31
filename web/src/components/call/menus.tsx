// Package Imports
import { useParticipantContext } from "@livekit/components-react";
import { Track } from "livekit-client";

// Context Imports
import { useSubCallContext } from "@/context/call";

// Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Main
export function ParticipantContextMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  const participant = useParticipantContext();
  const { startWatching, stopWatching, isWatching } = useSubCallContext();

  const identity = participant.identity;
  const isWatchingUser = isWatching[identity];
  const hasScreenShare =
    participant.getTrackPublication(Track.Source.ScreenShare) !== undefined;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem
            disabled={!hasScreenShare || isWatchingUser}
            onSelect={() => startWatching(identity)}
          >
            Start Watching
          </ContextMenuItem>
          <ContextMenuItem
            variant="destructive"
            disabled={!isWatchingUser}
            onSelect={() => stopWatching(identity)}
          >
            Stop Watching
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
