// Package Imports
import * as Icon from "lucide-react";
import { useRoomInfo, useParticipantInfo } from "@livekit/components-react";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Components
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserModal } from "@/components/modals/user";

// Main
export function CallUserModal() {
  const { identity, metadata } = useParticipantInfo();

  console.log(metadata);

  return identity && identity !== "" ? (
    <UserModal uuid={identity} size="big" />
  ) : identity !== "" ? (
    <p>Loading...</p>
  ) : (
    <p>Error</p>
  );
}

export function VoiceActions() {
  const { outerState } = useCallContext();
  const { disconnect } = useSubCallContext();
  const { name } = useRoomInfo();
  const { setPage } = usePageContext();
  const { translate } = useStorageContext();

  return outerState === "CONNECTING" ? (
    <div className="w-full flex justify-center h-30 items-center text-muted-foreground">
      <p>Connecting...</p>
    </div>
  ) : name && outerState !== "DISCONNECTED" ? (
    <Card className="bg-input/30 rounded-xl border-input flex flex-col gap-2 justify-center items-center w-full p-2">
      <div className="w-full bg-green-500 h-2 rounded-full"></div>
      <div className="flex gap-2 w-full">
        <TempIcon />
        <TempIcon />
        <TempIcon />
      </div>
      <div className="flex gap-2 w-full">
        <TempIcon />
        <TempIcon />
        <TempIcon />
      </div>
      <div className="flex gap-2 w-full">
        <Button
          className="flex justify-center flex-1"
          onClick={() => setPage("call")}
        >
          <Icon.Expand /> {translate("VOICE_ACTIONS_EXPAND")}
        </Button>
        <Button
          variant="destructive"
          className="w-9.5"
          onClick={() => disconnect()}
        >
          <Icon.LogOut />
        </Button>
      </div>
    </Card>
  ) : null;
}

function TempIcon() {
  return (
    <Button className="h-9 flex-3">
      <Icon.Bomb />
    </Button>
  );
}
