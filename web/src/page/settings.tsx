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
import CallsPage from "@/page/settings/calls";
import NotificationsPage from "@/page/settings/notifications";
import AccessabilityPage from "@/page/settings/accessability";
import PremiumPage from "@/page/settings/premium";
import DeveloperPage from "@/page/settings/developer";
import CreditsPage from "@/page/settings/credit";
import { PageDiv } from "@/components/pageDiv";

// Main
export const Pages = [
  "-Account",
  "Iota",
  "Profile",
  "Privacy",
  "-Appearance",
  "Theme",
  "CSS",
  "Layout",
  "-General",
  "Calls",
  "Notifications",
  "Accessability",
  "Premium",
  "-Advanced",
  "Developer",
];

function MainPage({ selected }: { selected: string }): React.JSX.Element {
  switch (selected) {
    case "Iota":
      return <IotaPage />;
    case "Profile":
      return <ProfilePage />;
    case "Privacy":
      return <PrivacyPage />;
    case "Theme":
      return <ThemePage />;
    case "CSS":
      return <CssPage />;
    case "Layout":
      return <LayoutPage />;
    case "Calls":
      return <CallsPage />;
    case "Notifications":
      return <NotificationsPage />;
    case "Accessability":
      return <AccessabilityPage />;
    case "Premium":
      return <PremiumPage />;
    case "Developer":
      return <DeveloperPage />;
    case "Credits":
      return <CreditsPage />;
    default:
      return <div />;
  }
}

export function SettingsPageTitle({ text }: { text: string }) {
  return (
    <div className="text-lg font-medium mb-4 leading-6 select-none">{text}</div>
  );
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
  return (
    <Button
      className="w-full my-1"
      variant={selected === page ? "outlineSelected" : "outline"}
      onClick={() => {
        if (!setSelected || !page) return;
        setSelected(page);
      }}
    >
      {page}
    </Button>
  );
}

export default function Page() {
  const { ownPing, iotaPing } = useSocketContext();
  const { data, set, clearAll } = useStorageContext();
  const { setPage } = usePageContext();

  const selected = data.lastSettingsMenu as string;
  const setSelected = useCallback(
    (page: string) => {
      set("lastSettingsMenu", page);
    },
    [set],
  );

  return (
    <div className="h-full w-full flex gap-2">
      <PageDiv className="flex flex-col h-full w-40 shrink-0 flex-none px-0">
        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 flex flex-col justify-between">
          <div className="flex flex-col mt-2">
            {Pages.map((page) => {
              if (page.startsWith("-"))
                return (
                  <div
                    key={page}
                    className="select-none text-sm text-muted-foreground"
                  >
                    {page.replaceAll("-", "")}
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
          <div className="my-2">
            <SettingsButton
              key="Credits"
              page="Credits"
              selected={selected}
              setSelected={setSelected}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to logout?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will log you out of your account and delete all your
                    settings.
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
          </div>
        </div>
        <div className="border-t mx-2">
          <div className="select-none text-sm text-muted-foreground pt-2">
            Information
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            <p>Version: v{packageJson.version}</p>
            <p>Client Ping: {ownPing}ms</p>
            <p>Iota Ping: {iotaPing}ms</p>
          </div>
        </div>
      </PageDiv>
      <PageDiv className="flex-1 min-w-0 h-full flex flex-col p-3 overflow-hidden">
        {[...Pages, "Credits"].map((page) =>
          page === selected ? (
            <SettingsPageTitle key={page} text={page} />
          ) : null,
        )}
        <div className="flex w-full h-full overflow-auto">
          <MainPage selected={selected} />
        </div>
      </PageDiv>
    </div>
  );
}
