// Package Imports
import React from "react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useSocketContext } from "@/context/socket";
import { useStorageContext } from "@/context/storage";

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
export const Pages = [
  { name: "-", display: "Account" },
  { name: "iota", display: "Iota" },
  { name: "profile", display: "Profile" },
  { name: "privacy", display: "Privacy" },
  { name: "devices", display: "Devices" },
  { name: "logout", display: "Logout" },
  { name: "-", display: "Appearance" },
  { name: "tint", display: "Tint" },
  { name: "css", display: "Custom CSS" },
  { name: "layout", display: "Layout" },
  { name: "audio", display: "Audio" },
  { name: "video", display: "Video" },
  { name: "soundboard", display: "Soundboard" },
  { name: "-", display: "General" },
  { name: "notifications", display: "Notifications" },
  { name: "accessability", display: "Accessability" },
  { name: "language", display: "Language" },
  { name: "premium", display: "Premium" },
  { name: "-", display: "Advanced" },
  { name: "developer", display: "Developer" },
];

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
  const { clearAll } = useStorageContext();
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
              clearAll();
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
  const { data, set } = useStorageContext();

  const selected = data.lastSettingsMenu as string;
  const setSelected = (page: string) => {
    set("lastSettingsMenu", page);
  };

  return (
    <div className="h-full w-full flex gap-2">
      <ScrollArea className="flex flex-col p-2 bg-card/46 border rounded-lg h-full">
        <div className="w-37 h-full">
          {Pages.map((page) => {
            if (page.name === "logout")
              return <SettingsButton key="logout" logoutButton />;
            if (page.name === "-")
              return (
                <div
                  key={page.display}
                  className="text-sm text-muted-foreground"
                >
                  {page.display}
                </div>
              );
            return (
              <SettingsButton
                key={page.name}
                page={page.name}
                name={page.display}
                selected={selected}
                setSelected={setSelected}
              />
            );
          })}
          <div className="text-sm text-muted-foreground pt-15">Information</div>
          <div className="text-xs text-muted-foreground pt-1">
            <p>Version: {iotaPing}</p>
            <p>Client Ping: {ownPing}ms</p>
            <p>Iota Ping: {iotaPing}ms</p>
          </div>
          <div className="pb-15" />
        </div>
      </ScrollArea>
      <div className="w-full flex flex-col p-3 bg-card/46 border rounded-lg">
        {Pages.map((page) => {
          if (page.name === selected)
            return (
              <div
                key={page.name}
                className="text-lg font-medium mb-4 leading-6"
              >
                {page.display}
              </div>
            );
          return null;
        })}
        <MainPage selected={selected} />
      </div>
    </div>
  );
}
