// Lib Imports
import { convertStringToInitials, ThemeSize, getColorFor } from "@/lib/utils";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

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
        <Avatar className="border">
          {icon && <AvatarImage src={icon} />}
          <AvatarFallback>{convertStringToInitials(title)}</AvatarFallback>
        </Avatar>
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
  statusIcon,
}: Readonly<{
  title: string;
  description: string;
  icon?: string;
  loading: boolean;
  onClick?: () => void;
  statusIcon?: string;
}>) {
  const { translate } = useStorageContext();
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
      <div className="relative">
        <Avatar className="relative border border-muted">
          {icon && <AvatarImage src={icon} />}
          <AvatarFallback className="z-10">
            {convertStringToInitials(title)}
          </AvatarFallback>
        </Avatar>
        {statusIcon && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-full absolute bg-muted bottom-0 right-0 w-3.5 h-3.5 flex justify-center items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full border ${getColorFor(statusIcon)}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>{translate("STATUS_" + statusIcon)}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium leading-4">{title}</p>
        {description !== "" && (
          <p className="text-xs text-muted-foreground leading-3">
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
