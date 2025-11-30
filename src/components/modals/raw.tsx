// Package Imports
import * as Icon from "lucide-react";
import { VideoTrack } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-core";

// Lib Imports
import {
  convertStringToInitials,
  formatRawMessage,
  getColorFor,
} from "@/lib/utils";

// Context Imports
import { useCallContext } from "@/context/call";

// Components
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Text } from "@/components/markdown/text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Main
export function UserAvatar({
  icon,
  title,
  state,
  size,
  border,
  loading,
  className,
}: {
  icon?: string;
  title: string;
  state?: string;
  size: "small" | "medium" | "large" | "extraLarge" | "jumbo" | "gigantica";
  border: boolean;
  loading?: boolean;
  className?: string;
}) {
  return loading ? (
    <Skeleton
      className={`aspect-square select-none ${
        border && "border border-muted"
      } ${size === "small" && "size-8"} ${size === "medium" && "size-9"} ${
        size === "large" && "size-12"
      } ${size === "extraLarge" && "size-20"} ${
        size === "jumbo" && "size-30"
      } ${size === "gigantica" && "size-40"} rounded-full ${className}`}
    />
  ) : (
    <div
      className={`relative aspect-square select-none ${
        border && "border border-muted"
      } ${size === "small" && "size-8"} ${size === "medium" && "size-9"} ${
        size === "large" && "size-12"
      } ${size === "extraLarge" && "size-20"} ${
        size === "jumbo" && "size-30"
      } ${size === "gigantica" && "size-40"} rounded-full ${className}`}
    >
      <Avatar
        className={`${!border && "bg-transparent"} object-cover w-full h-full`}
        key={icon}
      >
        {icon && <AvatarImage src={icon} />}
        <AvatarFallback
          className={`${size === "extraLarge" && "text-2xl"} ${
            size === "gigantica" && "text-4xl"
          } ${size === "jumbo" && "text-3xl"} ${
            size === "large" && "text-xl"
          } ${size === "medium" && "text-sm"} ${size === "small" && "text-xs"}`}
        >
          {convertStringToInitials(title)}
        </AvatarFallback>
      </Avatar>
      {state && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`rounded-full absolute bg-muted ${
                size === "small" && "-bottom-px -right-px"
              } ${size === "large" && "bottom-0 right-0"} ${
                size === "large" && "w-3.5 h-3.5"
              } ${
                size === "small" && "w-3 h-3"
              } flex justify-center items-center`}
            >
              <div
                className={`${size === "large" && "w-2.5 h-2.5"} ${
                  size === "small" && "w-2 h-2"
                } rounded-full border ${getColorFor(state)}`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>{formatRawMessage(state)}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function BigModal({
  title,
  description,
  icon,
  loading,
}: Readonly<{
  title: string;
  description: string;
  icon?: string;
  loading: boolean;
}>) {
  return loading ? (
    <Card className="bg-input/30 p-2.5 rounded-xl border-input">
      <CardHeader className="flex p-0 items-center gap-3">
        <UserAvatar title={title} size="medium" border loading />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-30" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/30 p-2.5 rounded-xl border-input">
      <CardHeader className="flex p-0 items-center gap-3">
        <UserAvatar
          icon={icon}
          title={title}
          size="medium"
          state={undefined}
          border
        />
        <div className="flex flex-col gap-1">
          <p className="text-md font-medium leading-4">{title}</p>
          <div className="flex gap-1.5 justify-start items-center">
            <p className="text-sm font-medium text-muted-foreground leading-3">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function MediumModal({
  title,
  description,
  icon,
  loading,
  onClick,
  state,
  calls,
}: Readonly<{
  title: string;
  description: string;
  icon?: string;
  loading: boolean;
  onClick?: () => void;
  state?: string;
  calls: string[];
}>) {
  return loading ? (
    <Button
      data-slot="card"
      variant="outline"
      className="w-full bg-input/30 p-2 rounded-2xl border-input text-card-foreground flex gap-3 items-center justify-start border py-6 shadow-sm"
    >
      <UserAvatar title={title} size="small" border loading />
      <Skeleton className="h-5 w-20" />
    </Button>
  ) : (
    <Button
      data-slot="card"
      variant="outline"
      className="w-full bg-input/30 p-2 rounded-2xl border-input text-card-foreground flex gap-3 items-center justify-start border py-6 shadow-sm"
      onClick={onClick}
    >
      <UserAvatar icon={icon} title={title} state={state} size="small" border />
      <div className="flex flex-col gap-1">
        <p className="select-none text-sm font-medium leading-4">{title}</p>
        {description !== "" && (
          <p className="select-none text-xs text-muted-foreground leading-3">
            {description}
          </p>
        )}
      </div>
      <CallButton calls={calls} />
    </Button>
  );
}

export function Profile({
  title,
  description,
  status,
  state,
  icon,
  badges,
  loading,
}: {
  title: string;
  description: string;
  status?: string;
  state: string;
  icon?: string;
  badges?: string[];
  loading: boolean;
}) {
  return loading ? (
    <Card className="bg-input/37 p-3 rounded-2xl border-input w-75">
      <CardHeader className="flex p-0 items-center gap-3">
        <UserAvatar title={title} size="large" border loading />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-30" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/37 p-3 rounded-2xl border-input w-75">
      <CardHeader className="flex p-0 items-center gap-3">
        <UserAvatar
          icon={icon}
          title={title}
          state={state}
          size="large"
          border
        />
        <div className="flex flex-col gap-1">
          <p className="text-md font-medium leading-4">{title}</p>
          <p className="text-sm font-bold text-muted-foreground leading-3">
            {status}
          </p>
        </div>
      </CardHeader>
      {description && description !== "" && (
        <CardContent className="whitespace-pre-wrap p-2 border border-input bg-input/40 text-sm rounded-xl">
          <Text text={description} />
        </CardContent>
      )}
      {badges && badges.length > 0 && (
        <CardFooter>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge} className="text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

export function CallModal({
  title,
  icon,
  loading,
  muted,
  deafened,
  screenShareTrackRef,
  hideBadges,
}: Readonly<{
  title: string;
  icon?: string;
  loading: boolean;
  muted?: boolean;
  deafened?: boolean;
  screenShareTrackRef?: TrackReference;
  hideBadges?: boolean;
}>) {
  const isScreenShare = !!screenShareTrackRef;

  return loading ? (
    <Card className="relative w-full h-full bg-input/30">
      <CardContent className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full h-full flex justify-center items-center">
          <UserAvatar title={title} size="jumbo" border loading />
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
          <div className="absolute inset-0 z-0">
            <VideoTrack
              trackRef={screenShareTrackRef}
              className="rounded-lg h-full w-full object-contain bg-black"
            />
          </div>
        ) : (
          <div className="w-full h-full flex justify-center items-center">
            <UserAvatar
              icon={icon}
              title={title}
              size="jumbo"
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

export function CallInteraction({ callId }: { callId: string }) {
  const { getCallToken, setToken, connect } = useCallContext();

  return (
    <div className="flex flex-col gap-3">
      <p>{callId}</p>
      <Button
        onClick={() => {
          getCallToken(callId).then((token) => {
            setToken(token);
            connect();
          });
        }}
      >
        Connect
      </Button>
    </div>
  );
}

export function CallButton({ calls }: { calls: string[] }) {
  return (
    <>
      {calls.length === 1 && (
        <Popover>
          <PopoverTrigger asChild></PopoverTrigger>
          <PopoverContent>
            <CallInteraction callId={calls[0]} />
          </PopoverContent>
        </Popover>
      )}
      {calls.length > 2 && (
        <Select value="">
          <SelectTrigger asChild>
            <Button className="w-8 h-8">
              <Icon.Phone scale={80} />
              <Icon.ChevronDown scale={80} />
            </Button>
          </SelectTrigger>
          <SelectContent>
            {calls.map((callId, index) => (
              <SelectItem key={`${callId}-${index}`} value={callId}>
                <Popover>
                  <PopoverTrigger>{callId}</PopoverTrigger>
                  <PopoverContent>
                    <CallInteraction callId={callId} />
                  </PopoverContent>
                </Popover>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}
