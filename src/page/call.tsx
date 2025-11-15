"use client";

// Context Imports
import { useCallContext } from "@/context/call";
import { useStorageContext } from "@/context/storage";

// Components
import { PageDiv } from "@/components/pageDiv";
import { CallModal } from "@/components/modals/user";

// Main
export default function Page() {
  const { users } = useCallContext();
  const { translate } = useStorageContext();

  const usersLength = users.size;

  return (
    <PageDiv className="flex flex-col gap-4 h-full">
      <div className="flex-1 w-full">{/* Main Container */}</div>
      <div className="w-1/2 flex justify-center items-center border rounded-2xl">
        <div className=""></div>
      </div>
      {Array.from(users).map(([uuid]) => (
        <div key={uuid} className="flex items-center gap-2">
          <CallModal
            uuid={uuid}
            size={usersLength === 1 ? "large" : "medium"}
          />
        </div>
      ))}
      <p>{translate("CALL_PAGE_PLACEHOLDER_MESSAGE")}</p>
    </PageDiv>
  );
}
