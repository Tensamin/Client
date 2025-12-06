"use client";

// Package Imports
import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import * as Icon from "lucide-react";

// Lib Imports
import { cn } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";

// Components
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStorageContext } from "@/context/storage";
import { StoredSettings } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

// Main
export default function Page() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [settings, setSettings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  const [tmpValue, setTmpValue] = useState("");

  const { send } = useSocketContext();
  const { data, set } = useStorageContext();

  const loadRemoteSettings = useEffectEvent(() => {
    setLoading(true);
    send("settings_list").then((data) => {
      setSettings(data.data.settings ?? []);
      setLoading(false);
    });
  });

  useEffect(() => loadRemoteSettings, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <p>{"Sync your settings with Iota"}</p>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={loading || !value || value === ""}>
                {"Load"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {"Are you sure you want to load this profile?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {
                    "This will replace your current settings! Make sure to save them first if you want to keep them."
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toast.promise(
                      send("settings_load", {
                        settings_name: value,
                      }).then((settingsData) => {
                        if (!settingsData.data.payload) return;
                        const payload: StoredSettings = JSON.parse(
                          settingsData.data.payload as string,
                        );
                        Object.keys(payload).forEach((key) => {
                          if (
                            !payload[key] ||
                            key === "loadPrivateKey" ||
                            (key === "privateKey" && !data.loadPrivateKey)
                          )
                            return;
                          set(key, payload[key]);
                        });
                      }),
                      {
                        loading: "Loading settings...",
                        success: "Settings loaded",
                        error: "Failed to load settings",
                      },
                    );
                  }}
                >
                  {"Load"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            disabled={loading || !value || value === ""}
            onClick={() => {
              send("settings_save", {
                settings_name: value,
                payload: data.loadPrivateKey
                  ? data
                  : ({
                      ...data,
                      privateKey: "REDACTED",
                    } as StoredSettings),
              }).then(() => toast.success("Settings saved"));
            }}
          >
            {"Save"}
          </Button>
          {loading ? (
            <Button
              disabled
              variant="outline"
              role="combobox"
              aria-expanded={false}
              className="w-[200px] justify-between"
            >
              {"Loading profiles..."}
              <Icon.ChevronsUpDown className="opacity-50" />
            </Button>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-[200px] justify-between"
                >
                  {value || "Select a profile"}
                  <Icon.ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput
                    placeholder={"Search profiles..."}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>{"No profiles found."}</CommandEmpty>
                    <CommandGroup>
                      {settings.map((setting) => (
                        <CommandItem
                          key={setting}
                          value={setting}
                          onSelect={(currentValue) => {
                            setValue(
                              currentValue === value ? "" : currentValue,
                            );
                            setOpen(false);
                          }}
                        >
                          {setting}
                          <Icon.Check
                            className={cn(
                              "ml-auto",
                              value === setting ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-9 h-9"
                onClick={() => {
                  setNewProfileOpen(true);
                }}
              >
                <Icon.Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{"Create a new profile"}</p>
            </TooltipContent>
          </Tooltip>
          <Dialog open={newProfileOpen} onOpenChange={setNewProfileOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{"Create profile"}</DialogTitle>
                <DialogDescription>
                  {"Name a profile so you can quickly load it later."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="profileName">{"Profile name"}</Label>
                  <Input
                    type="text"
                    id="profileName"
                    placeholder={"e.g. Profile 1"}
                    value={tmpValue}
                    onChange={(e) => setTmpValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex w-full justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTmpValue("");
                    setNewProfileOpen(false);
                  }}
                >
                  {"Cancel"}
                </Button>
                <Button
                  onClick={() => {
                    setValue(tmpValue);
                    setTmpValue("");
                    setNewProfileOpen(false);
                  }}
                >
                  {"Add profile"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <Checkbox
              id="loadPrivateKey"
              checked={(data.loadPrivateKey as boolean) ?? false}
              onClick={() => {
                if (data.loadPrivateKey as boolean) {
                  set("loadPrivateKey", false);
                } else {
                  setDialogOpen(true);
                }
              }}
              //onCheckedChange={(value) => set("loadPrivateKey", value)}
            />
            <Label htmlFor="loadPrivateKey">{"Include private key"}</Label>
          </div>
          <div className="text-xs flex flex-col gap-1">
            <p className="text-destructive">{"This is not recommended!"}</p>
            <p className="text-muted-foreground w-120">
              {
                "Including your private key can act as a backup to restore your account and for quickly switching between accounts, but the securiy risks that come with it are significant. Only enable this option if you trust the Iota host."
              }
            </p>
          </div>
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{"Include private key?"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {
                    "Anyone with access to this profile can read your private key."
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    set("loadPrivateKey", true);
                    setDialogOpen(false);
                  }}
                >
                  {"Continue"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
