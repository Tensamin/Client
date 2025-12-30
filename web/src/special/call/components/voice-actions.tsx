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
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

// Lib Imports
import { cn } from "@/lib/utils";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";
import { usePageContext } from "@/context/page";

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
import { useSocketContext } from "@/context/socket";
import { DeafButton, MuteButton, ScreenShareButton } from "./buttons";
import { displayCallId } from "./call-button";

// Main
export function VoiceActions() {
  const { shouldConnect, disconnect } = useCallContext();
  const { name } = useRoomInfo();
  const { setPage } = usePageContext();

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isScreenShare = isScreenShareEnabled || !!trackRef;

  // Annymous Joining
  const [loading, setLoading] = useState(false);
  const { send } = useSocketContext();
  const { ownMetadata, callMetadata } = useSubCallContext();

  // Render
  const [dialogOpen, setDialogOpen] = useState(false);
  const commonClassNames = "text-sm";
  const connectingColor = "text-ring";
  return shouldConnect ? (
    <Card className="bg-input/30 rounded-lg border-input flex flex-col gap-2 justify-center items-center w-full p-2">
      {isScreenShare && trackRef && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <div className="group relative aspect-video w-full h-full">
            <VideoTrack
              className="group aspect-video bg-black border rounded-lg"
              trackRef={trackRef}
            />
            <div
              onClick={() => setDialogOpen(true)}
              className="rounded-lg border absolute top-0 left-0 w-full h-full items-center justify-center bg-black/75 group group-hover:flex hidden"
            >
              <Icon.Expand />
            </div>
          </div>
          <DialogContent className="h-auto max-w-[75vw]!">
            <DialogTitle>Screen Share Preview</DialogTitle>
            <VideoTrack
              className="group aspect-video bg-black border rounded-lg h-full w-full"
              trackRef={trackRef}
            />
            <div className="flex">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setIsFullscreen(true);
                }}
              >
                Fullscreen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {isScreenShare && trackRef && (
        <div
          hidden={!isFullscreen}
          className="p-3 gap-3 bg-background fixed top-0 left-0 z-100 flex flex-col justify-center"
          style={{
            width: window.innerWidth,
            height: window.innerHeight,
          }}
        >
          <div className="flex items-center gap-3 font-medium text-lg">
            <Button variant="outline" onClick={() => setIsFullscreen(false)}>
              Exit Fullscreen
            </Button>
            Fullscreen Screen Share Preview
          </div>
          <VideoTrack
            style={{
              maxHeight: window.innerHeight - 73,
            }}
            className="object-contain group aspect-video bg-black border rounded-lg h-full w-full"
            trackRef={trackRef}
          />
        </div>
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
              onClick={() => {
                try {
                  navigator.clipboard.writeText(name || "");
                  setCopyCallId(true);
                } catch {
                  toast.error("Failed to copy Call ID to clipboard");
                }
              }}
              className="flex justify-start w-33 items-center"
              variant="outline"
            >
              {copyCallId ? <Icon.Check /> : <Icon.Copy />}
              <span>Copy Call ID</span>
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
              id="enableAnonymousJoining"
              disabled={!ownMetadata.isAdmin || loading}
              checked={callMetadata.anonymousJoining}
              onCheckedChange={async (value) => {
                setLoading(true);
                await send("call_set_anonymous_joining", {
                  enabled: value,
                }).catch(() => {
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
        <MuteButton />
        <DeafButton />
        <ScreenShareButton />
      </div>
      <div className="flex gap-2 w-full">
        <Button
          className="flex justify-center flex-1"
          onClick={() => setPage("call")}
        >
          <Icon.Expand /> {"Expand"}
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
