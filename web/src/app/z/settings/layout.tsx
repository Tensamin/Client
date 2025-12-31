"use client";

// Package Imports
import packageJson from "@/../package.json";
import React, { useCallback } from "react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useSocketContext } from "@/context/socket";
import { useStorageContext } from "@/context/storage";

// Components
import { PageDiv } from "@/components/pageDiv";
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

// Main
export const Pages = [
  "-Account",
  "Iota",
  "Profile",
  "Privacy",
  "-Appearance",
  "Theme",
  "CSS",
  "-General",
  "Calls",
  "Notifications",
  "Accessability",
  "Premium",
  "-Advanced",
  "Developer",
];

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

export default function Page({ children }: { children: React.ReactNode }) {
  const { ownPing, iotaPing } = useSocketContext();
  const { data, set, clearAll } = useStorageContext();
  const { setPage, page } = usePageContext();

  const selected =
    page.replace("settings/", "") ===
    (data.lastSettingsMenu as string).toLowerCase()
      ? (data.lastSettingsMenu as string)
      : undefined;
  const setSelected = useCallback(
    (page: string) => {
      set("lastSettingsMenu", page);
      setPage(`settings/${page.toLowerCase()}`);
    },
    [set, setPage]
  );

  return (
    <div className="h-full w-full flex gap-2">
      <PageDiv className="pb-2 pl-0.5 flex flex-col h-full w-40 shrink-0 flex-none border-r">
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
        {children}
      </PageDiv>
    </div>
  );
}
