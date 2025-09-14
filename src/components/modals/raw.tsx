// Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Main
export function BigModal({
  title,
  description,
  icon,
  loading,
}: Readonly<{
  title: string;
  description: string;
  icon: string;
  loading: boolean;
}>) {
  return loading ? (
    <Card className="bg-input/30 p-2 rounded-lg border-input">
      <CardHeader className="flex p-0 items-center">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-15" />
          <Skeleton className="h-2 w-25" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/30 p-2 rounded-lg border-input">
      <CardHeader className="flex p-0 items-center">
        <img src={icon} className="size-8 rounded-full border border-input" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium leading-3">{title}</p>
          <p className="text-xs font-bold text-muted-foreground leading-3">
            {description}
          </p>
        </div>
      </CardHeader>
    </Card>
  );
}

export function MediumModal() {
  return <div></div>;
}

export function SmallModal() {
  return <div></div>;
}
