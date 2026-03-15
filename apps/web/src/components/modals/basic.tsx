import type { User } from "@tensamin/user/context";
import { Avatar, AvatarImage, AvatarFallback } from "@tensamin/ui/cmp/avatar";
import { reduceDisplay } from "./utils";
import { Card, CardHeader } from "@tensamin/ui/cmp/card";
import { Skeleton } from "@tensamin/ui/cmp/skeleton";

/**
 * Executes Basic.
 * @param props Parameter props.
 * @returns unknown.
 */
export function Basic(props: { user: User }) {
  return (
    <Card className="animate-in fade-in duration-300 rounded-2xl py-0">
      <CardHeader className="flex flex-row gap-2.5 items-center justify-start p-2">
        <Avatar>
          <AvatarImage src={props.user.avatar} />
          <AvatarFallback>{reduceDisplay(props.user.display)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 w-full items-start justify-center text-[15px]">
          <p>{props.user.display}</p>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * Executes Loading.
 * @returns unknown.
 */
export function Loading() {
  return <Skeleton className="h-12 rounded-xl" />;
}
