// Package Imports
import { HexColorPicker } from "react-colorful";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useTheme } from "next-themes";

// Components
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

// Main
export default function Page() {
  const { data, set } = useStorageContext();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(data.colorScheme as string);
  }, [data.colorScheme]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <div className="flex flex-col gap-2 w-50">
          <HexColorPicker
            className="border rounded-md"
            color={(data.themeHex as string) || "#000000"}
            onChange={(value) => set("themeHex", value)}
          />
          <Input
            value={(data.themeHex as string) || "#000000"}
            onChange={(e) => set("themeHex", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          {/* Color Scheme */}
          <Select
            value={data.colorScheme as string}
            onValueChange={(value) => set("colorScheme", value)}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="System" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Tint Type */}
          <Select
            value={data.tintType as string}
            onValueChange={(value) => set("tintType", value)}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
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
