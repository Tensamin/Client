import type { User } from "@tensamin/core-user/context";
import Avatar from "@tensamin/ui/avatar";
import { reduceDisplay } from "./utils";
import { Card, CardHeader } from "@tensamin/ui/card";

export default function Basic(props: { user: User }) {
  return (
    <Card className="animate-in fade-in duration-300 rounded-2xl">
      <CardHeader className="flex flex-row gap-2.5 items-center justify-start p-2">
        <Avatar
          img={props.user.avatar}
          fallback={reduceDisplay(props.user.display)}
        />
        <div className="flex flex-col gap-1 w-full items-start justify-center text-[15px]">
          <p>{props.user.display}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
