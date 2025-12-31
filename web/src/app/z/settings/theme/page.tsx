"use client";

// Package Imports
import { useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { bundledThemes } from "shiki";

// Lib Imports
import { generateColors } from "@/lib/theme";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useTheme } from "next-themes";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { defaults } from "@/lib/defaults";
import { capitalizeFirstLetter } from "@/lib/utils";

import { CodeBlock } from "@/components/markdown/code-block";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsPageTitle } from "../layout";

import { Top } from "../page";

// Main
export default function Page() {
  const { data, set } = useStorageContext();
  const { setTheme, resolvedTheme } = useTheme();
  const [tempColor, setTempColor] = useState(
    (data.themeHex as string) || "#000000"
  );

  useEffect(() => {
    setTheme((data.colorScheme as string) || "system");
  }, [data.colorScheme, setTheme]);

  const previewScheme =
    data.colorScheme === "system" || !data.colorScheme
      ? (resolvedTheme as string) === "dark"
        ? "dark"
        : "light"
      : (data.colorScheme as string) === "dark"
      ? "dark"
      : "light";

  const colors = useMemo(() => {
    try {
      return generateColors(
        tempColor || "#000000",
        (data.tintType as "hard" | "light") || "hard",
        previewScheme as "light" | "dark"
      );
    } catch {
      return null;
    }
  }, [tempColor, data.tintType, previewScheme]);

  return (
    <Top text="Theme">
      <div className="flex gap-5">
        <div className="flex flex-col gap-5">
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
            <div />
          </div>
          <div className="flex flex-col">
            <SettingsPageTitle text="Code Block" />
            <div className="flex flex-col gap-4">
              <Select
                value={
                  (data.codeBlockShikiTheme as string) ??
                  defaults.codeBlockShikiTheme
                }
                onValueChange={(value) => set("codeBlockShikiTheme", value)}
              >
                <SelectTrigger className="w-50">
                  <SelectValue
                    placeholder={
                      (data.codeBlockShikiTheme as string) ??
                      "Select shiki theme"
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
              <div className="flex gap-2">
                <Switch
                  id="showLinesInCodeBlocks"
                  checked={
                    (data.showLinesInCodeBlocks as boolean) ??
                    defaults.showLinesInCodeBlocks
                  }
                  onCheckedChange={(value) =>
                    set("showLinesInCodeBlocks", value)
                  }
                />
                <Label htmlFor="showLinesInCodeBlocks">
                  Show line numbers in code blocks
                </Label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <SettingsPageTitle text="Preview" />
          <div
            className="w-200 h-100 border rounded-lg overflow-hidden flex"
            style={
              colors
                ? (Object.fromEntries(
                    Object.entries(colors).map(([k, v]) => [k, v])
                  ) as React.CSSProperties)
                : undefined
            }
          >
            <div className="h-full bg-sidebar w-50 flex flex-col items-center pt-5 border-r">
              <p className="text-lg font-semibold">Sidebar</p>
            </div>
            <div className="p-5 w-full h-full bg-background text-foreground flex flex-col items-end">
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    This is a description inside a card component.
                  </CardDescription>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button>Default</Button>
                  <Button variant="outline">Outline</Button>
                </CardFooter>
              </Card>

              <div className="w-full h-full flex flex-col items-start justify-end">
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Danger</Button>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <CodeBlock language="ts" inline={false}>
              {`// Example TypeScript Code
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`}
            </CodeBlock>
          </div>
        </div>
      </div>
    </Top>
  );
}
