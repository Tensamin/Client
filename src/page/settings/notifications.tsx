"use client";

// Package Imports
import { useEffect } from "react";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Main
export default function Page() {
  const { data, set, translate } = useStorageContext();

  useEffect(() => {
    if (!window.Notification) {
      set("enableNotifications", false);
    }

    if (data.enableNotifications) {
      Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          set("enableNotifications", false);
        }
      });
    }
  }, [data.enableNotifications, set]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Switch
          id="enableNotifications"
          checked={(data.enableNotifications as boolean) ?? false}
          onCheckedChange={(value) => set("enableNotifications", value)}
        />
        <Label htmlFor="enableNotifications">
          {translate("SETTINGS_NOTIFICATIONS_ENABLE_NATIVE")}
        </Label>
      </div>
    </div>
  );
}
