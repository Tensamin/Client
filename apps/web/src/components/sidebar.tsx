import { useStorage } from "@tensamin/storage/context";
import Wrapper from "@tensamin/user/wrapper";
import * as React from "react";
import { Basic, Loading } from "./modals/basic";
import List from "@/features/conversation/list/body";

/**
 * Renders the conversation sidebar with account summary and conversation list.
 * @returns Sidebar JSX.
 */
export default function Sidebar() {
  const [userId, setUserId] = React.useState<undefined | number>(undefined);
  const { load } = useStorage();

  React.useEffect(() => {
    load("user_id").then(setUserId);
  }, [load]);

  return (
    <div className="w-65 h-full flex flex-col gap-3 p-2">
      <Wrapper
        loading={<Loading />}
        userId={userId}
        component={(user) => <Basic user={user} />}
      />
      <div className="h-full">
        <List />
      </div>
    </div>
  );
}
