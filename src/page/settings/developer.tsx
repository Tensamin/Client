import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStorageContext } from "@/context/storage";

export default function Page() {
  const { data, set, rerender } = useStorageContext();

  return (
    <div className="flex gap-2">
      <Switch
        key={rerender.toString()}
        id="debugModeSwitch"
        checked={data?.debug || false}
        onCheckedChange={(value) => set("debug", value)}
      />
      <Label htmlFor="debugModeSwitch">Debug Mode</Label>
    </div>
  );
}
