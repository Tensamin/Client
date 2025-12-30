import Wrap from "@/components/Wrap";
import Content from "./Content";

import { BigModal } from "../modals/raw";

import { useUserContext } from "@/context/user";
import CategorySwitcher from "./CategorySwitcher";

export default function Main() {
  const { ownId } = useUserContext();
  return (
    <div className="w-64 h-full flex flex-col p-2 shrink-0">
      <Wrap
        userId={ownId}
        component={(user) => (
          <BigModal
            description={user.data.username}
            loading={user.data.loading}
            title={user.data.display}
            icon={user.data.avatar}
          />
        )}
      />
      <CategorySwitcher />
      <Content />
    </div>
  );
}
