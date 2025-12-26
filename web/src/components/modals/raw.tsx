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
            size === "gigantica" && "text-6xl"
          } ${size === "jumbo" && "text-5xl"} ${
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
