// Package Imports
import { isTrackReference } from "@livekit/components-core";
import {
  useMaybeTrackRefContext,
  useParticipantContext,
  useParticipantInfo,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import * as Icon from "lucide-react";
import { useCallback, useEffect } from "react";

// Lib Imports
import { AvatarSizes, fallbackUser } from "@/lib/types";

// Context Imports
import { useSubCallContext } from "@/context/call";
import { useUserContext } from "@/context/user";

// Components
import { LoadingIcon } from "@/components/loading";
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
  const { identity } = useParticipantInfo();
  const participant = useParticipantContext();
  const trackRef = useMaybeTrackRefContext();
  const { get, fetchedUsers } = useUserContext();
  const { participantData } = useSubCallContext();

  const screenShareTrackRef =
    trackRef &&
    isTrackReference(trackRef) &&
    trackRef.source === Track.Source.ScreenShare
      ? trackRef
      : undefined;

  const userId = identity ? Number(identity) : 0;
  const deafened = identity
    ? (participantData[identity]?.deafened ?? false)
    : false;

  // Get muted state directly from participant's audio track publication
  const audioPublication = participant?.getTrackPublication(
    Track.Source.Microphone,
  );
  const muted = audioPublication?.isMuted ?? false;

  const getIsAdmin = useCallback(() => {
    if (!participant?.metadata) return false;
    return JSON.parse(participant.metadata).isAdmin;
  }, [participant.metadata]);

  // Fetch user data independently
  useEffect(() => {
    if (!userId) return;

    const cachedUser = fetchedUsers.get(userId);
    if (cachedUser && !cachedUser.loading) {
      return;
    }
    get(userId, false);
  }, [userId, get, fetchedUsers]);

  // Get user data from context
  const user = fetchedUsers.get(userId) ?? fallbackUser;

  return identity && identity !== "" ? (
    <CallModal
      overwriteSize={overwriteSize}
      title={user.display}
      icon={user.avatar || undefined}
      loading={user.loading}
      isAdmin={getIsAdmin()}
      muted={muted}
      deafened={deafened}
      screenShareTrackRef={screenShareTrackRef}
      hideBadges={hideBadges}
      inGridView={inGridView}
    />
  ) : (
    <LoadingIcon />
  );
}

export function TileContent({
  hideBadges,
  small,
  inGridView,
}: { hideBadges?: boolean; small?: boolean; inGridView?: boolean } = {}) {
  const participant = useParticipantContext();
  const { isSpeaking: localIsSpeaking, speakingByIdentity } =
    useSubCallContext();

  const speakingFromMap = participant.identity
    ? speakingByIdentity[participant.identity]
    : undefined;

  // Prefer our detector for every participant, fall back to LiveKit's flag
  const isSpeaking = participant.isLocal
    ? localIsSpeaking
    : (speakingFromMap ?? participant.isSpeaking);

  return (
    <ParticipantContextMenu>
      <div className="aspect-video relative w-full max-h-full bg-black rounded-xl">
        <div
          className={`absolute inset-0 rounded-xl transition-all ease-in-out duration-400 pointer-events-none z-30 ${
            isSpeaking && "ring-3 ring-primary ring-inset"
          }`}
        />

        <div className="w-full h-full flex items-center justify-center rounded-xl z-10 bg-black">
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
    <div className="absolute inset-0 bg-black/65 z-20 text-white flex items-center justify-center pointer-events-none rounded-xl border">
      <Icon.ScanEye className="h-6 w-6" />
    </div>
  );
}
