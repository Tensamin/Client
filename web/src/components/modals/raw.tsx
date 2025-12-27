// Package Imports
import * as Icon from "lucide-react";

// Lib Imports
import {
  convertStringToInitials,
  formatRawMessage,
  getColorFor,
  getCreationString,
} from "@/lib/utils";

// Components
import { Text } from "@/components/markdown/text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AvatarSizes, UnixTimestamp } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";

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
  size: AvatarSizes;
  border: boolean;
  loading?: boolean;
  className?: string;
}) {
  const sizeMap = {
    small: {
      container: "size-8",
      fallbackText: "text-xs",
      wrapperPos: "-bottom-px -right-px",
      wrapperSize: "w-3 h-3",
      dotSize: "w-2 h-2",
    },
    medium: {
      container: "size-9",
      fallbackText: "text-sm",
      wrapperPos: "bottom-0 right-0",
      wrapperSize: "w-3.5 h-3.5",
      dotSize: "w-2.5 h-2.5",
    },
    large: {
      container: "size-12",
      fallbackText: "text-xl",
      wrapperPos: "bottom-0 right-0",
      wrapperSize: "w-3.5 h-3.5",
      dotSize: "w-2.5 h-2.5",
    },
    extraLarge: {
      container: "size-20",
      fallbackText: "text-2xl",
      wrapperPos: "bottom-0 right-0",
      wrapperSize: "w-4 h-4",
      dotSize: "w-3 h-3",
    },
    jumbo: {
      container: "size-30",
      fallbackText: "text-5xl",
      wrapperPos: "bottom-0 right-0",
      wrapperSize: "w-5 h-5",
      dotSize: "w-3.5 h-3.5",
    },
    gigantica: {
      container: "size-40",
      fallbackText: "text-6xl",
      wrapperPos: "bottom-1 right-1",
      wrapperSize: "w-8 h-8",
      dotSize: "w-6 h-6",
    },
  } as const;

  const cfg = sizeMap[size];

  const containerClass = `relative aspect-square select-none ${
    border ? "border border-muted" : ""
  } ${cfg.container} rounded-full ${className ?? ""}`;
  const avatarClass = `${
    !border ? "bg-transparent" : ""
  } object-cover w-full h-full`;

  return loading ? (
    <Skeleton
      className={`aspect-square select-none ${
        border ? "border border-muted" : ""
      } ${cfg.container} rounded-full ${className ?? ""}`}
    />
  ) : (
    <div className={containerClass}>
      <Avatar className={avatarClass} key={icon}>
        {icon && <AvatarImage src={icon} />}
        <AvatarFallback className={cfg.fallbackText}>
          {convertStringToInitials(title)}
        </AvatarFallback>
      </Avatar>

      {state && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`rounded-full absolute bg-muted ${cfg.wrapperPos} ${cfg.wrapperSize} flex justify-center items-center`}
            >
              <div
                className={`${cfg.dotSize} rounded-full border ${getColorFor(
                  state,
                )}`}
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
    <div
      data-slot="card"
      role="button"
      tabIndex={0}
      className="w-full bg-input/30 p-2 rounded-2xl border-input text-card-foreground flex gap-3 items-center justify-start border py-2 shadow-sm"
    >
      <UserAvatar title={title} size="small" border loading />
      <Skeleton className="h-5 w-20" />
    </div>
  ) : (
    <div
      data-slot="card"
      role="button"
      tabIndex={0}
      className="w-full bg-input/30 p-2 rounded-2xl border-input text-card-foreground flex gap-3 items-center justify-start border py-2 shadow-sm hover:bg-input/35 transition-all duration-300 ease-in-out"
      onClick={onClick}
      onKeyDown={(e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const key = (e as any).key;
        if (key === "Enter" || key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
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
      {calls.length > 0 && (
        <Icon.PhoneIncoming size={16} className="ml-auto mr-2" />
      )}
    </div>
  );
}

export function CallOnHomepage({
  display,
  avatar,
}: {
  display: string;
  avatar?: string;
}) {
  return (
    <div className="flex gap-2 items-center">
      <p>{display}</p>
      <UserAvatar title={display} border size="small" icon={avatar} />
    </div>
  );
}

export function Profile({
  creationTimestamp,
  title,
  description,
  status,
  state,
  icon,
  badges,
  loading,
}: {
  creationTimestamp: UnixTimestamp;
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
      <CardContent className="flex flex-col gap-2 px-0">
        {description && description !== "" && (
          <div className="whitespace-pre-wrap p-2 border border-input bg-input/40 text-sm rounded-xl w-full">
            <Text text={description} />
          </div>
        )}
        <div className="whitespace-pre-wrap p-2 border border-input bg-input/40 text-xs rounded-xl w-full">
          Created {getCreationString(creationTimestamp)}
        </div>
      </CardContent>
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

export function BigProfile({
  creationTimestamp,
  title,
  description,
  status,
  state,
  icon,
  badges,
  loading,
}: {
  creationTimestamp: UnixTimestamp;
  title: string;
  description: string;
  status?: string;
  state: string;
  icon?: string;
  badges?: string[];
  loading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [description]);

  return loading ? (
    <div className="min-h-screen w-full flex items-start justify-center p-8">
      <Card className="w-full max-w-6xl p-8 rounded-2xl border-input bg-input/37">
        <CardHeader className="flex flex-col md:flex-row items-center gap-8 p-0">
          <UserAvatar title={title} size="gigantica" border loading />
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-6 w-72" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-8">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-6 w-36" />
          </div>
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="w-full flex items-start justify-center p-4">
      <Card className="w-full max-w-5xl p-4 rounded-2xl border-input bg-transparent border-none">
        <CardHeader className="flex flex-col md:flex-row items-start gap-8 p-0">
          <div className="flex-shrink-0">
            <UserAvatar
              icon={icon}
              title={title}
              state={state}
              size="gigantica"
              border
            />
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col">
              <p className="text-6xl md:text-7xl font-extrabold leading-tight">
                {title}
              </p>
              {status && (
                <p className="text-2xl font-semibold text-muted-foreground mt-2">
                  {status}
                </p>
              )}
              {badges && badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {badges.map((badge) => (
                    <Badge key={badge} className="text-sm">
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="mt-8 flex flex-col gap-6">
          {description && description !== "" && (
            <div>
              <div className="relative">
                <div
                  ref={contentRef}
                  className={`text-lg p-6 border border-input bg-input/40 rounded-xl w-full whitespace-pre-wrap ${
                    isExpanded
                      ? "max-h-190 overflow-y-auto"
                      : "max-h-70 overflow-hidden"
                  }`}
                >
                  <Text text={description} />
                </div>

                {/* Bottom fade */}
                <div
                  aria-hidden
                  className={`absolute rounded-b-lg bottom-0 inset-x-0 pointer-events-none h-10 z-20 transition-opacity duration-200 bg-gradient-to-t from-sidebar to-transparent ${
                    isOverflowing && !isExpanded ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              {isOverflowing && (
                <Button
                  onClick={() => setIsExpanded(!isExpanded)}
                  variant="outline"
                  className="mt-3"
                >
                  {isExpanded ? "Read less" : "Read more"}
                </Button>
              )}
            </div>
          )}

          <div className="whitespace-pre-wrap p-4 border border-input bg-input/40 text-sm rounded-xl w-full">
            Created {getCreationString(creationTimestamp)}
          </div>
        </CardContent>

        {badges && badges.length > 0 && (
          <CardFooter className="mt-6">
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => (
                <Badge key={badge} className="text-sm">
                  {badge}
                </Badge>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
