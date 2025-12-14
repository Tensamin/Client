"use client";

// Package Imports
import type {
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { isTrackReference } from "@livekit/components-core";
import {
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useMaybeTrackRefContext,
  useParticipantContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import * as Icon from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import { User } from "@/lib/types";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";
import { useUserContext } from "@/context/user";

// Components
import {
  CallUserModal,
  DeafButton,
  MuteButton,
  ScreenShareButton,
} from "@/components/modals/call";
import { UserAvatar } from "@/components/modals/raw";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSocketContext } from "@/context/socket";
import { CallFocus } from "./call/focus";
import { CallGrid } from "./call/grid";

// Helper Functions
function mergeParticipantTracks(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder[] {
  const merged = new Map<string, TrackReferenceOrPlaceholder>();

  tracks.forEach((track) => {
    const identity = track.participant.identity;
    const existing = merged.get(identity);

    if (!existing || getTrackPriority(track) > getTrackPriority(existing)) {
      merged.set(identity, track);
    }
  });

  return Array.from(merged.values());
}

function getTrackPriority(track: TrackReferenceOrPlaceholder) {
  if (track.source === Track.Source.ScreenShare) {
    return 3;
  }

  if (track.source === Track.Source.Camera && isTrackReference(track)) {
    return 2;
  }

  if (track.source === Track.Source.Camera) {
    return 1;
  }

  return 0;
}

// Main
export default function Page() {
  const { conversations } = useUserContext();
  const { disconnect } = useCallContext();
  const { startWatching, stopWatching } = useSubCallContext();

  // track management
  const trackReferences = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const participantTracks = useMemo(
    () => mergeParticipantTracks(trackReferences),
    [trackReferences],
  );

  // focus stuff
  const [focusedTrackSid, setFocusedTrackSid] = useState<string | null>(null);

  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();

  useEffect(() => {
    if (localParticipant && connectionState === ConnectionState.Connected) {
      const currentMetadata = localParticipant.metadata
        ? JSON.parse(localParticipant.metadata)
        : {};

      if (currentMetadata.watching_stream !== focusedTrackSid) {
        localParticipant
          .setMetadata(
            JSON.stringify({
              ...currentMetadata,
              watching_stream: focusedTrackSid,
            }),
          )
          .catch(() => {});
      }
    }
  }, [focusedTrackSid, localParticipant, connectionState]);

  const focusedTrackRef = useMemo(() => {
    if (!focusedTrackSid) {
      return undefined;
    }

    return participantTracks.find(
      (track) =>
        isTrackReference(track) &&
        track.publication?.trackSid === focusedTrackSid,
    );
  }, [participantTracks, focusedTrackSid]);

  useEffect(() => {
    if (focusedTrackSid && !focusedTrackRef) {
      setFocusedTrackSid(null);
    }
  }, [focusedTrackRef, focusedTrackSid]);

  // click handling
  const resolveTrackSid = useCallback(
    (participantIdentity: string, publicationSid?: string | null) => {
      if (publicationSid) {
        return publicationSid;
      }

      const fallbackTrack = participantTracks.find(
        (track) =>
          isTrackReference(track) &&
          track.participant.identity === participantIdentity,
      );

      return fallbackTrack?.publication?.trackSid ?? null;
    },
    [participantTracks],
  );

  const handleParticipantClick = useCallback(
    (event: ParticipantClickEvent) => {
      const trackSid = resolveTrackSid(
        event.participant.identity,
        event.track?.trackSid,
      );
      if (!trackSid) {
        return;
      }

      startWatching(event.participant.identity);
      setFocusedTrackSid((current) => (current === trackSid ? null : trackSid));
    },
    [resolveTrackSid, startWatching],
  );

  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col w-full h-full gap-5 relative pb-11">
      <div className="flex-1">
        {focusedTrackRef ? (
          <CallFocus
            focusedTrackRef={focusedTrackRef}
            participantTracks={participantTracks}
            focusedTrackSid={focusedTrackSid}
            onParticipantClick={handleParticipantClick}
          />
        ) : (
          <CallGrid
            participantTracks={participantTracks}
            onParticipantClick={handleParticipantClick}
            className="h-full"
          />
        )}
      </div>
      <div className="absolute bottom-3 left-0 flex justify-center w-full">
        <div className="flex gap-3 bg-card p-1.5 rounded-lg border">
          {/* Mute Button */}
          <MuteButton ghostMode className="w-10" />
          {/* Deaf Button */}
          <DeafButton ghostMode className="w-10" />
          {/* Screen Share Button */}
          <ScreenShareButton ghostMode className="w-10" />
          {/* Future Camera Button */}
          <Button disabled variant="ghost" className="w-10 h-9">
            <Icon.Camera />
          </Button>
          {/* Invite Button */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-10 h-9">
                <Icon.MailPlus />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search conversations..." />
                <CommandList>
                  <CommandEmpty>No conversation found.</CommandEmpty>
                  <CommandGroup>
                    {conversations.map((conversation) => (
                      <UserInInviteSelection
                        userId={conversation.user_id}
                        key={conversation.user_id}
                        onClose={() => {
                          setOpen(false);
                        }}
                      />
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {/* Leave Button */}
          <Button
            className="w-10 h-9"
            variant="destructive"
            onClick={() => {
              if (focusedTrackRef) {
                setFocusedTrackSid(null);
                stopWatching(focusedTrackRef.participant.identity);
              } else {
                disconnect();
              }
            }}
          >
            {focusedTrackRef ? <Icon.X /> : <Icon.LogOut />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserInInviteSelection({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const { get } = useUserContext();
  const { send } = useSocketContext();
  const { callId } = useCallContext();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    get(userId, false).then((data) => {
      setUser(data);
    });
  }, [userId, get]);
  return (
    <CommandItem
      value={user?.display}
      onSelect={() => {
        send("call_invite", {
          receiver_id: userId,
          call_id: callId,
        })
          .then(() => {
            toast.success("Call invite sent successfully");
            onClose();
          })
          .catch(() => {
            toast.error("Failed to send call invite");
          });
      }}
    >
      <UserAvatar
        border
        icon={user?.avatar}
        size="small"
        title={user?.display ?? ""}
        loading={!user}
      />
      {user?.display}
    </CommandItem>
  );
}
export function TileContent({
  hideBadges,
  small,
  inGridView,
}: { hideBadges?: boolean; small?: boolean; inGridView?: boolean } = {}) {
  const isSpeaking = useIsSpeaking();
  const participant = useParticipantContext();
  const { startWatching, stopWatching, isWatching } = useSubCallContext();

  const identity = participant.identity;
  const isWatchingUser = isWatching[identity];
  const hasScreenShare =
    participant.getTrackPublication(Track.Source.ScreenShare) !== undefined;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="aspect-video relative w-full max-h-full">
          <div
            className={`absolute inset-0 rounded-xl transition-all ease-in-out duration-400 pointer-events-none z-20 ${
              isSpeaking && "ring-3 ring-primary ring-inset"
            }`}
          />

          <div className="w-full h-full flex items-center justify-center rounded-xl z-10">
            <CallUserModal
              inGridView={inGridView}
              overwriteSize={small ? "extraLarge" : undefined}
              hideBadges={hideBadges}
            />
          </div>
        </div>
      </ContextMenuTrigger>
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

export function FocusDuplicateOverlay({
  focusedTrackSid,
}: {
  focusedTrackSid: string | null;
}) {
  const trackRef = useMaybeTrackRefContext();
  if (!focusedTrackSid || !trackRef || !isTrackReference(trackRef)) {
    return null;
  }

  const isDuplicate = trackRef.publication?.trackSid === focusedTrackSid;
  if (!isDuplicate) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/65 z-20 text-white flex items-center justify-center pointer-events-none">
      <Icon.ScanEye className="h-6 w-6" />
    </div>
  );
}
