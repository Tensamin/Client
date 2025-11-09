// Package Imports
import React, { useCallback } from "react";
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
import ThemePage from "@/page/settings/theme";
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
  "-appearance",
  "theme",
  "css",
  "layout",
  "-general",
  "audio",
  "video",
  "soundboard",
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
    case "theme":
      return <ThemePage />;
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

function LogoutButton() {
    const { setPage } = usePageContext();
  const { clearAll, translate } = useStorageContext();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full my-1 text-red-400 hover:text-red-400" variant="outline">
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
  )
}

function SettingsButton({
  page,
  selected,
  setSelected,
}: {
  page: string;
  selected?: string;
  setSelected?: (page: string) => void;
}): React.JSX.Element {
  const { translate } = useStorageContext();
  return (
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
  const setSelected = useCallback(
    (page: string) => {
      set("lastSettingsMenu", page);
    },
    [set]
  );

  return (
    <div className="h-full w-full flex gap-2">
      <PageDiv className="flex flex-col h-full w-50 px-0">
        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 flex flex-col justify-between">
          <div className="flex flex-col mt-2">
            {Pages.map((page) => {
              if (page === "logout") return null;
              if (page.startsWith("-"))
          return (
            <div
              key={page}
              className="select-none text-sm text-muted-foreground"
            >
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
          </div>
          <div className="mt-2 mb-2">
            <LogoutButton />
          </div>
        </div>
        <div className="border-t mx-2">
          <div className="select-none text-sm text-muted-foreground pt-2">
            {translate("SETTINGS_PAGE_LABEL_INFORMATION")}
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            {/* Put ping numbers into the translate */}
            <p>{translate("VERSION", packageJson.version)}</p>
            <p>{translate("CLIENT_PING", ownPing + "ms")}</p>
            <p>{translate("IOTA_PING", iotaPing + "ms")}</p>
          </div>
        </div>
      </PageDiv>
      <PageDiv className="w-full h-full flex flex-col p-3">
        {Pages.map((page) => {
          if (page === selected)
            return (
              <div
                key={page}
                className="text-lg font-medium mb-4 leading-6 select-none"
              >
                {translate("SETTINGS_PAGE_LABEL_" + page.toUpperCase())}
              </div>
            );
          return null;
        })}
        <div className="flex w-full h-full">
          <MainPage selected={selected} />
        </div>
      </PageDiv>
    </div>
  );
}
