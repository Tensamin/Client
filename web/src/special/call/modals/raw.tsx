// Package Imports
import { TrackReference } from "@livekit/components-core";
import { VideoTrack } from "@livekit/components-react";
import * as Icon from "lucide-react";
import { useMemo } from "react";

// Lib Imports
import { AvatarSizes } from "@/lib/types";

// Context Imports
import { useSubCallContext } from "@/context/call";

// Components
import { LoadingIcon } from "@/components/loading";
import { UserAvatar } from "@/components/modals/raw";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Main
export function CallModal({
  overwriteSize,
  title,
  icon,
  loading,
  isAdmin,
  muted,
  deafened,
  screenShareTrackRef,
  hideBadges: isFocused,
  inGridView,
}: Readonly<{
  overwriteSize?: AvatarSizes;
  title: string;
  icon?: string;
  loading: boolean;
  isAdmin?: boolean;
  muted?: boolean;
  deafened?: boolean;
  screenShareTrackRef?: TrackReference;
  hideBadges?: boolean;
  inGridView?: boolean;
}>) {
  const { isWatching, participantData } = useSubCallContext();

  const isScreenShare = !!screenShareTrackRef;
  const isLocal = screenShareTrackRef?.participant?.isLocal;
  const currentIsWatching =
    isWatching[screenShareTrackRef?.participant?.identity ?? ""] ?? false;

  const participantIdentity = screenShareTrackRef?.participant?.identity;
  const previewImage = useMemo(() => {
    if (!participantIdentity) return null;
    return participantData[participantIdentity]?.stream_preview ?? null;
  }, [participantData, participantIdentity]);

  const renderScreenShareContent = () => {
    // Own Screen Share
    if (isLocal && (isFocused || inGridView)) {
      return (
        <>
          {previewImage && (
            <img
              src={previewImage}
              alt="Stream Preview"
              className="select-none bg-black absolute inset-0 w-full h-full object-contain opacity-30 z-0 rounded-xl"
            />
          )}
          <div className="select-none backdrop-blur-md font-semibold absolute inset-0 z-0 rounded-xl flex flex-col gap-3 items-center justify-center text-center px-5">
            Your screen is being shared. There is a preview at the bottom of the
            sidebar.
          </div>
        </>
      );
    }

    // Watching someone
    if (currentIsWatching && !isLocal) {
      return (
        <div className="absolute inset-0 w-full h-full rounded-xl">
          <VideoTrack
            trackRef={screenShareTrackRef!}
            className="bg-black rounded-xl h-full w-full object-contain select-none"
          />
        </div>
      );
    }

    // Preview
    if (previewImage) {
      return inGridView ? (
        <>
          <img
            src={previewImage}
            alt="Stream Preview"
            className="select-none bg-black absolute inset-0 w-full h-full object-contain opacity-30 blur-xs z-0 rounded-xl"
          />
          <Button className="z-10">
            <Icon.Monitor />
            Watch Stream
          </Button>
        </>
      ) : (
        <img
          src={previewImage}
          alt="Stream Preview"
          className="select-none bg-black absolute inset-0 w-full h-full object-contain z-0 rounded-xl"
        />
      );
    }

    // Loading
    return (
      <div>
        {renderUserAvatar()}
        <div className="absolute inset-0 rounded-xl w-full h-full bg-transparent flex p-3 justify-start items-start z-30">
          <LoadingIcon />
        </div>
      </div>
    );
  };

  const renderUserAvatar = () => {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <UserAvatar
          icon={icon}
          title={title}
          size={overwriteSize ? overwriteSize : "jumbo"}
          state={undefined}
          border
        />
      </div>
    );
  };

  return loading ? (
    <Card className="relative w-full h-full bg-card/75">
      <CardContent className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full h-full flex justify-center items-center">
          <UserAvatar
            title={title}
            size={overwriteSize ? overwriteSize : "jumbo"}
            border
            loading
          />
        </div>
        {!isFocused && (
          <div className="absolute h-full w-full flex items-end justify-start p-4 z-30">
            <Badge className="select-none">...</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card className="relative w-full h-full bg-card/75">
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
            <UserAvatar
              icon={icon}
              title={title}
              size={overwriteSize ? overwriteSize : "jumbo"}
              state={undefined}
              border
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
