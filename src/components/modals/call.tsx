// Package Imports
import * as Icon from "lucide-react";

// Context Imports
import { useCallContext } from "@/context/call";
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Components
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/modals/raw";

// Main
export function LargeModal({
  title,
  icon,
  loading,
}: Readonly<{
  title: string;
  description: string;
  icon?: string;
  loading: boolean;
  onClick?: () => void;
  state?: string;
}>) {
  return loading ? (
    <div className="flex justify-center items-center gap-4">
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="h-9 w-9">
          <Icon.Mic />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Headphones />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Eye />
        </Button>
      </div>
      <UserAvatar title={title} size="jumbo" border loading />
    </div>
  ) : (
    <div className="flex justify-center items-center gap-4">
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="h-9 w-9">
          <Icon.Mic />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Headphones />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Eye />
        </Button>
      </div>
      <UserAvatar title={title} size="jumbo" border icon={icon} />
    </div>
  );
}

export function MediumModal({
  title,
  icon,
  loading,
}: Readonly<{
  title: string;
  description: string;
  icon?: string;
  loading: boolean;
  onClick?: () => void;
  state?: string;
}>) {
  return loading ? (
    <div className="flex justify-center items-center gap-4">
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="h-9 w-9">
          <Icon.Mic />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Headphones />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Eye />
        </Button>
      </div>
      <UserAvatar title={title} size="extraLarge" border loading />
    </div>
  ) : (
    <div className="flex justify-center items-center gap-4">
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="h-9 w-9">
          <Icon.Mic />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Headphones />
        </Button>
        <Button variant="outline" className="h-9 w-9">
          <Icon.Eye />
        </Button>
      </div>
      <UserAvatar title={title} size="extraLarge" border icon={icon} />
    </div>
  );
}

export function VoiceActions() {
  const { state, exitCall } = useCallContext();
  const { setPage } = usePageContext();
  const { translate } = useStorageContext();

  return state === "CONNECTED" || state === "CONNECTING" ? (
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
          onClick={() => exitCall()}
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
