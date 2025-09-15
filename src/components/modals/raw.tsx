// Lib Imports
import { convertStringToInitials, ThemeSize } from "@/lib/utils";

// Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
}: Readonly<{
  title: string;
  description: string;
  icon?: string;
  loading: boolean;
}>) {
  return loading ? (
    <Card className="bg-input/30 p-2 rounded-2xl border-input">
      <CardHeader className="flex p-0 items-center gap-3">
        <Skeleton className={`size-${ThemeSize} rounded-full`} />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/30 p-2 rounded-2xl border-input">
      <CardHeader className="flex p-0 items-center gap-3">
        <Avatar className="border">
          {icon && <AvatarImage src={icon} />}
          <AvatarFallback>{convertStringToInitials(title)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium leading-4">{title}</p>
          {description !== "" && (
            <p className="text-xs text-muted-foreground leading-3">
              {description}
            </p>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}

export function SmallModal() {
  return <div></div>;
}
