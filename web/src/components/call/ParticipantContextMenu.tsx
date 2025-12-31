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
import { useUserContext } from "@/context/user";
import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

// Main
export default function ParticipantContextMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  const participant = useParticipantContext();
  const {
    startWatching,
    stopWatching,
    isWatching,
    ownMetadata,
    disconnectUser,
    timeoutUser,
  } = useSubCallContext();
  const { ownId } = useUserContext();

  const ownIsAdmin = ownMetadata.isAdmin;
  const user = Number(participant.identity);
  const isWatchingUser = isWatching[user];
  const hasScreenShare =
    participant.getTrackPublication(Track.Source.ScreenShare) !== undefined;

  const [timeoutMenuOpen, setTimeoutMenuOpen] = useState(false);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem
              disabled={!hasScreenShare || isWatchingUser}
              onSelect={() => startWatching(user)}
            >
              Start Watching
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              disabled={!isWatchingUser}
              onSelect={() => stopWatching(user)}
            >
              Stop Watching
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              disabled={!ownIsAdmin || user === ownId}
              onSelect={() => disconnectUser(user)}
            >
              Disconnect User
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              disabled={!ownIsAdmin || user === ownId}
              onSelect={() => setTimeoutMenuOpen(true)}
            >
              Timeout User
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
      <Dialog open={timeoutMenuOpen} onOpenChange={setTimeoutMenuOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Timeout User</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              aria-label="Timeout for 1 minute"
              onClick={() => {
                timeoutUser(
                  user,
                  new Date(Date.now() + 1 * 60 * 1000).getTime()
                );
                setTimeoutMenuOpen(false);
              }}
            >
              1 minute
            </Button>
            <Button
              aria-label="Timeout for 5 minutes"
              onClick={() => {
                timeoutUser(
                  user,
                  new Date(Date.now() + 5 * 60 * 1000).getTime()
                );
                setTimeoutMenuOpen(false);
              }}
            >
              5 minutes
            </Button>
            <Button
              aria-label="Timeout for 1 hour"
              onClick={() => {
                timeoutUser(
                  user,
                  new Date(Date.now() + 60 * 60 * 1000).getTime()
                );
                setTimeoutMenuOpen(false);
              }}
            >
              1 hour
            </Button>
            <Button
              aria-label="Timeout for 1 day"
              onClick={() => {
                timeoutUser(
                  user,
                  new Date(Date.now() + 24 * 60 * 60 * 1000).getTime()
                );
                setTimeoutMenuOpen(false);
              }}
            >
              1 day
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
