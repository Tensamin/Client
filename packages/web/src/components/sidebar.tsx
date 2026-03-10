import { useStorage } from "@tensamin/core-storage/context";
import Wrapper from "@tensamin/core-user/wrapper";
import { createEffect, createSignal } from "solid-js";
import Basic from "./modals/basic";
import List from "@/features/conversation/list/body";

export default function Sidebar() {
  const [userId, setUserId] = createSignal(0);
  const { load } = useStorage();

  createEffect(() => {
    load("user_id").then(setUserId);
  });

  return (
    <div class="w-75 h-full flex flex-col gap-3 p-2">
      {userId() !== 0 && (
        <Wrapper
          userId={userId()}
          component={(user) => <Basic user={user} />}
        />
      )}
      <div class="h-full">
        <List />
      </div>
    </div>
  );
}
