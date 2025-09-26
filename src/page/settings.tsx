// Package Imports
import React from "react";
import packageJson from "@/../package.json";

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
import { PageDiv } from "@/components/pageDiv";

// Main
export const Pages = [
  "-account",
  "iota",
  "profile",
  "privacy",
  "devices",
  "logout",
  "-appearance",
  "tint",
  "css",
  "layout",
  "audio",
  "video",
  "soundboard",
  "-general",
  "notifications",
  "accessability",
  "language",
  "premium",
  "-advanced",
  "developer",
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
  selected,
  setSelected,
  logoutButton,
}: {
  page: string;
  selected?: string;
  setSelected?: (page: string) => void;
  logoutButton?: boolean;
}): React.JSX.Element {
  const { setPage } = usePageContext();
  const { clearAll, translate } = useStorageContext();
  return logoutButton ? (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full my-1" variant="outline">
          {translate("SETTINGS_PAGE_LOGOUT_BUTTON_ACTION")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {translate("SETTINGS_PAGE_LOGOUT_BUTTON_LABEL")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translate("SETTINGS_PAGE_LOGOUT_BUTTON_DESCRIPTION")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{translate("CANCEL")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearAll();
              setPage("login");
            }}
          >
            {translate("SETTINGS_PAGE_LOGOUT_BUTTON_ACTION")}
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
      {translate("SETTINGS_PAGE_LABEL_" + page.toUpperCase())}
    </Button>
  );
}

export default function Page() {
  const { ownPing, iotaPing } = useSocketContext();
  const { data, set, translate } = useStorageContext();

  const selected = data.lastSettingsMenu as string;
  const setSelected = (page: string) => {
    set("lastSettingsMenu", page);
  };

  return (
    <div className="h-full w-full flex gap-2">
      <PageDiv className="flex flex-col h-full" scroll>
        <div className="w-37 h-full">
          {Pages.map((page) => {
            if (page === "logout")
              return <SettingsButton key="logout" page={page} logoutButton />;
            if (page.startsWith("-"))
              return (
                <div key={page} className="text-sm text-muted-foreground">
                  {translate(
                    "SETTINGS_PAGE_LABEL_" + page.toUpperCase().replace("-", "")
                  )}
                </div>
              );
            return (
              <SettingsButton
                key={page}
                page={page}
                selected={selected}
                setSelected={setSelected}
              />
            );
          })}
          <div className="h-full" />
          <div className="text-sm text-muted-foreground pt-15">
            {translate("SETTINGS_PAGE_LABEL_INFORMATION")}
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            {/* Put iotaPing into the translate */}
            <p>{translate("VERSION", packageJson.version)}</p>
            <p>{translate("CLIENT_PING", ownPing + "ms")}</p>
            <p>{translate("IOTA_PING", iotaPing + "ms")}</p>
          </div>
        </div>
      </PageDiv>
      <PageDiv className="w-full flex flex-col p-3">
        {Pages.map((page) => {
          if (page === selected)
            return (
              <div key={page} className="text-lg font-medium mb-4 leading-6">
                {translate("SETTINGS_PAGE_LABEL_" + page.toUpperCase())}
              </div>
            );
          return null;
        })}
        <MainPage selected={selected} />
      </PageDiv>
    </div>
  );
}
