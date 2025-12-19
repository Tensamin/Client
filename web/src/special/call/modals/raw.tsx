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
  hideBadges,
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
  const trackId = screenShareTrackRef?.publication?.trackSid || "";
  const currentIsWatching = isLocal ? true : isWatching[trackId] ?? false;

  const metadata = screenShareTrackRef?.participant?.metadata;
  const previewImage = useMemo(() => {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata).stream_preview;
    } catch {
      return null;
    }
  }, [metadata]);

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
        {!hideBadges && (
          <div className="absolute h-full w-full flex items-end justify-start p-4 z-30">
            <Badge className="select-none">...</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card className="relative w-full h-full bg-input/30">
      <CardContent className="w-full h-full flex flex-col items-center justify-center">
        {isScreenShare && screenShareTrackRef ? (
          currentIsWatching ? (
            <div className="absolute inset-0 z-0">
              <VideoTrack
                trackRef={screenShareTrackRef}
                className="rounded-xl h-full w-full object-contain bg-black"
              />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 flex items-center justify-center rounded-xl overflow-hidden">
              {previewImage && (
                <img
                  src={previewImage}
                  alt="Stream Preview"
                  className="absolute inset-0 w-full h-full object-contain opacity-50 bg-black z-0"
                />
              )}
              {inGridView && (
                <Button className="z-10">
                  <Icon.Monitor />
                  Watch Stream
                </Button>
              )}
            </div>
          )
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
