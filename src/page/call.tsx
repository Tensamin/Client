"use client";

// Package Imports
import { useCallback, useEffect, useMemo, useState } from "react";
import { Track } from "livekit-client";
import {
  useTracks,
  useMaybeTrackRefContext,
  useIsSpeaking,
} from "@livekit/components-react";
import { isTrackReference } from "@livekit/components-core";
import type {
  TrackReferenceOrPlaceholder,
  ParticipantClickEvent,
} from "@livekit/components-core";
import * as Icon from "lucide-react";
import { toast } from "sonner";

// Lib Imports
import { User } from "@/lib/types";

// Context Imports
import { useCallContext } from "@/context/call";
import { useUserContext } from "@/context/user";

// Components
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CallUserModal } from "@/components/modals/call";
import { CallGrid } from "./call/grid";
import { CallFocus } from "./call/focus";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/modals/raw";
import {
  DeafButton,
  MuteButton,
  ScreenShareButton,
} from "@/components/modals/call";
import { useSocketContext } from "@/context/socket";

// Helper Functions
function mergeParticipantTracks(
  tracks: TrackReferenceOrPlaceholder[]
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

  // track management
  const trackReferences = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  const participantTracks = useMemo(
    () => mergeParticipantTracks(trackReferences),
    [trackReferences]
  );

  // focus stuff
  const [focusedTrackSid, setFocusedTrackSid] = useState<string | null>(null);

  const focusedTrackRef = useMemo(() => {
    if (!focusedTrackSid) {
      return undefined;
    }

    return participantTracks.find(
      (track) =>
        isTrackReference(track) &&
        track.publication?.trackSid === focusedTrackSid
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
          track.participant.identity === participantIdentity
      );

      return fallbackTrack?.publication?.trackSid ?? null;
    },
    [participantTracks]
  );

  const handleParticipantClick = useCallback(
    (event: ParticipantClickEvent) => {
      const trackSid = resolveTrackSid(
        event.participant.identity,
        event.track?.trackSid
      );
      if (!trackSid) {
        return;
      }

      setFocusedTrackSid((current) => (current === trackSid ? null : trackSid));
    },
    [resolveTrackSid]
  );

  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col w-full h-full py-5 gap-5">
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
      <div className="flex justify-center">
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
            onClick={() => disconnect()}
          >
            <Icon.LogOut />
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
  userId: string;
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
        }).then((data) => {
          if (!data.type.startsWith("error")) {
            toast.success("Call invite sent successfully");
          } else {
            toast.error("Failed to send call invite");
          }
          onClose();
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
}: { hideBadges?: boolean; small?: boolean } = {}) {
  const isSpeaking = useIsSpeaking();
  return (
    <div className="aspect-video relative w-full max-h-full">
      <div
        className={`absolute inset-0 rounded-xl transition-all ease-in-out duration-400 pointer-events-none z-20 ${
          isSpeaking && "ring-3 ring-primary ring-inset"
        }`}
      />

      <div className="w-full h-full flex items-center justify-center rounded-xl z-10">
        <CallUserModal
          overwriteSize={small ? "extraLarge" : undefined}
          hideBadges={hideBadges}
        />
      </div>
    </div>
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
    <div className="absolute inset-0 bg-black/65 z-20 text-white flex items-center justify-center">
      <Icon.ScanEye className="h-6 w-6" />
    </div>
  );
}
