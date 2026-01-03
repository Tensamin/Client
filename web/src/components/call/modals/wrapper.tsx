// Package Imports
import {
  getTrackReferenceId,
  isTrackReference,
  TrackReference,
} from "@livekit/components-core";
import {
  useMaybeTrackRefContext,
  useParticipantContext,
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
import ParticipantContextMenu from "../ParticipantContextMenu";
import { CallModal } from "./raw";

// Main
export function CallUserModal({
  hideBadges,
  onPopout,
}: {
  hideBadges?: boolean;
  onPopout?: (trackRef: TrackReference, title: string) => void;
}) {
  const participant = useParticipantContext();
  const trackRef = useMaybeTrackRefContext();
  const { get, fetchedUsers } = useUserContext();
  const { participantData } = useSubCallContext();

  const user = Number(participant.identity);

  const screenShareTrackRef =
    trackRef &&
    isTrackReference(trackRef) &&
    trackRef.source === Track.Source.ScreenShare
      ? trackRef
      : undefined;

  const userId = user ? user : 0;
  const deafened = user ? (participantData[user]?.deafened ?? false) : false;

  // Get muted state
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
  const userData = fetchedUsers.get(userId) ?? fallbackUser;

  return userId && userId !== 0 ? (
    <CallModal
      title={userData.display}
      icon={userData.avatar || undefined}
      loading={userData.loading}
      isAdmin={getIsAdmin()}
      muted={muted}
      deafened={deafened}
      screenShareTrackRef={screenShareTrackRef}
      hideBadges={hideBadges}
      onPopout={onPopout}
    />
  ) : (
    <LoadingIcon />
  );
}

export function TileContent({
  hideBadges,
  containerSize,
  onPopout,
}: {
  hideBadges?: boolean;
  containerSize?: { width: number; height: number };
  onPopout?: (trackRef: TrackReference, title: string) => void;
} = {}) {
  const participant = useParticipantContext();
  const {
    isSpeaking: localIsSpeaking,
    speakingByIdentity,
    isMuted,
  } = useSubCallContext();
  const { setIsAtMax, isAtMax } = useCallContext();

  const speakingFromMap = participant.identity
    ? speakingByIdentity[Number(participant.identity)]
    : undefined;

  const isSpeaking = participant.isLocal
    ? localIsSpeaking && !isMuted
    : (speakingFromMap ?? participant.isSpeaking);

  const focusContainerRef = useRef<HTMLDivElement | null>(null);

  // Detects if the focused element is at the container edges
  useEffect(() => {
    const element = focusContainerRef.current;
    if (!element) return;

    const checkMaxState = () => {
      if (!containerSize) {
        setIsAtMax(false);
        return;
      }

      const containerWidth = containerSize.width;
      const focusWidth = element.clientWidth;
      const subtract = focusWidth - containerWidth;
      setIsAtMax(subtract >= -8);
    };

    // Initial check
    checkMaxState();

    const resizeObserver = new ResizeObserver(() => {
      checkMaxState();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerSize, setIsAtMax]);

  return (
    <ParticipantContextMenu>
      <div
        ref={focusContainerRef}
        className="aspect-video relative w-full max-h-full"
      >
        {/* Speaking indicator */}
        <div
          className={cn(
            "absolute inset-0 transition-all ease-in-out duration-400 pointer-events-none z-30",
            isAtMax && hideBadges ? "" : "rounded-xl",
            isSpeaking ? "ring-3 ring-primary ring-inset" : "",
          )}
        />

        <div className="w-full h-full flex items-center justify-center z-10">
          <CallUserModal hideBadges={hideBadges} onPopout={onPopout} />
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
  if (!focusedTrackSid || !trackRef) {
    return null;
  }

  const isDuplicate = getTrackReferenceId(trackRef) === focusedTrackSid;
  if (!isDuplicate) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/65 z-20 text-white flex items-center justify-center pointer-events-none rounded-xl border">
      <Icon.ScanEye className="h-6 w-6" />
    </div>
  );
}
