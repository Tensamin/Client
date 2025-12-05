// Package Imports
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { bundledThemes } from "shiki";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useTheme } from "next-themes";

// Components
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
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { SettingsPageTitle } from "../settings";
import { capitalizeFirstLetter } from "@/lib/utils";

// Main
export default function Page() {
  const { data, set } = useStorageContext();
  const { setTheme } = useTheme();
  const [tempColor, setTempColor] = useState(
    (data.themeHex as string) || "#000000"
  );

  useEffect(() => {
    setTheme((data.colorScheme as string) || "system");
  }, [data.colorScheme, setTheme]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <div className="flex flex-col gap-2 w-50">
          <HexColorPicker
            className="border rounded-md"
            color={tempColor}
            onChange={(value) => {
              setTempColor(value);
            }}
          />
        </div>
        <div className="flex flex-col gap-4.5 w-50">
          {/* Theme Hex */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="themeHex">Theme Color</Label>
            <Input
              id="themeHex"
              className="w-full"
              value={tempColor}
              onChange={(e) => setTempColor(e.target.value)}
            />
          </div>

          {/* Color Scheme */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="colorScheme">Color scheme</Label>
            <Select
              value={data.colorScheme as string}
              onValueChange={(value) => set("colorScheme", value)}
            >
              <SelectTrigger id="colorScheme" className="w-full">
                <SelectValue placeholder="Select a color scheme" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Tint Type */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="tintType">Tint Type</Label>
            <Select
              value={data.tintType as string}
              onValueChange={(value) => set("tintType", value)}
            >
              <SelectTrigger id="tintType" className="w-full">
                <SelectValue placeholder="Select a tint style" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="hard">Light</SelectItem>
                  <SelectItem value="light">Dark</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex gap-2 w-full justify-end">
        <Button
          onClick={() => {
            set("themeHex", tempColor);
            if (!data.tintType || data.tintType === "") {
              set("tintType", "hard");
            }
          }}
        >
          Save
        </Button>
        <Button
          onClick={() => {
            setTempColor((data.themeHex as string) || "#000000");
          }}
          variant="outline"
          className="mr-auto"
        >
          Discard
        </Button>
        <Button
          onClick={() => {
            set("themeHex", "");
            set("colorScheme", "");
            set("tintType", "");
            setTempColor("#000000");
            window.location.reload();
          }}
          variant="destructive"
        >
          Reset
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <SettingsPageTitle text="Code Block" />
        <Select
          value={(data.codeBlockShikiTheme as string) ?? "houston"}
          onValueChange={(value) => set("codeBlockShikiTheme", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                (data.codeBlockShikiTheme as string) ?? "Select shiki theme"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.keys(bundledThemes).map((theme) => (
                <SelectItem
                  key={theme}
                  value={theme}
                  onClick={() => set("codeBlockShikiTheme", theme)}
                >
                  {capitalizeFirstLetter(theme)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
