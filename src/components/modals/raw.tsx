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
    <Card className="bg-input/30 p-2">
      <CardHeader className="flex p-0 items-center">
        <Skeleton className="size-10 rounded-full border" />
        <Skeleton className="h-5 w-20" />
      </CardHeader>
    </Card>
  ) : (
    <Card className="bg-input/30 p-2">
      <CardHeader className="flex p-0 items-center">
        <img src={icon} className="size-10 rounded-full border border-input" />
        <div className="flex flex-col items-center font-bold">
          <p>{title}</p>
          <CardDescription>{description}</CardDescription>
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
