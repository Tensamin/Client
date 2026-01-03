// Package Imports
import { isTrackReference } from "@livekit/components-core";
import { useParticipantContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import * as Icon from "lucide-react";

// Context Imports
import { useSubCallContext } from "@/context/call";

// Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useUserContext } from "@/context/user";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useCallPageContext } from "./context";

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
  const { openPopout } = useCallPageContext();
  const { ownId, get, fetchedUsers } = useUserContext();

  const ownIsAdmin = ownMetadata.isAdmin;
  const user = Number(participant.identity);
  const isWatchingUser = isWatching[user];
  const hasScreenShare =
    participant.getTrackPublication(Track.Source.ScreenShare) !== undefined;

  // Get user display name for popout title
  const [userDisplay, setUserDisplay] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const cachedUser = fetchedUsers.get(user);
    if (cachedUser && !cachedUser.loading) {
      setUserDisplay(cachedUser.display);
      return;
    }
    get(user, false).then((userData) => {
      if (userData) {
        setUserDisplay(userData.display);
      }
    });
  }, [user, get, fetchedUsers]);

  const handlePopout = () => {
    const screenSharePublication = participant.getTrackPublication(
      Track.Source.ScreenShare,
    );
    if (screenSharePublication && screenSharePublication.track) {
      const trackRef = {
        participant,
        publication: screenSharePublication,
        source: Track.Source.ScreenShare,
      };
      if (isTrackReference(trackRef)) {
        openPopout(trackRef, userDisplay || `User ${user}`);
      }
    }
  };

  const [timeoutMenuOpen, setTimeoutMenuOpen] = useState(false);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            {hasScreenShare && isWatchingUser && user !== ownId ? (
              <ContextMenuItem
                variant="destructive"
                onSelect={() => stopWatching(user)}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon.CircleStop /> Stop Watching
              </ContextMenuItem>
            ) : (
              <ContextMenuItem
                disabled={!hasScreenShare || user === ownId}
                onSelect={() => startWatching(user)}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon.CirclePlay /> Start Watching
              </ContextMenuItem>
            )}
            <ContextMenuItem
              disabled={!hasScreenShare || !isWatchingUser || user === ownId}
              onSelect={handlePopout}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon.ExternalLink /> Pop Out
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem
              variant="destructive"
              disabled={!ownIsAdmin || user === ownId}
              onSelect={() => disconnectUser(user)}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon.Gavel /> Disconnect User
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              disabled={!ownIsAdmin || user === ownId}
              onSelect={() => setTimeoutMenuOpen(true)}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon.Timer /> Timeout User
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
                  new Date(Date.now() + 1 * 60 * 1000).getTime(),
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
                  new Date(Date.now() + 5 * 60 * 1000).getTime(),
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
                  new Date(Date.now() + 60 * 60 * 1000).getTime(),
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
                  new Date(Date.now() + 24 * 60 * 60 * 1000).getTime(),
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
