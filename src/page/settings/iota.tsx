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
  DialogFooter,
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
  const { data, translate, set } = useStorageContext();

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
        <p>{translate("IOTA_PAGE_SYNC_SECTION_TITLE")}</p>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={loading || !value || value === ""}>
                {translate("IOTA_PAGE_LOAD_BUTTON")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {translate("IOTA_PAGE_LOAD_SETTINGS_TITLE")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {translate("IOTA_PAGE_LOAD_SETTINGS_DESCRIPTION")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{translate("CANCEL")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toast.promise(
                      send("settings_load", {
                        settings_name: value,
                      }).then((settingsData) => {
                        if (!settingsData.data.payload) return;
                        const payload: StoredSettings = JSON.parse(
                          settingsData.data.payload as string
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
                        loading: translate("IOTA_PAGE_SETTINGS_LOADING"),
                        success: translate("IOTA_PAGE_SETTINGS_LOAD_SUCCESS"),
                        error: translate("IOTA_PAGE_SETTINGS_LOAD_FAILED"),
                      }
                    );
                  }}
                >
                  {translate("IOTA_PAGE_LOAD_BUTTON")}
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
              }).then(() =>
                toast.success(translate("IOTA_PAGE_SETTINGS_SAVED"))
              );
            }}
          >
            {translate("IOTA_PAGE_SAVE_BUTTON")}
          </Button>
          {loading ? (
            <Button
              disabled
              variant="outline"
              role="combobox"
              aria-expanded={false}
              className="w-[200px] justify-between"
            >
              {translate("IOTA_PAGE_PROFILES_LOADING")}
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
                  {value || translate("IOTA_PAGE_SELECT_PROFILE_PLACEHOLDER")}
                  <Icon.ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput
                    placeholder={translate(
                      "IOTA_PAGE_SEARCH_PROFILE_PLACEHOLDER"
                    )}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>
                      {translate("IOTA_PAGE_NO_PROFILE_FOUND")}
                    </CommandEmpty>
                    <CommandGroup>
                      {settings.map((setting) => (
                        <CommandItem
                          key={setting}
                          value={setting}
                          onSelect={(currentValue) => {
                            setValue(
                              currentValue === value ? "" : currentValue
                            );
                            setOpen(false);
                          }}
                        >
                          {setting}
                          <Icon.Check
                            className={cn(
                              "ml-auto",
                              value === setting ? "opacity-100" : "opacity-0"
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
              <p>{translate("IOTA_PAGE_ADD_PROFILE_TOOLTIP")}</p>
            </TooltipContent>
          </Tooltip>
          <Dialog open={newProfileOpen} onOpenChange={setNewProfileOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {translate("IOTA_PAGE_ADD_PROFILE_TITLE")}
                </DialogTitle>
                <DialogDescription>
                  {translate("IOTA_PAGE_ADD_PROFILE_DESCRIPTION")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="profileName">
                    {translate("IOTA_PAGE_PROFILE_NAME_LABEL")}
                  </Label>
                  <Input
                    type="text"
                    id="profileName"
                    placeholder={translate(
                      "IOTA_PAGE_PROFILE_NAME_PLACEHOLDER"
                    )}
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
                  {translate("CANCEL")}
                </Button>
                <Button
                  onClick={() => {
                    setValue(tmpValue);
                    setTmpValue("");
                    setNewProfileOpen(false);
                  }}
                >
                  {translate("IOTA_PAGE_ADD_PROFILE_BUTTON")}
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
              onClick={(e) => {
                if (data.loadPrivateKey as boolean) {
                  set("loadPrivateKey", false);
                } else {
                  setDialogOpen(true);
                }
              }}
              //onCheckedChange={(value) => set("loadPrivateKey", value)}
            />
            <Label htmlFor="loadPrivateKey">
              {translate("IOTA_PAGE_INCLUDE_PRIVATE_KEY_LABEL")}
            </Label>
          </div>
          <div className="text-xs flex flex-col gap-1">
            <p className="text-destructive">
              {translate("IOTA_PAGE_INCLUDE_PRIVATE_KEY_WARNING_TITLE")}
            </p>
            <p className="text-muted-foreground w-120">
              {translate("IOTA_PAGE_INCLUDE_PRIVATE_KEY_WARNING_DESCRIPTION")}
            </p>
          </div>
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {translate("IOTA_PAGE_INCLUDE_PRIVATE_KEY_ALERT_TITLE")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {translate("IOTA_PAGE_INCLUDE_PRIVATE_KEY_ALERT_DESCRIPTION")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{translate("CANCEL")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    set("loadPrivateKey", true);
                    setDialogOpen(false);
                  }}
                >
                  {translate("IOTA_PAGE_INCLUDE_PRIVATE_KEY_ALERT_CONTINUE")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
