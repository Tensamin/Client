// Package Imports
import {
  useConnectionQualityIndicator,
  useConnectionState,
  useLocalParticipant,
  useRoomInfo,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { ConnectionQuality, ConnectionState, Track } from "livekit-client";
import * as Icon from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

// Lib Imports
import { cn, displayCallId } from "@/lib/utils";
import * as CommunicationValue from "@/lib/wsMessageTypes";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call/CallContext";

// Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSocketContext } from "@/context/SocketContext";
import DeafenButton from "@/components/call/buttons/DeafenButton";
import MicButton from "@/components/call/buttons/MicButton";
import ScreenShareButton from "@/components/call/buttons/ScreenShareButton";
import { useRouter } from "next/navigation";

// Main
export default function VoiceActions() {
  const { shouldConnect, disconnect } = useCallContext();
  const { name } = useRoomInfo();
  const router = useRouter();

  // Connection Quality
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator({
    participant: localParticipant,
  });
  const connectionState = useConnectionState();

  // Ping Data
  type PingDataPayload = {
    time: string;
    ping: number;
  };
  const [pingData, setPingData] = useState<PingDataPayload[]>([]);
  useEffect(() => {
    if (!localParticipant) return;

    const interval = setInterval(() => {
      const currentPing = localParticipant.engine.client.rtt;
      const currentTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setPingData((prevData) => {
        const newData = [...prevData, { time: currentTime, ping: currentPing }];
        if (newData.length > 10) {
          newData.shift();
        }
        return newData;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [localParticipant]);
  const pingGraph = {
    ping: {
      label: "Ping",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  // Copy Button
  const [copyCallId, setCopyCallId] = useState(false);
  useEffect(() => {
    let timeout = null;
    if (copyCallId) {
      timeout = setTimeout(() => setCopyCallId(false), 2000);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [copyCallId, name]);

  // Screen Share Preview
  const screenShareTrackRefs = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const trackRef = screenShareTrackRefs.find(
    (ref) =>
      ref &&
      ref.participant?.isLocal &&
      ref.source === Track.Source.ScreenShare,
  );
  const isScreenShare = isScreenShareEnabled || !!trackRef;

  // Fullscreen handling with native API
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
          // Fullscreen request failed, fall back to dialog
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

  // Listen for fullscreen changes (including Escape key exits)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Anonymous Joining
  const [loading, setLoading] = useState(false);
  const { send } = useSocketContext();
  const { ownMetadata, callMetadata } = useSubCallContext();
  const { callId, callInvite, setCallInvite } = useCallContext();

  // Dialog for expanded preview
  const [dialogOpen, setDialogOpen] = useState(false);

  // Render
  const commonClassNames = "text-sm";
  const connectingColor = "text-ring";
  return shouldConnect ? (
    <Card className="bg-input/30 rounded-lg border-input flex flex-col gap-2 justify-center items-center w-full p-2">
      {isScreenShare && trackRef && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <div
            ref={videoContainerRef}
            className={cn(
              "group relative aspect-video w-full h-full",
              isFullscreen && "bg-black",
            )}
          >
            <VideoTrack
              className={cn(
                "group aspect-video bg-black border rounded-lg",
                isFullscreen &&
                  "rounded-none border-none w-full h-full object-contain",
              )}
              trackRef={trackRef}
            />
            {/* Hover overlay with controls (hidden in fullscreen) */}
            {!isFullscreen && (
              <div className="rounded-lg absolute top-0 left-0 w-full h-full items-center justify-center bg-black/75 group-hover:flex hidden">
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-9 w-9 bg-background rounded-xl">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-full w-full"
                          onClick={() => setDialogOpen(true)}
                        >
                          <Icon.Expand className="h-5 w-5" />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Expand Preview</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-9 w-9 bg-background rounded-xl">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-full w-full"
                          onClick={handleFullscreen}
                        >
                          {isFullscreen ? (
                            <Icon.Minimize className="h-5 w-5" />
                          ) : (
                            <Icon.Maximize className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
            {/* Fullscreen exit button (only visible in fullscreen) */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-9 h-9 bg-background rounded-xl">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-full w-full"
                    onClick={handleFullscreen}
                  >
                    <Icon.Minimize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogContent className="h-auto max-w-[75vw]!">
            <DialogTitle>Screen Share Preview</DialogTitle>
            <div className="relative group">
              <VideoTrack
                className="group aspect-video bg-black border rounded-lg h-full w-full"
                trackRef={trackRef}
              />
              <div className="absolute top-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-9 h-9 bg-background rounded-xl">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-full w-full"
                        onClick={() => {
                          setDialogOpen(false);
                          setTimeout(() => {
                            handleFullscreen();
                          }, 100);
                        }}
                      >
                        <Icon.Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Enter Fullscreen</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex justify-start items-center gap-2"
          >
            {connectionState !== ConnectionState.Connected ? (
              <>
                <Icon.WifiSync className={connectingColor} />
                <p className={cn(connectingColor, commonClassNames)}>
                  Connecting...
                </p>
              </>
            ) : quality === ConnectionQuality.Excellent ? (
              <>
                <Icon.Wifi className="text-green-500" />
                <p className={cn("text-green-500", commonClassNames)}>
                  Connected
                </p>
              </>
            ) : quality === ConnectionQuality.Good ? (
              <>
                <Icon.WifiHigh className="text-lime-500" />
                <p className={cn("text-lime-500", commonClassNames)}>
                  Connected
                </p>
              </>
            ) : quality === ConnectionQuality.Poor ? (
              <>
                <Icon.WifiLow className="text-yellow-500" />
                <p className={cn("text-yellow-500", commonClassNames)}>
                  Connected
                </p>
              </>
            ) : quality === ConnectionQuality.Lost ? (
              <>
                <Icon.WifiOff className="text-red-500" />
                <p className={cn("text-red-500", commonClassNames)}>
                  Connection Lost
                </p>
              </>
            ) : quality === ConnectionQuality.Unknown ? (
              <>
                <Icon.WifiSync className={connectingColor} />
                <p className={cn(connectingColor, commonClassNames)}>
                  Connecting...
                </p>
              </>
            ) : (
              <>
                <Icon.WifiSync className={connectingColor} />
                <p className={cn(connectingColor, commonClassNames)}>
                  Connecting...
                </p>
              </>
            )}
            <p className="ml-auto text-ring">
              {localParticipant.engine.client.rtt}ms
            </p>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" className="ml-5 w-87.5 flex flex-col gap-3">
          <p className="font-medium">Connection Status</p>
          <div className="flex gap-3 items-center">
            <Button
              disabled={!callInvite}
              onClick={() => {
                try {
                  navigator.clipboard.writeText(callInvite || "");
                  setCopyCallId(true);
                } catch {
                  toast.error("Failed to copy Call ID to clipboard");
                }
              }}
              className="flex justify-start w-33 items-center"
              variant="outline"
            >
              {copyCallId ? <Icon.Check /> : <Icon.Copy />}
              <span>Copy Invite</span>
            </Button>
            <div className="w-px h-6 bg-ring rounded-full" />
            {name !== "" ? displayCallId(name) : <p>...</p>}
          </div>
          <div className="flex flex-col gap-0.5 text-sm">
            The call display name is derived from the call ID and can&apos;t be
            reversed, so you can freely share it. However, the call ID could be
            used to join the call if the call creator enables anonymous joining.
          </div>
          <div className="flex w-full justify-start gap-2">
            <Checkbox
              key={ownMetadata.isAdmin ? "admin" : "not-admin"}
              id="enableAnonymousJoining"
              disabled={!ownMetadata.isAdmin || loading}
              checked={callMetadata.anonymousJoining}
              onCheckedChange={async (value) => {
                setLoading(true);
                await send("call_set_anonymous_joining", {
                  enabled: value,
                  call_id: callId,
                })
                  .then((raw) => {
                    const data =
                      raw as CommunicationValue.call_set_anonymous_joining;
                    setCallInvite(data.link);
                  })
                  .catch(() => {
                    toast.error("Failed to enable anonymous joining");
                  });
                setLoading(false);
              }}
            />
            <Label
              htmlFor="enableAnonymousJoining"
              className={ownMetadata.isAdmin ? "" : "text-muted-foreground"}
            >
              Enable Anonymous Joining
            </Label>
          </div>
          <p className="font-medium">Ping Graph</p>
          <div className="flex flex-col gap-0.5 text-sm">
            <ChartContainer config={pingGraph}>
              <AreaChart accessibilityLayer data={pingData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis dataKey="ping" width={28} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="ping"
                  type="linear"
                  fill="var(--primary)"
                  fillOpacity={0.3}
                  stroke="var(--primary)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex gap-2 w-full">
        <MicButton />
        <DeafenButton />
        <ScreenShareButton />
      </div>
      <div className="flex gap-2 w-full">
        <Button
          className="flex justify-center flex-1"
          onClick={() => router.push("/call")}
        >
          <Icon.Expand /> Expand
        </Button>
        <Button
          variant="destructive"
          className="w-9.5"
          onClick={() => disconnect()}
        >
          <Icon.LogOut />
        </Button>
      </div>
    </Card>
  ) : null;
}
