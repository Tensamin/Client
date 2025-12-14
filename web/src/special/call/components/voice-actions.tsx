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
import { useCallContext } from "@/context/call";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DeafButton, MuteButton, ScreenShareButton } from "./buttons";

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
  }, [localParticipant.engine.client.rtt]);
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

  const commonClassNames = "text-sm";
  const connectingColor = "text-ring";
  return shouldConnect ? (
    <Card className="bg-input/30 rounded-lg border-input flex flex-col gap-2 justify-center items-center w-full p-2">
      {isScreenShare && trackRef && (
        <VideoTrack className="border rounded-lg" trackRef={trackRef} />
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
        <PopoverContent
          side="top"
          className="ml-5 w-[350px] flex flex-col gap-2"
        >
          <p className="font-medium">Connection Status</p>
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
          <div className="flex flex-col gap-0.5 text-sm">
            <p>Quality: {quality ? quality : "..."}</p>
            <p>State: {connectionState ? connectionState : "..."}</p>
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
      {/*<div className="flex gap-2 w-full"></div>*/}
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
