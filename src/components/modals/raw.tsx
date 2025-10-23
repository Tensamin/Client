// Lib Imports
import { convertStringToInitials, ThemeSize, getColorFor } from "@/lib/utils";

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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Text } from "../markdown/text";

// Main
export function UserAvatar({
  icon,
  title,
  state,
  size,
  border,
}: {
  icon?: string;
  title: string;
  state?: string;
  size: "small" | "medium" | "large";
  border: boolean;
}) {
  const { translate } = useStorageContext();

  return (
    <div
      className={`relative aspect-square select-none ${
        border && "border border-muted"
      } ${size === "small" && "size-8"} ${size === "medium" && "size-10"} ${
        size === "large" && "size-12"
      } rounded-full`}
    >
      <Avatar
        className={`${!border && "bg-transparent"} object-cover w-full h-full`}
        key={icon}
      >
        {icon && <AvatarImage src={icon} />}
        <AvatarFallback
          className={`${size === "large" && "text-xl"} ${
            size === "small" && "text-md"
          }`}
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
    <Card className="bg-input/30 p-3 rounded-xl border-input">
      <CardHeader className="flex p-0 items-center gap-3">
        <Skeleton className={`size-${ThemeSize} rounded-full`} />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-30" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/30 p-3 rounded-xl border-input">
      <CardHeader className="flex p-0 items-center gap-3">
        <UserAvatar
          icon={icon}
          title={title}
          size="small"
          state={undefined}
          border
        />
        <div className="flex flex-col gap-1">
          <p className="text-md font-medium leading-4">{title}</p>
          <p className="text-sm font-bold text-muted-foreground leading-3">
            {description}
          </p>
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
      <Skeleton
        className={`size-${ThemeSize} border border-input rounded-full`}
      />
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

export function SmallModal() {
  return <div></div>;
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
    <Card className="bg-input/30 p-3 rounded-xl border-input w-75">
      <CardHeader className="flex p-0 items-center gap-3">
        <Skeleton className="size-13 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-30" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/30 p-3 rounded-xl border-input w-75">
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
