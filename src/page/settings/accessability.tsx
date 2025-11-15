import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStorageContext } from "@/context/storage";

export default function Page() {
  const {
    set,
    translate,
    data: { reverseEnterInChats = false },
  } = useStorageContext();

  return (
    <div className="flex items-start gap-2">
      <Switch
        id="reverseEnterInChats"
        checked={reverseEnterInChats ? true : false}
        onCheckedChange={(value) => set("reverseEnterInChats", value)}
      />
      <Label htmlFor="reverseEnterInChats">
        {translate("SETTINGS_ACCESSABILITY_REVERSE_ENTER")}
      </Label>
    </div>
  );
}
