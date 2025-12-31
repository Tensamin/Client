// Package Imports
import { isTrackReference } from "@livekit/components-core";
import {
  useMaybeTrackRefContext,
  useParticipantContext,
  useParticipantInfo,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import * as Icon from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

// Lib Imports
import { fallbackUser } from "@/lib/types";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";
import { useUserContext } from "@/context/user";

// Components
import { LoadingIcon } from "@/components/loading";
import { cn } from "@/lib/utils";
import { ParticipantContextMenu } from "../menus";
import { CallModal } from "./raw";

// Main
export function CallUserModal({
  hideBadges,
  inGridView,
}: {
  hideBadges?: boolean;
  inGridView?: boolean;
}) {
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
    ? participantData[identity]?.deafened ?? false
    : false;

  // Get muted state directly from participant's audio track publication
  const audioPublication = participant?.getTrackPublication(
    Track.Source.Microphone
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
      title={user.display}
      icon={user.avatar || undefined}
      loading={user.loading}
      isAdmin={getIsAdmin()}
      muted={muted}
      deafened={deafened}
      screenShareTrackRef={screenShareTrackRef}
      hideBadges={hideBadges}
    />
  ) : (
    <LoadingIcon />
  );
}

export function TileContent({
  hideBadges,
  containerSize,
}: {
  hideBadges?: boolean;
  containerSize?: { width: number; height: number };
} = {}) {
  const participant = useParticipantContext();
  const {
    isSpeaking: localIsSpeaking,
    speakingByIdentity,
    isMuted,
  } = useSubCallContext();
  const { isAtMax, setIsAtMax, currentLayout } = useCallContext();
  const inGridView = currentLayout === "grid";

  const speakingFromMap = participant.identity
    ? speakingByIdentity[participant.identity]
    : undefined;

  const isSpeaking = participant.isLocal
    ? localIsSpeaking && !isMuted
    : speakingFromMap ?? participant.isSpeaking;

  const focusContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerSize) return;

    const containerWidth = containerSize.width;
    const focusWidth = focusContainerRef.current?.clientWidth ?? 0;
    const substact = focusWidth - containerWidth;
    setIsAtMax(substact >= -8);
  }, [containerSize, setIsAtMax]);

  return (
    <ParticipantContextMenu>
      <div
        ref={focusContainerRef}
        className={cn(
          "aspect-video relative w-full max-h-full bg-black",
          isAtMax ? "" : "rounded-xl"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 transition-all ease-in-out duration-400 pointer-events-none z-30",
            isSpeaking ? "ring-3 ring-primary ring-inset" : "",
            isAtMax ? "rounded-none" : "rounded-xl"
          )}
        />

        <div className="w-full h-full flex items-center justify-center rounded-xl z-10 bg-black">
          <CallUserModal inGridView={inGridView} hideBadges={hideBadges} />
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
