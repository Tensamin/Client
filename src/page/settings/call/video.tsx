// Package Imports
import * as Icon from "lucide-react";

// Context Imports
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";

// Components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPageTitle } from "@/page/settings";

// Main
export default function Page() {
  const { ownUserHasPremium } = useUserContext();
  const { data, set } = useStorageContext();

  const premiumSettings = [
    {
      label: "Screen Share Width",
      key: "call_screenShare_width",
      default: 1920,
      minimum: 640,
    },
    {
      label: "Screen Share Height",
      key: "call_screenShare_height",
      default: 1080,
      minimum: 360,
    },
    {
      label: "Screen Share Frame Rate",
      key: "call_screenShare_frameRate",
      default: 30,
      minimum: 15,
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
        {premiumSettings.map((option) => (
          <div key={option.key} className="flex flex-col gap-2">
            <Label>
              <Icon.Gem size={15} /> {option.label}
            </Label>
            <Input
              type="number"
              disabled={!ownUserHasPremium}
              value={
                data[option.key] !== undefined
                  ? (data[option.key] as number)
                  : option.default
              }
              onChange={(e) => set(option.key, parseInt(e.target.value, 10))}
              min={option.minimum}
            />
          </div>
        ))}
      </div>

      <p className="text-muted-foreground text-sm mt-5">
        This menu is a little wierd, it will get reworked in the future
      </p>
    </>
  );
}
