// Package Imports
import { isTrackReference } from "@livekit/components-core";
import {
  useIsSpeaking,
  useMaybeTrackRefContext,
  useParticipantContext,
  useParticipantInfo,
} from "@livekit/components-react";
import { ParticipantEvent, Track } from "livekit-client";
import * as Icon from "lucide-react";
import { useEffect, useState } from "react";

// Lib Imports
import { AvatarSizes, fallbackUser } from "@/lib/types";

// Context Imports
import { useUserContext } from "@/context/user";

// Components
import { ParticipantContextMenu } from "../layout/menus";
import { CallModal } from "./raw";

// Main
export function CallUserModal({
  hideBadges,
  overwriteSize,
  inGridView,
}: {
  hideBadges?: boolean;
  overwriteSize?: AvatarSizes;
  inGridView?: boolean;
} = {}) {
  const { identity, metadata } = useParticipantInfo();
  const participant = useParticipantContext();
  const trackRef = useMaybeTrackRefContext();
  const { get, fetchedUsers } = useUserContext();

  const screenShareTrackRef =
    trackRef &&
    isTrackReference(trackRef) &&
    trackRef.source === Track.Source.ScreenShare
      ? trackRef
      : undefined;

  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const userId = identity ? Number(identity) : 0;

  // Fetch user data independently
  useEffect(() => {
    if (!userId) return;

    const cachedUser = fetchedUsers.get(userId);
    if (cachedUser && !cachedUser.loading) {
      return;
    }
    get(userId, false);
  }, [userId, get, fetchedUsers]);

  useEffect(() => {
    if (metadata) {
      try {
        const data = JSON.parse(metadata);
        setDeafened(!!data.deafened);
      } catch {}
    }
  }, [metadata]);

  useEffect(() => {
    if (!participant) {
      return;
    }

    const handleMuted = () => setMuted(true);
    const handleUnmuted = () => setMuted(false);

    participant.on(ParticipantEvent.TrackMuted, handleMuted);
    participant.on(ParticipantEvent.TrackUnmuted, handleUnmuted);

    return () => {
      participant.off(ParticipantEvent.TrackMuted, handleMuted);
      participant.off(ParticipantEvent.TrackUnmuted, handleUnmuted);
    };
  }, [participant]);

  // Get user data from context
  const user = fetchedUsers.get(userId) ?? fallbackUser;

  return identity && identity !== "" ? (
    <CallModal
      overwriteSize={overwriteSize}
      title={user.display}
      icon={user.avatar || undefined}
      loading={user.loading}
      muted={muted}
      deafened={deafened}
      screenShareTrackRef={screenShareTrackRef}
      hideBadges={hideBadges}
      inGridView={inGridView}
    />
  ) : identity !== "" ? (
    <p>Loading...</p>
  ) : (
    <p>Error</p>
  );
}

export function TileContent({
  hideBadges,
  small,
  inGridView,
}: { hideBadges?: boolean; small?: boolean; inGridView?: boolean } = {}) {
  const isSpeaking = useIsSpeaking();

  return (
    <ParticipantContextMenu>
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
    </ParticipantContextMenu>
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
