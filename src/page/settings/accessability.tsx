import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStorageContext } from "@/context/storage";

export default function Page() {
  const {
    data: { reverseEnterInChats = false },
    set,
  } = useStorageContext();

  return (
    <div className="flex gap-2">
      <Switch
        id="reverseEnterInChats"
        checked={reverseEnterInChats ? true : false}
        onCheckedChange={(value) => set("reverseEnterInChats", value)}
      />
      <Label htmlFor="reverseEnterInChats">
        Reverse enter key behavior in chats
      </Label>
    </div>
  );
}
