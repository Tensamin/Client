// Package Imports
import { TrackReference } from "@livekit/components-core";
import { VideoTrack } from "@livekit/components-react";
import * as Icon from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";

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
import { cn } from "@/lib/utils";

// Types
interface ScreenShareControlsProps {
  onFullscreen: () => void;
  onPopout: () => void;
  isFullscreen: boolean;
}

// Screen Share Controls Component
function ScreenShareControls({
  onFullscreen,
  onPopout,
  isFullscreen,
}: ScreenShareControlsProps) {
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

// Main
export function CallModal({
  title,
  icon,
  loading,
  isAdmin,
  muted,
  deafened,
  screenShareTrackRef,
  hideBadges: isFocused = false,
  onPopout,
}: Readonly<{
  title: string;
  icon?: string;
  loading: boolean;
  isAdmin?: boolean;
  muted?: boolean;
  deafened?: boolean;
  screenShareTrackRef?: TrackReference;
  hideBadges?: boolean;
  onPopout?: (trackRef: TrackReference, title: string) => void;
}>) {
  const { isWatching, participantData } = useSubCallContext();
  const { isAtMax, inGridView } = useCallContext();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isScreenShare = !!screenShareTrackRef;
  const isLocal = screenShareTrackRef?.participant?.isLocal;
  const currentIsWatching =
    isWatching[Number(screenShareTrackRef?.participant?.identity)] ?? false;

  const participantIdentity = Number(
    screenShareTrackRef?.participant?.identity,
  );
  const previewImage = useMemo(() => {
    if (!participantIdentity) return null;
    return participantData[participantIdentity]?.stream_preview ?? null;
  }, [participantData, participantIdentity]);

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
    if (screenShareTrackRef && onPopout) {
      onPopout(screenShareTrackRef, title);
    }
  }, [screenShareTrackRef, onPopout, title]);

  // Listen for fullscreen changes
  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  // Set up fullscreen event listener
  useMemo(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

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
    if (isLocal && (isFocused || inGridView)) {
      return (
        <>
          {previewImage && (
            <img
              src={previewImage}
              alt="Stream Preview"
              className={cn(
                "blur-xs select-none bg-black absolute inset-0 w-full h-full object-contain opacity-30 z-0",
                isAtMax && isFocused ? "" : "rounded-xl",
              )}
            />
          )}
          <div
            className={cn(
              "select-none backdrop-blur-md font-semibold absolute inset-0 z-0 flex flex-col gap-3 items-center justify-center text-center px-5",
              isAtMax && isFocused ? "" : "rounded-xl",
            )}
          >
            Your screen is being shared. There is a preview at the bottom of the
            sidebar.
          </div>
        </>
      );
    }

    // Own screen share (small)
    if (isLocal && !isFocused && !inGridView) {
      return (
        <>
          {previewImage && (
            <img
              src={previewImage}
              alt="Stream Preview"
              className={cn(
                "blur-xs select-none bg-black absolute inset-0 w-full h-full object-contain z-0",
                isAtMax && isFocused ? "" : "rounded-xl",
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
              isAtMax && isFocused ? "" : "rounded-xl",
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
              isAtMax && isFocused ? "" : "rounded-xl",
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
    isFocused,
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

  return loading ? (
    <Card
      className={cn(
        "relative w-full h-full bg-card/75",
        isFocused ? "rounded-none border-x-0" : "rounded-xl",
      )}
    >
      <CardContent className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full h-full flex justify-center items-center">
          <Avatar image={null} display={title} size={12} addBorder loading />
        </div>
        {!isFocused && (
          <div className="absolute h-full w-full flex items-end justify-start p-4 z-30">
            <Badge className="select-none">...</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card
      className={cn(
        "relative w-full h-full bg-card/75",
        isAtMax && isFocused ? "rounded-none border-x-0" : "rounded-xl",
      )}
    >
      <CardContent className="w-full h-full flex flex-col items-center justify-center">
        {!isFocused && (
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
              size={inGridView || isFocused ? 54 : 32}
              addBorder
              loading={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
