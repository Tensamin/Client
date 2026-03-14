import { useStorage } from "@tensamin/storage/context";
import Wrapper from "@tensamin/user/wrapper";
import * as React from "react";
import Basic from "./modals/basic";
import List from "@/features/conversation/list/body";

export default function Sidebar() {
  const [userId, setUserId] = React.useState(0);
  const { load } = useStorage();

  React.useEffect(() => {
    load("user_id").then(setUserId);
  }, [load]);

  return (
    <div className="w-75 h-full flex flex-col gap-3 p-2">
      {userId !== 0 && (
        <Wrapper userId={userId} component={(user) => <Basic user={user} />} />
      )}
      <div className="h-full">
        <List />
      </div>
    </div>
  );
}
