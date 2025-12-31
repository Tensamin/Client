// Package Imports
import * as Icon from "lucide-react";

// Lib Imports
import { getCreationString } from "@/lib/utils";

// Components
import { Text } from "@/components/markdown/text";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UnixTimestamp } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import Avatar from "./Avatar";

// Main
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
        <Avatar image={null} display={title} size={14} addBorder loading />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-30" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/30 p-2.5 rounded-xl border-input">
      <CardHeader className="flex p-0 items-center gap-3">
        <Avatar
          image={icon}
          display={title}
          size={14}
          state={undefined}
          addBorder
          loading={false}
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
      <Avatar image={null} display={title} size={14} addBorder loading />
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
      <Avatar
        image={icon}
        display={title}
        state={state}
        size={14}
        addBorder
        loading={false}
      />
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
      <Avatar
        display={display}
        addBorder
        size={14}
        image={avatar}
        loading={false}
      />
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
        <Avatar image={null} display={title} size={20} addBorder loading />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-30" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/37 p-3 rounded-2xl border-input w-75">
      <CardHeader className="flex p-0 items-center gap-3">
        <Avatar
          image={icon}
          display={title}
          state={state}
          size={20}
          addBorder
          loading={false}
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
          <Avatar image={null} display={title} size={53} addBorder loading />
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
            <Avatar
              image={icon}
              display={title}
              state={state}
              size={53}
              loading={false}
              addBorder
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
