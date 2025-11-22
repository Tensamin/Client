// Package Imports
import * as Icon from "lucide-react";

// Lib Imports
import { convertStringToInitials, getColorFor } from "@/lib/utils";

// Context Imports
import { useStorageContext } from "@/context/storage";

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
import { Text } from "../markdown/text";

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
  size: "small" | "medium" | "large" | "extraLarge" | "jumbo";
  border: boolean;
  loading?: boolean;
  className?: string;
}) {
  const { translate } = useStorageContext();

  return loading ? (
    <Skeleton
      className={`aspect-square select-none ${
        border && "border border-muted"
      } ${size === "small" && "size-8"} ${size === "medium" && "size-9"} ${
        size === "large" && "size-12"
      } ${size === "extraLarge" && "size-20"} ${
        size === "jumbo" && "size-30"
      } rounded-full ${className}`}
    />
  ) : (
    <div
      className={`relative aspect-square select-none ${
        border && "border border-muted"
      } ${size === "small" && "size-8"} ${size === "medium" && "size-9"} ${
        size === "large" && "size-12"
      } ${size === "extraLarge" && "size-20"} ${
        size === "jumbo" && "size-30"
      } rounded-full ${className}`}
    >
      <Avatar
        className={`${!border && "bg-transparent"} object-cover w-full h-full`}
        key={icon}
      >
        {icon && <AvatarImage src={icon} />}
        <AvatarFallback
          className={`${size === "extraLarge" && "text-3xl"} ${
            size === "jumbo" && "text-2xl"
          } ${size === "large" && "text-xl"} ${
            size === "medium" && "text-sm"
          } ${size === "small" && "text-xs"}`}
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
          <TooltipContent>{translate("STATUS_" + state)}</TooltipContent>
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
}: Readonly<{
  title: string;
  description: string;
  icon?: string;
  loading: boolean;
  onClick?: () => void;
  state?: string;
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
  speaking,
}: Readonly<{
  title: string;
  icon?: string;
  loading: boolean;
  muted?: boolean;
  deafened?: boolean;
  speaking?: boolean;
}>) {
  return loading ? (
    <Card className="relative w-full h-full bg-input/30">
      <CardContent className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full h-full flex justify-center items-center">
          <UserAvatar title={title} size="jumbo" border loading />
        </div>
        <div className="absolute h-full w-full flex items-end justify-start p-4">
          <Badge className="select-none">...</Badge>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card
      className={`relative w-full h-full bg-input/30 ${
        speaking && "ring-2 ring-primary ring-inset"
      }`}
    >
      <CardContent className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full h-full flex justify-center items-center">
          <UserAvatar
            icon={icon}
            title={title}
            size="jumbo"
            state={undefined}
            border
          />
        </div>
        <div className="absolute h-full w-full flex items-end justify-start p-4 gap-2">
          <Badge className="h-5.5 select-none">{title}</Badge>
          {muted && (
            <Badge className="h-5.5 select-none">
              <Icon.MicOff />
            </Badge>
          )}
          {deafened && (
            <Badge className="h-5.5 select-none">
              <Icon.HeadphoneOff />
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
