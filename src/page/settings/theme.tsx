// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Main
export default function Page() {
  const { data, set } = useStorageContext();

  return (
    <div className="flex flex-col">
      <div className="flex gap-2">
        <Switch
          id="disableViewTransitions"
          checked={data.disableViewTransitions as boolean}
          onCheckedChange={(value) => set("disableViewTransitions", value)}
        />
        <Label htmlFor="disableViewTransitions">Disable View Transitions</Label>
      </div>
    </div>
  );
}
