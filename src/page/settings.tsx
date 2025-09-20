// Package Imports
import React, { useState } from "react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useSocketContext } from "@/context/socket";

// Components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import IotaPage from "@/page/settings/iota";
import ProfilePage from "@/page/settings/profile";
import PrivacyPage from "@/page/settings/privacy";
import DevicesPage from "@/page/settings/devices";
import TintPage from "@/page/settings/tint";
import CssPage from "@/page/settings/css";
import LayoutPage from "@/page/settings/layout";
import AudioPage from "@/page/settings/audio";
import VideoPage from "@/page/settings/video";
import SoundboardPage from "@/page/settings/soundboard";
import NotificationsPage from "@/page/settings/notifications";
import AccessabilityPage from "@/page/settings/accessability";
import LanguagePage from "@/page/settings/language";
import PremiumPage from "@/page/settings/premium";
import DeveloperPage from "@/page/settings/developer";

// Main
function MainPage({ selected }: { selected: string }): React.JSX.Element {
  switch (selected) {
    case "iota":
      return <IotaPage />;
    case "profile":
      return <ProfilePage />;
    case "privacy":
      return <PrivacyPage />;
    case "devices":
      return <DevicesPage />;
    case "tint":
      return <TintPage />;
    case "css":
      return <CssPage />;
    case "layout":
      return <LayoutPage />;
    case "audio":
      return <AudioPage />;
    case "video":
      return <VideoPage />;
    case "soundboard":
      return <SoundboardPage />;
    case "notifications":
      return <NotificationsPage />;
    case "accessability":
      return <AccessabilityPage />;
    case "language":
      return <LanguagePage />;
    case "premium":
      return <PremiumPage />;
    case "developer":
      return <DeveloperPage />;
    default:
      return <div />;
  }
}

function SettingsButton({
  page,
  name,
  selected,
  setSelected,
  logoutButton,
}: {
  page?: string;
  name?: string;
  selected?: string;
  setSelected?: (page: string) => void;
  logoutButton?: boolean;
}): React.JSX.Element {
  const { setPage } = usePageContext();
  return logoutButton ? (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full my-1" variant="outline">
          Logout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
          <AlertDialogDescription>
            This will log you out of your account and return you to the login
            screen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              localStorage.removeItem("auth_private_key");
              localStorage.removeItem("auth_cred_id");
              localStorage.removeItem("auth_uuid");
              setPage("login");
            }}
          >
            Logout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : (
    <Button
      className="w-full my-1"
      variant={selected === page ? "outlineSelected" : "outline"}
      onClick={() => {
        if (!setSelected || !page) return;
        setSelected(page);
      }}
    >
      {name}
    </Button>
  );
}

export default function Page() {
  const { ownPing, iotaPing } = useSocketContext();
  const [selected, setSelected] = useState("");

  return (
    <div className="h-full w-full flex gap-2">
      <ScrollArea className="flex flex-col p-2 bg-card/46 border rounded-lg h-full">
        <div className="w-37 h-full">
          <div className="text-sm text-muted-foreground">Account</div>
          <SettingsButton
            page="iota"
            name="Iota"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="profile"
            name="Profile"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="privacy"
            name="Privacy"
            selected={selected}
            setSelected={setSelected}
          />{" "}
          <SettingsButton
            page="devices"
            name="Devices"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton logoutButton />
          <div className="text-sm text-muted-foreground pt-3">Appearance</div>
          <SettingsButton
            page="tint"
            name="Tint"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="css"
            name="Custom CSS"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="layout"
            name="Layout"
            selected={selected}
            setSelected={setSelected}
          />
          <div className="text-sm text-muted-foreground pt-3">
            Communication
          </div>{" "}
          <SettingsButton
            page="audio"
            name="Audio"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="video"
            name="Video"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="soundboard"
            name="Soundboard"
            selected={selected}
            setSelected={setSelected}
          />
          <div className="text-sm text-muted-foreground pt-3">General</div>
          <SettingsButton
            page="notifications"
            name="Notifications"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="accessability"
            name="Accessability"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="language"
            name="Language"
            selected={selected}
            setSelected={setSelected}
          />
          <SettingsButton
            page="premium"
            name="Premium"
            selected={selected}
            setSelected={setSelected}
          />
          <div className="text-sm text-muted-foreground pt-3">Advanced</div>
          <SettingsButton
            page="developer"
            name="Developer"
            selected={selected}
            setSelected={setSelected}
          />
          <div className="text-sm text-muted-foreground pt-5">Information</div>
          <div className="text-xs text-muted-foreground pt-1">
            <p>Version: {iotaPing}</p>
            <p>Client Ping: {ownPing}ms</p>
            <p>Iota Ping: {iotaPing}ms</p>
          </div>
          <div className="pb-15" />
        </div>
      </ScrollArea>
      <div className="w-full flex flex-col p-2 bg-card/46 border rounded-lg">
        <MainPage selected={selected} />
      </div>
    </div>
  );
}
