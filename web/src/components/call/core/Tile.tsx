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
import { VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import * as Icon from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Lib Imports
import { cn } from "@/lib/utils";

// Core Context Imports
import { useCallSession } from "./CallSessionContext";
import { useUserData } from "./UserDataContext";
import { useMaybeCallPageContext } from "./CallPageContext";

// Components
import { LoadingIcon } from "@/components/loading";
import Avatar from "@/components/modals/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Screen Share Controls Component
function ScreenShareControls({
  onFullscreen,
  onPopout,
  isFullscreen,
}: {
  onFullscreen: () => void;
  onPopout: () => void;
  isFullscreen: boolean;
}) {
  return (
    <div className="absolute top-2 right-2 z-40 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-8 w-8 bg-background rounded-xl">
            <Button
              variant="outline"
              size="icon"
              className="h-full w-full"
              onClick={(e) => {
                e.stopPropagation();
                onPopout();
              }}
            >
              <Icon.ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>Pop out to new window</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-8 w-8 bg-background rounded-xl">
            <Button
              variant="outline"
              size="icon"
              className="h-full w-full"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreen();
              }}
            >
              {isFullscreen ? (
                <Icon.Minimize className="h-4 w-4" />
              ) : (
                <Icon.Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// Main Tile Component
export default function Tile({
  hideBadges = false,
  containerSize,
  onPopout,
}: {
  hideBadges?: boolean;
  containerSize?: { width: number; height: number };
  onPopout?: (trackRef: TrackReference, title: string) => void;
}) {
  const participant = useParticipantContext();
  const trackRef = useMaybeTrackRefContext();
  const callPageContext = useMaybeCallPageContext();

  // Get values from core contexts
  const {
    participantData,
    isWatching,
    isSpeaking: localIsSpeaking,
    speakingByIdentity,
    isMuted,
    isAtMax,
    setIsAtMax,
    inGridView,
  } = useCallSession();

  const { get, fetchedUsers } = useUserData();

  const focusContainerRef = useRef<HTMLDivElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // User data
  const user = Number(participant.identity);
  const userId = user ? user : 0;

  // Track references
  const screenShareTrackRef =
    trackRef &&
    isTrackReference(trackRef) &&
    trackRef.source === Track.Source.ScreenShare
      ? trackRef
      : undefined;

  const isScreenShare = !!screenShareTrackRef;
  const isLocal = screenShareTrackRef?.participant?.isLocal;

  // Participant state
  const deafened = user ? (participantData[user]?.deafened ?? false) : false;
  const audioPublication = participant?.getTrackPublication(
    Track.Source.Microphone,
  );
  const muted = audioPublication?.isMuted ?? false;

  // Speaking state
  const speakingFromMap = participant.identity
    ? speakingByIdentity[Number(participant.identity)]
    : undefined;

  const isSpeaking = participant.isLocal
    ? localIsSpeaking && !isMuted
    : (speakingFromMap ?? participant.isSpeaking);

  // Admin state
  const getIsAdmin = useCallback(() => {
    if (!participant?.metadata) return false;
    try {
      return JSON.parse(participant.metadata).isAdmin;
    } catch {
      return false;
    }
  }, [participant.metadata]);

  const isAdmin = getIsAdmin();

  // Screen share state
  const participantIdentity = Number(
    screenShareTrackRef?.participant?.identity,
  );
  const currentIsWatching = isWatching[participantIdentity] ?? false;
  const previewImage = useMemo(() => {
    if (!participantIdentity) return null;
    return participantData[participantIdentity]?.stream_preview ?? null;
  }, [participantData, participantIdentity]);

  // Fetch user data
  useEffect(() => {
    if (!userId) return;

    const cachedUser = fetchedUsers.get(userId);
    if (cachedUser && !cachedUser.loading) {
      return;
    }
    get(userId, false);
  }, [userId, get, fetchedUsers]);

  // Get user data from context
  const fallbackUser = {
    id: userId,
    username: `user_${userId}`,
    display: `User ${userId}`,
    avatar: null,
    loading: false,
  };
  const userDataFromCache = fetchedUsers.get(userId) ?? fallbackUser;
  const title = userDataFromCache.display;
  const icon = userDataFromCache.avatar || undefined;
  const loading = userDataFromCache.loading;

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

    checkMaxState();

    const resizeObserver = new ResizeObserver(() => {
      checkMaxState();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerSize, setIsAtMax]);

  // Fullscreen handlers
  const handleFullscreen = useCallback(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container
        .requestFullscreen?.()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch(() => {
          // Fullscreen request failed
        });
    } else {
      document
        .exitFullscreen?.()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch(() => {
          // Exit fullscreen failed
        });
    }
  }, []);

  const handlePopout = useCallback(() => {
    if (screenShareTrackRef) {
      if (onPopout) {
        onPopout(screenShareTrackRef, title);
      } else if (callPageContext?.openPopout) {
        callPageContext.openPopout(screenShareTrackRef, title);
      }
    }
  }, [screenShareTrackRef, onPopout, title, callPageContext]);

  // Listen for fullscreen changes
  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  // Render functions
  const renderAvatar = useCallback(() => {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Avatar
          image={icon}
          display={title}
          size={12}
          addBorder
          loading={false}
        />
      </div>
    );
  }, [icon, title]);

  const renderScreenShareContent = useCallback(() => {
    // Own screen share (big)
    if (isLocal && (hideBadges || inGridView)) {
      return (
        <>
          {previewImage && (
            <img
              src={previewImage}
              alt="Stream Preview"
              className={cn(
                "blur-xs select-none bg-black absolute inset-0 w-full h-full object-contain opacity-30 z-0",
                isAtMax && hideBadges ? "" : "rounded-xl",
              )}
            />
          )}
          <div
            className={cn(
              "select-none backdrop-blur-md font-semibold absolute inset-0 z-0 flex flex-col gap-3 items-center justify-center text-center px-5",
              isAtMax && hideBadges ? "" : "rounded-xl",
            )}
          >
            Your screen is being shared. There is a preview at the bottom of the
            sidebar.
          </div>
        </>
      );
    }

    // Own screen share (small)
    if (isLocal && !hideBadges && !inGridView) {
      return (
        <>
          {previewImage && (
            <img
              src={previewImage}
              alt="Stream Preview"
              className={cn(
                "blur-xs select-none bg-black absolute inset-0 w-full h-full object-contain z-0",
                isAtMax && hideBadges ? "" : "rounded-xl",
              )}
            />
          )}
        </>
      );
    }

    // Active screen share
    if (currentIsWatching && !isLocal) {
      return (
        <div
          ref={videoContainerRef}
          className={cn(
            "absolute inset-0 w-full h-full group",
            isFullscreen && "bg-black",
          )}
        >
          <VideoTrack
            trackRef={screenShareTrackRef!}
            className={cn(
              "bg-black h-full w-full object-contain select-none",
              isAtMax && hideBadges ? "" : "rounded-xl",
              isFullscreen && "rounded-none",
            )}
          />
          <ScreenShareControls
            onFullscreen={handleFullscreen}
            onPopout={handlePopout}
            isFullscreen={isFullscreen}
          />
        </div>
      );
    }

    // Preview
    if (previewImage) {
      return (
        <>
          <img
            src={previewImage}
            alt="Stream Preview"
            className={cn(
              "blur-xs select-none bg-black absolute inset-0 w-full h-full object-contain opacity-30 z-0",
              isAtMax && hideBadges ? "" : "rounded-xl",
            )}
          />
          <Button className="z-10">
            <Icon.Monitor />
            Watch Stream
          </Button>
        </>
      );
    }

    // Loading
    return (
      <div>
        {renderAvatar()}
        <div className="absolute inset-0 w-full h-full bg-transparent flex p-3 justify-start items-start z-30">
          <LoadingIcon />
        </div>
      </div>
    );
  }, [
    isLocal,
    hideBadges,
    inGridView,
    previewImage,
    isAtMax,
    currentIsWatching,
    screenShareTrackRef,
    isFullscreen,
    handleFullscreen,
    handlePopout,
    renderAvatar,
  ]);

  const renderContent = useCallback(() => {
    if (!userId || userId === 0) {
      return <LoadingIcon />;
    }

    if (loading) {
      return (
        <Card
          className={cn(
            "relative w-full h-full bg-card/75",
            hideBadges ? "rounded-none border-x-0" : "rounded-xl",
          )}
        >
          <CardContent className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-full h-full flex justify-center items-center">
              <Avatar
                image={null}
                display={title}
                size={12}
                addBorder
                loading
              />
            </div>
            {!hideBadges && (
              <div className="absolute h-full w-full flex items-end justify-start p-4 z-30">
                <Badge className="select-none">...</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        className={cn(
          "relative w-full h-full bg-card/75",
          isAtMax && hideBadges ? "rounded-none border-x-0" : "rounded-xl",
        )}
      >
        <CardContent className="w-full h-full flex flex-col items-center justify-center">
          {!hideBadges && (
            <div className="absolute h-full w-full flex items-end justify-start p-2 gap-2 pointer-events-none z-30">
              <Badge
                variant="outline"
                className="h-5.5 select-none bg-background/75 border-input"
              >
                {isScreenShare ? `${title}'s screen` : title}
              </Badge>
              {muted && (
                <Badge className="h-5.5 select-none bg-background/75 border-input">
                  <Icon.MicOff color="var(--foreground)" />
                </Badge>
              )}
              {deafened && (
                <Badge className="h-5.5 select-none bg-background/75 border-input">
                  <Icon.HeadphoneOff color="var(--foreground)" />
                </Badge>
              )}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="h-5.5 select-none bg-background/75 border-input pointer-events-auto">
                      <Icon.ShieldCheck color="var(--foreground)" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    This user is the call creator and has administrative
                    privileges.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          {isScreenShare && screenShareTrackRef ? (
            renderScreenShareContent()
          ) : (
            <div className="w-full h-full flex justify-center items-center">
              <Avatar
                image={icon}
                display={title}
                size={inGridView || hideBadges ? 54 : 32}
                addBorder
                loading={false}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }, [
    userId,
    loading,
    title,
    icon,
    hideBadges,
    isAtMax,
    isScreenShare,
    screenShareTrackRef,
    muted,
    deafened,
    isAdmin,
    inGridView,
    renderScreenShareContent,
  ]);

  return (
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
        {renderContent()}
      </div>
    </div>
  );
}

// Export FocusDuplicateOverlay as it's used separately
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
