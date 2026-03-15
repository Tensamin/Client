import { useStorage } from "@tensamin/storage/context";
import Wrapper from "@tensamin/user/wrapper";
import { type User } from "@tensamin/user/context";
import * as React from "react";
import { Basic, Loading } from "./modals/basic";
import List from "@/features/conversation/list/body";

/**
 * Renders sidebar user summary content for the current user.
 * @param user Loaded user data.
 * @returns Sidebar user card JSX.
 */
function renderSidebarUser(user: User): React.ReactNode {
  return <Basic user={user} />;
}

/**
 * Renders sidebar user summary content skeleton while loading user data.
 * @returns Sidebar user card skeleton JSX.
 */
function renderSidebarUserLoading(): React.ReactNode {
  return <Loading />;
}

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
    <div className="w-75 h-full flex flex-col gap-3 p-2">
      <Wrapper
        loading={renderSidebarUserLoading()}
        userId={userId}
        component={renderSidebarUser}
      />
      <div className="h-full">
        <List />
      </div>
    </div>
  );
}
