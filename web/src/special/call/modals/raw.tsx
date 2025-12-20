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
import { LoadingBlock } from "@/components/loading";
import { UserAvatar } from "@/components/modals/raw";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Main
export function CallModal({
  overwriteSize,
  title,
  icon,
  loading,
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
  muted?: boolean;
  deafened?: boolean;
  screenShareTrackRef?: TrackReference;
  hideBadges?: boolean;
  inGridView?: boolean;
}>) {
  const { isWatching } = useSubCallContext();

  const isScreenShare = !!screenShareTrackRef;
  const isLocal = screenShareTrackRef?.participant?.isLocal;
  const currentIsWatching =
    isWatching[screenShareTrackRef?.participant?.identity ?? ""] ?? false;

  const metadata = screenShareTrackRef?.participant?.metadata;
  const previewImage = useMemo(() => {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata).stream_preview;
    } catch {
      return null;
    }
  }, [metadata]);

  const renderScreenShareContent = () => {
    // Own Screen Share
    if (isLocal && (isFocused || inGridView)) {
      return (
        <div className="absolute inset-0 z-0 bg-black rounded-xl flex items-center justify-center">
          Your stream is running. For a preview, look at the bottom of the
          sidebar.
        </div>
      );
    }

    // Watching someone
    if (currentIsWatching && !isLocal) {
      return (
        <div className="absolute inset-0 z-0 bg-black rounded-xl">
          <VideoTrack
            trackRef={screenShareTrackRef!}
            className="rounded-xl h-full w-full object-contain bg-black"
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
            className="absolute inset-0 w-full h-full object-contain opacity-50 bg-black z-0 rounded-xl"
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
          className="absolute inset-0 w-full h-full object-contain bg-black z-0 rounded-xl"
        />
      );
    }

    // Loading
    return <LoadingBlock />;
  };

  return loading ? (
    <Card className="relative w-full h-full bg-input/30">
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
    <Card className="relative w-full h-full bg-input/30">
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
