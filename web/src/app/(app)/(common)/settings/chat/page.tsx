"use client";

import { Switch } from "@/components/ui/switch";
import { Top } from "../page";
import { Label } from "@/components/ui/label";
import { useStorageContext } from "@/context/StorageContext";
import { defaults } from "@/config/defaults";

export default function Page() {
  const { set, data } = useStorageContext();
  return (
    <Top text="Chat Settings">
      <div className="flex flex-col gap-5">
        <div className="flex gap-2">
          <Switch
            checked={
              (data.sendMessageReadFeedback as boolean) ??
              defaults.sendMessageReadFeedback
            }
            id="sendMessageReadFeedback"
            onCheckedChange={(value) => {
              set("sendMessageReadFeedback", value);
            }}
          />
          <Label htmlFor="sendMessageReadFeedback">
            Send message read feedback
          </Label>
        </div>
      </div>
    </Top>
  );
}
