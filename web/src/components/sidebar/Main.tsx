"use client";

import Wrap from "@/components/common/UserDataLoader";
import Content from "./Content";

import { BigModal } from "../modals/ModalPrimitives";

import { useUserContext } from "@/context/UserContext";
import { useState } from "react";
import CategorySwitcher from "./CategorySwitcher";

export default function Main() {
  const { ownId } = useUserContext();
  const [category, setCategory] = useState<"CONVERSATIONS" | "COMMUNITIES">(
    "CONVERSATIONS",
  );

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
      <CategorySwitcher category={category} setCategory={setCategory} />
      <Content category={category} />
    </div>
  );
}
