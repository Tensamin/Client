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
  const { data, set, translate } = useStorageContext();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme((data.colorScheme as string) || "system");
  }, [data.colorScheme, setTheme]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <div className="flex flex-col gap-2 w-50">
          <HexColorPicker
            className="border rounded-md"
            color={(data.themeHex as string) || "#000000"}
            onChange={(value) => {
              if (typeof data.themeHex !== "string") {
                set("tintType", "hard");
              }
              set("themeHex", value);
            }}
          />
        </div>
        <div className="flex flex-col gap-4.5 w-50">
          {/* Theme Hex */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="themeHex">
              {translate("SETTINGS_THEME_COLOR_HEX_LABEL")}
            </Label>
            <Input
              id="themeHex"
              className="w-full"
              value={(data.themeHex as string) || "#000000"}
              onChange={(e) => set("themeHex", e.target.value)}
            />
          </div>

          {/* Color Scheme */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="colorScheme">
              {translate("SETTINGS_THEME_COLOR_SCHEME_LABEL")}
            </Label>
            <Select
              value={data.colorScheme as string}
              onValueChange={(value) => set("colorScheme", value)}
            >
              <SelectTrigger id="colorScheme" className="w-full">
                <SelectValue
                  placeholder={translate(
                    "SETTINGS_THEME_COLOR_SCHEME_PLACEHOLDER"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="light">
                    {translate("SETTINGS_THEME_COLOR_SCHEME_OPTION_LIGHT")}
                  </SelectItem>
                  <SelectItem value="dark">
                    {translate("SETTINGS_THEME_COLOR_SCHEME_OPTION_DARK")}
                  </SelectItem>
                  <SelectItem value="system">
                    {translate("SETTINGS_THEME_COLOR_SCHEME_OPTION_SYSTEM")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Tint Type */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="tintType">
              {translate("SETTINGS_THEME_TINT_TYPE_LABEL")}
            </Label>
            <Select
              value={data.tintType as string}
              onValueChange={(value) => set("tintType", value)}
            >
              <SelectTrigger id="tintType" className="w-full">
                <SelectValue
                  placeholder={translate(
                    "SETTINGS_THEME_TINT_TYPE_PLACEHOLDER"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="hard">
                    {translate("SETTINGS_THEME_TINT_TYPE_OPTION_HARD")}
                  </SelectItem>
                  <SelectItem value="light">
                    {translate("SETTINGS_THEME_TINT_TYPE_OPTION_LIGHT")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Switch
          id="disableViewTransitions"
          checked={data.disableViewTransitions as boolean}
          onCheckedChange={(value) => set("disableViewTransitions", value)}
        />
        <Label htmlFor="disableViewTransitions">
          {translate("SETTINGS_THEME_DISABLE_VIEW_TRANSITIONS_LABEL")}
        </Label>
      </div>
    </div>
  );
}
