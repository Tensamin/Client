// Package Imports
import * as Icon from "lucide-react";
import {
  useRoomInfo,
  useParticipantInfo,
  useConnectionQualityIndicator,
  useConnectionState,
  useLocalParticipant,
  useParticipantContext,
  useMaybeTrackRefContext,
} from "@livekit/components-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useEffect, useState } from "react";

// Lib Imports
import { cn } from "@/lib/utils";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Components
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserModal } from "@/components/modals/user";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Types
import {
  ConnectionQuality,
  ConnectionState,
  ParticipantEvent,
  Track,
} from "livekit-client";
import { isTrackReference } from "@livekit/components-core";

// Main
export function CallUserModal() {
  const { identity, metadata } = useParticipantInfo();
  const participant = useParticipantContext();
  const trackRef = useMaybeTrackRefContext();
  const screenShareTrackRef =
    trackRef &&
    isTrackReference(trackRef) &&
    trackRef.source === Track.Source.ScreenShare
      ? trackRef
      : undefined;

  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  useEffect(() => {
    if (metadata) {
      try {
        const data = JSON.parse(metadata);
        setDeafened(!!data.deafened);
      } catch {}
    }
  }, [metadata]);
  useEffect(() => {
    if (!participant) {
      return;
    }

    const handleMuted = () => setMuted(true);
    const handleUnmuted = () => setMuted(false);

    participant.on(ParticipantEvent.TrackMuted, handleMuted);
    participant.on(ParticipantEvent.TrackUnmuted, handleUnmuted);

    return () => {
      participant.off(ParticipantEvent.TrackMuted, handleMuted);
      participant.off(ParticipantEvent.TrackUnmuted, handleUnmuted);
    };
  }, [participant]);

  return identity && identity !== "" ? (
    <UserModal
      uuid={identity}
      size="call"
      extraProps={{
        muted,
        deafened,
        screenShareTrackRef,
      }}
    />
  ) : identity !== "" ? (
    <p>Loading...</p>
  ) : (
    <p>Error</p>
  );
}

export function VoiceActions() {
  const { shouldConnect } = useCallContext();
  const { disconnect } = useSubCallContext();
  const { name } = useRoomInfo();
  const { setPage } = usePageContext();
  const { translate } = useStorageContext();

  // Connection Quality
  const { localParticipant } = useLocalParticipant();
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
        if (newData.length > 20) {
          newData.shift();
        }
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [localParticipant.engine.client.rtt]);
  const pingGraph = {
    ping: {
      label: "Ping",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  const commonClassNames = "text-sm";
  return shouldConnect ? (
    <Card className="bg-input/30 rounded-lg border-input flex flex-col gap-2 justify-center items-center w-full p-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex justify-start items-center gap-2"
          >
            {connectionState !== ConnectionState.Connected ? (
              <>
                <Icon.WifiSync className="text-muted-foreground" />
                <p className={cn("text-muted-foreground", commonClassNames)}>
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
                <Icon.WifiSync className="text-muted-foreground" />
                <p className={cn("text-muted-foreground", commonClassNames)}>
                  Connecting...
                </p>
              </>
            ) : (
              <>
                <Icon.WifiSync className="text-muted-foreground" />
                <p className={cn("text-muted-foreground", commonClassNames)}>
                  Connecting...
                </p>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          className="ml-5 w-[350px] flex flex-col gap-2"
        >
          <p className="font-medium">Connection Status</p>
          <div className="flex flex-col gap-0.5 text-sm">
            <p>Quality: {quality ? quality : "..."}</p>
            <p>State: {connectionState ? connectionState : "..."}</p>
            <p>Call: {name ? name : ""}</p>
          </div>
          <p className="font-medium">Ping</p>
          <div className="flex flex-col gap-0.5 text-sm">
            <ChartContainer config={pingGraph}>
              <AreaChart accessibilityLayer data={pingData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="time" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="ping"
                  type="linear"
                  fill="var(--primary)"
                  fillOpacity={0.4}
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
          <Icon.Expand /> {translate("VOICE_ACTIONS_EXPAND")}
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

function MuteButton() {
  const { toggleMute } = useSubCallContext();
  const { isMicrophoneEnabled } = useLocalParticipant();

  return (
    <Button
      className="h-9 flex-3"
      variant={isMicrophoneEnabled ? "outline" : "default"}
      onClick={toggleMute}
      aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
    >
      {isMicrophoneEnabled ? <Icon.Mic /> : <Icon.MicOff />}
    </Button>
  );
}

function ScreenShareButton() {
  const { isScreenShareEnabled, localParticipant } = useLocalParticipant();

  const toggleScreenShare = async () => {
    if (localParticipant) {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    }
  };

  return (
    <Button
      className="h-9 flex-3"
      variant={isScreenShareEnabled ? "default" : "outline"}
      onClick={toggleScreenShare}
      aria-label={isScreenShareEnabled ? "Stop screen share" : "Share screen"}
    >
      {isScreenShareEnabled ? <Icon.MonitorOff /> : <Icon.Monitor />}
    </Button>
  );
}

function DeafButton() {
  const { isDeafened, toggleDeafen } = useSubCallContext();

  return (
    <Button
      className="h-9 flex-3"
      variant={isDeafened ? "default" : "outline"}
      onClick={toggleDeafen}
      aria-label={isDeafened ? "Undeafen" : "Deafen"}
    >
      {isDeafened ? <Icon.HeadphoneOff /> : <Icon.Headphones />}
    </Button>
  );
}
