// Package Imports
import { HexColorPicker } from "react-colorful";
import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import * as Icon from "lucide-react";
import Image from "next/image";

// Lib Imports
import {
  generateTintPalette,
  generateMaterialYouPalette,
  THEME_CONTROLS,
} from "@/lib/theme";
import { cn, isHexColor, log, capitalizeFirstLetter, downloadString } from "@/lib/utils";
import { endpoint } from "@/lib/endpoints";
import ls from "@/lib/localStorageManager";

// Context Imports
import { useCryptoContext } from "@/components/context/crypto";
import { useUsersContext } from "@/components/context/users";
import { useMessageContext } from "@/components/context/message";
import { useThemeContext } from "@/components/context/theme";
import { useModsContext } from "@/components/context/mods"
import { useCallContext } from "@/components/context/call";

// Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Preview } from "@/components/page/settings/theme-preview"
import { EditableText, EditableTextarea } from "@/components/page/settings/editable/text"
import { EditableImage } from "@/components/page/settings/editable/image"

// Helper Functions
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
};

// Main
export function Profile() {
  let { get, ownUuid } = useUsersContext();
  let { privateKeyHash } = useCryptoContext();

  let [profile, setProfile] = useState({
    username: "...",
    display: "...",
    avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAtJREFUGFdjYAACAAAFAAGq1chRAAAAAElFTkSuQmCC",
    about: "...",
    status: "..."
  })
  let [aboutChars, setAboutChars] = useState(0);

  useEffect(() => {
    get(ownUuid)
      .then(data => {
        setProfile({
          username: data.username,
          display: data.display,
          avatar: data.avatar,
          about: data.about,
          status: data.status,
          sub_level: data.sub_level,
          sub_end: data.sub_end,
        });
        setAboutChars(data.about.length)
      })
  }, [])

  function handleFieldUpdate(field, newValue) {
    setProfile((prevData) => ({
      ...prevData,
      [field]: newValue,
    }));
    fetch(`${endpoint.change}${field}/${ownUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: `{"private_key_hash": "${privateKeyHash}", "${field}": "${field !== "about" ? newValue : btoa(newValue)}"}`
    })
      .then(response => response.json())
      .then(data => {
        if (data.type !== "error") {
          toast.success(`Updated your ${field === "display" ? "Display Name" : capitalizeFirstLetter(field)}!`)
        } else {
          log(data.log.message, "showError")
        }
      })
      .catch(err => {
        log(err.message, "error")
      })
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground/50">Click any field to edit it</p>
      <div className="flex w-full gap-5">
        <div className="flex flex-col w-3/4 border-1 bg-input/20 p-4 rounded-xl gap-3">
          <div className="flex gap-3">
            <div className="flex">
              <EditableImage
                avatarUrl={profile.avatar}
                onSave={(newAvatarBase64) => handleFieldUpdate("avatar", newAvatarBase64)}
                className="w-17 h-17 z-10"
              />
            </div>
            <div className="flex gap-3">
              <div className="pt-9">
                <div className="-rotate-z-45 h-5 w-0 border-l-1 border-foreground" />
                <div className="-rotate-z-45 h-5 w-0 border-l-1 border-foreground" />
              </div>
              <div>
                <Badge className="mb-3">
                  <EditableText
                    value={profile.status}
                    onSave={(newValue) => handleFieldUpdate("status", newValue)}
                    className="max-w-full text-background"
                    placeholder="Watching Memes"
                  />
                </Badge>
                <EditableText
                  value={profile.display}
                  onSave={(newValue) => handleFieldUpdate("display", newValue)}
                  className="text-2xl font-bold"
                />
                <EditableText
                  value={profile.username}
                  onSave={(newValue) => handleFieldUpdate("username", newValue.toLowerCase())}
                  className="text-foreground/67 font-bold text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <EditableTextarea
              name="Description"
              value={profile.about}
              onSave={(newValue) => handleFieldUpdate("about", newValue)}
              onChar={(chars) => setAboutChars(chars)}
              maxChars={200}
              className="text-sm"
              placeholder="Professional nap-taker, coffee enthusiast and part-time superhero."
              useBase64={true}
            />
          </div>
          <div className="flex gap-2">
            <p className={`text-xs ${aboutChars > 200 ? "text-destructive" : ""}`}>{aboutChars} / 200 </p>
          </div>
        </div>
        <div className="border-1 bg-input/20 p-4 rounded-xl flex flex-col w-full justify-center items-center">
          <p>This is reserved space for</p>
          <p className="bg-clip-text text-transparent bg-gradient-to-r from-primary/60 to-primary">future customizations</p>
        </div>
      </div>
      <Card>

      </Card>
    </div>
  );
};

export function Appearance() {
  let { sidebarRightSide, setSidebarRightSide } = useThemeContext();

  let [tmpColor, setTmpColor] = useState(ls.get("theme_hex") || "");
  let [tint, setTint] = useState(ls.get("theme_tint") || "soft");
  let [colorScheme, setColorScheme] = useState(ls.get("theme_scheme") || "dark");
  let [tintOpen, setTintOpen] = useState(false);
  let [colorSchemeOpen, setColorSchemeOpen] = useState(false);
  let [inputValue, setInputValue] = useState(
    JSON.stringify(
      JSON.parse(ls.get("theme_control")) || THEME_CONTROLS,
      null,
      2
    )
  );

  useEffect(() => {
    if (tmpColor && isHexColor(tmpColor)) {
      ls.set("theme_hex", tmpColor);

      let palette;
      if (tint === "soft") {
        palette = generateMaterialYouPalette(tmpColor, colorScheme);
      } else {
        let themeControls =
          JSON.parse(ls.get("theme_control")) || THEME_CONTROLS;

        palette = generateTintPalette(tmpColor, themeControls, colorScheme);
      }

      if (palette) {
        let root = document.documentElement;
        for (let colorName in palette) {
          root.style.setProperty(`--${colorName}`, palette[colorName]);
        }
      }
    }
  }, [tmpColor, tint, colorScheme]);

  let previewPalette = useMemo(() => {
    if (!tmpColor || !isHexColor(tmpColor)) return {};

    try {
      let palette;
      if (tint === "soft") {
        if (colorScheme === "dark") {
          palette = generateMaterialYouPalette(tmpColor, "dark");
        } else {
          palette = generateMaterialYouPalette(tmpColor, "light");
        }
      } else if (tint === "hard") {
        if (colorScheme === "dark") {
          palette = generateTintPalette(tmpColor, null, "dark");
        } else {
          palette = generateTintPalette(tmpColor, null, "light");
        }
      } else {
        let themeControls = JSON.parse(inputValue);
        if (colorScheme === "dark") {
          palette = generateTintPalette(tmpColor, themeControls, "dark");
        } else {
          palette = generateTintPalette(tmpColor, themeControls, "light");
        }
      }



      let styleObject = {};

      for (let colorName in palette) {
        styleObject[colorName] = palette[colorName];
      }

      return styleObject;
    } catch (err) {
      log(err.message, "error")
      return {};
    }
  }, [tmpColor, tint, colorScheme, inputValue]);

  useEffect(() => {
    ls.set("theme_tint", tint);
  }, [tint]);

  useEffect(() => {
    ls.set("theme_scheme", colorScheme);
  }, [colorScheme]);

  function submitThemeControlsChange(event) {
    event.preventDefault();
    ls.set("theme_control", inputValue);
    window.location.reload();
  }

  function handleThemeControlsChange(event) {
    setInputValue(event.target.value);
  }

  function handleTmpColorChange(event) {
    setTmpColor(event.target.value);
  }

  function submitTmpColorChange(event) {
    event.preventDefault();
    if (isHexColor(tmpColor)) {
      setTmpColor(tmpColor);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <div className="flex w-50 flex-col gap-2">
            <Popover open={tintOpen} onOpenChange={setTintOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tintOpen}
                  className="w-[200px] justify-between"
                >
                  {tint === "soft" ? "Soft Tint" : tint === "hard" ? "Hard Tint" : "Hard Tint (Advanced)"}
                  <Icon.ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        value="soft"
                        onSelect={(currentValue) => {
                          setTint(currentValue);
                          setTintOpen(false);
                        }}
                      >
                        Soft Tint
                        <Icon.Check
                          className={cn(
                            "ml-auto",
                            tint === "soft" ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                      <CommandItem
                        value="hard"
                        onSelect={(currentValue) => {
                          setTint(currentValue);
                          setTintOpen(false);
                        }}
                      >
                        Hard Tint
                        <Icon.Check
                          className={cn(
                            "ml-auto",
                            tint === "hard" ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                      <CommandItem
                        value="hard_a"
                        onSelect={(currentValue) => {
                          setTint(currentValue);
                          setTintOpen(false);
                        }}
                      >
                        Hard Tint (Advanced)
                        <Icon.Check
                          className={cn(
                            "ml-auto",
                            tint === "hard_a" ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {/* Color Scheme Selector */}
            <Popover open={colorSchemeOpen} onOpenChange={setColorSchemeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={colorSchemeOpen}
                  className="w-[200px] justify-between"
                >
                  {colorScheme === "dark" ? "Dark" : "Light"}
                  <Icon.ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        value="dark"
                        onSelect={(currentValue) => {
                          setColorScheme(currentValue);
                          setColorSchemeOpen(false);
                        }}
                      >
                        Dark
                        <Icon.Check
                          className={cn(
                            "ml-auto",
                            colorScheme === "dark" ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                      <CommandItem
                        value="light"
                        onSelect={(currentValue) => {
                          setColorScheme(currentValue);
                          setColorSchemeOpen(false);
                        }}
                      >
                        Light
                        <Icon.Check
                          className={cn(
                            "ml-auto",
                            colorScheme === "light" ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <form className="flex gap-2" onSubmit={submitTmpColorChange}>
              <Input
                placeholder="#000000"
                value={tmpColor}
                onChange={handleTmpColorChange}
              />
            </form>
            <HexColorPicker color={tmpColor} onChange={setTmpColor} />
          </div>

          {/* Preview */}
          <Preview style={previewPalette} />
        </div>

        <br />

        {tint === "hard_a" ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={submitThemeControlsChange}
          >
            <Textarea
              className="border-1 resize-none outline-0"
              value={inputValue}
              onChange={handleThemeControlsChange}
            />

            <Button variant="outline" type="submit">
              <Icon.Clipboard />
              <p className="w-full text-left">Update Theme Controls</p>
            </Button>
          </form>
        ) : null}

        <Button variant="outline" onClick={() => window.location.reload()}>
          <Icon.RefreshCw />
          <p className="w-full text-left">Apply (This will reload the site)</p>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="text-destructive" variant="outline">
              <Icon.Trash />
              <p className="w-full text-left">Reset color theme</p>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to reset your color theme?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will delete your theme hex and
                all your theme control data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setTmpColor("");
                  ls.remove("theme_tint");
                  ls.remove("theme_scheme");
                  ls.remove("theme_hex");
                  ls.remove("theme_control");
                  window.location.reload();
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <br />
      <p className="text-xl font-bold">Layout Controls</p>
      <br />
      <div className="flex gap-2">
        <Switch
          id="sidebar-right-switch"
          checked={sidebarRightSide}
          onCheckedChange={setSidebarRightSide}
        />
        <Label
          htmlFor="sidebar-right-switch"
        >Sidebar Right</Label>
      </div>
    </div>
  );
};

export function Notifications() {
  let [loading, setLoading] = useState(ls.get('notifications') === 'enabled' ? true : false)
  let [message, setMessage] = useState(ls.get('notifications') === 'enabled' ? "Notifications enabled." : "Enable Notifications")
  let { requestNotificationPermission } = useMessageContext()

  return (
    <div className="flex gap-2">
      <Button
        disabled={loading}
        onClick={async () => {
          setMessage("Requesting Permission...")
          setLoading(true)
          requestNotificationPermission()
            .then(data => {
              if (data.success) {
                ls.set('notifications', 'enabled')
              } else {
                setLoading(false)
              }
              setMessage(data.message)
            })
        }}>
        {message}
      </Button>
      <Button
        variant="outline"
        className="w-9 h-9"
        onClick={async () => {
          setMessage("Enable Notifications")
          setLoading(false)
          ls.remove('notifications')
        }}>
        <Icon.Unlock />
      </Button>
    </div>
  )
};

export function Voice() {
  let [outputs, setOutputs] = useState([]);
  let [inputs, setInputs] = useState([]);
  let [openOutputs, setOpenOutputs] = useState(false);
  let [openInputs, setOpenInputs] = useState(false);
  let [denied, setDenied] = useState(null);

  let { inputDeviceId, setInput, outputDeviceId, setOutput } = useCallContext();

  async function getMicrophonePermissionState() {
    if (!navigator.permissions || !navigator.permissions.query) {
      return 'unsupported';
    }
    try {
      const status = await navigator.permissions.query({
        name: 'microphone',
      });
      // granted, denied, prompt
      return status.state;
    } catch (err) {
      return 'unknown';
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadDevices() {
      setDenied(await getMicrophonePermissionState() !== 'granted');

      if ('mediaDevices' in navigator) {
        try {
          let devices = await navigator.mediaDevices.enumerateDevices();
          let outputs = devices.filter(d => d.kind === 'audiooutput');
          if (mounted) {
            setOutputs(outputs);
          }
        } catch { }

        try {
          let devices = await navigator.mediaDevices.enumerateDevices();
          let inputs = devices.filter(d => d.kind === 'audioinput');
          if (mounted) {
            setInputs(inputs);
          }
        } catch { }
      };
    }

    loadDevices();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4 space-y-2">
      {denied && (
        <Button
          onClick={async () => {
            try {
              await navigator.mediaDevices.getUserMedia({ audio: true })
              .then(() => {
                window.location.reload();
              })
            } catch { }
          }}
        >
          Request microphone permission
        </Button>
      )}
      <div className="flex flex-col gap-2">
        <Label>Output Device</Label>
        <Popover open={openOutputs} onOpenChange={setOpenOutputs}>
          <PopoverTrigger asChild>
            <Button
              disabled={denied}
              variant="outline"
              role="combobox"
              aria-expanded={openOutputs}
              className="justify-between w-[200px]"
            >
              <p className="truncate">{denied ? "None" : outputDeviceId
                ? outputs.find((output) => output.deviceId === outputDeviceId)?.label
                : "Select device..."}</p>
              <Icon.ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandList>
                <CommandEmpty>No devices found.</CommandEmpty>
                <CommandGroup>
                  {outputs.map((device) => (
                    <CommandItem
                      key={device.deviceId}
                      value={device.deviceId}
                      onSelect={(currentValue) => {
                        setOutput(currentValue === outputDeviceId ? "default" : currentValue)
                        setOpenOutputs(false)
                      }}
                    >
                      {device.label || `Output ${device.deviceId}`}
                      <Icon.Check
                        className={cn(
                          "ml-auto",
                          outputDeviceId === device.deviceId ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Input Device</Label>
        <Popover open={openInputs} onOpenChange={setOpenInputs}>
          <PopoverTrigger asChild>
            <Button
              disabled={denied}
              variant="outline"
              role="combobox"
              aria-expanded={openInputs}
              className="justify-between w-[200px]"
            >
              <p className="truncate">{denied ? "None" : inputDeviceId
                ? inputs.find((input) => input.deviceId === inputDeviceId)?.label
                : "Select device..."}</p>
              <Icon.ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandList>
                <CommandEmpty>No devices found.</CommandEmpty>
                <CommandGroup>
                  {inputs.map((device) => (
                    <CommandItem
                      key={device.deviceId}
                      value={device.deviceId}
                      onSelect={(currentValue) => {
                        setInput(currentValue === inputDeviceId ? "default" : currentValue)
                        setOpenInputs(false)
                      }}
                    >
                      {device.label || `Input ${device.deviceId}`}
                      <Icon.Check
                        className={cn(
                          "ml-auto",
                          inputDeviceId === device.deviceId ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function ExtraBenefits() {
  let { get, ownUuid } = useUsersContext()

  let [subLevel, setSubLevel] = useState(0)
  let [subEnd, setSubEnd] = useState(0)

  useEffect(() => {
    get(ownUuid)
      .then(data => {
        setSubLevel(data.sub_level)
        setSubEnd(data.sub_end)
      })
  }, [])

  return (
    <Card>
      <CardContent className="ml-3">
        <ul className="list-disc">
          <li>Animated & Uncompressed Profile Pictures</li>
          <li>
            <div className="flex items-center gap-1">
              You support us
              <div className="text-red-500">
                <Icon.Heart fill="red" size={18} />
              </div>
            </div>
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        {subLevel >= 1 ? (
          <p className={subEnd <= 7 ? "text-destructive" : ""}>Expires in {subEnd} Days.</p>
        ) : (
          <p>Premium not active</p>
        )}
      </CardFooter>
    </Card>
  )
};

export function Mods() {
  let { mods, setMods } = useModsContext();
  let [newMod, setNewMod] = useState("");
  let [newMods, setNewMods] = useState("");
  let addModButtonRef = useRef(null);
  let importButtonRef = useRef(null);

  useEffect(() => {
    if (!newMod || newMod === "") return;

    try {
      let jsonMod = JSON.parse(newMod);
      if (
        jsonMod.name &&
        jsonMod.description &&
        jsonMod.version &&
        jsonMod.src
      ) {
        let modName = jsonMod.name;

        fetch(jsonMod.src)
          .then(response => response.text())
          .then(data => {
            setMods((prev) => ({
              ...prev,
              [modName]: {
                name: jsonMod.name,
                description: jsonMod.description,
                version: jsonMod.version,
                src: btoa(data),
                enabled: true,
              },
            }));
            toast.success("Added Mod");
          })
      } else {
        toast("Invalid Mod");
      }
    } catch (err) {
      toast("Invalid Mod");
    }
  }, [newMod, setMods]);

  useEffect(() => {
    if (!newMods || newMods === "") return;
    try {
      let jsonMods = JSON.parse(newMods);
      if (Object.keys(jsonMods).length >= 1) {
        setMods(jsonMods);
        toast.success("Added Mods");
      } else {
        toast("Invalid Mods");
      }
    } catch (err) {
      toast("Invalid Mods");
    }
  }, [newMods, setMods]);

  let handleToggle = (key, nextEnabled) => {
    setMods((prev) => {
      if (!prev || !prev[key]) return prev;
      if (prev[key].enabled === nextEnabled) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          enabled: nextEnabled,
        },
      };
    });
  };

  function ModCard({ modKey, mod, onToggle }) {
    let [enabled, setEnabled] = useState(Boolean(mod.enabled));

    useEffect(() => {
      setEnabled(Boolean(mod.enabled));
    }, [mod.enabled]);

    let handleChange = (next) => {
      setEnabled(next);
      if (onToggle) onToggle(modKey, next);
    };

    return (
      <Card key={modKey} className="bg-input/30 border-input hover:bg-input/50">
        <CardHeader>
          <CardTitle>{mod.name}</CardTitle>
          <CardAction className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={handleChange} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-9 h-9"
                >
                  <Icon.Trash />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This is just a confirmation so you don't accidentally delete something.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setMods((prev) => {
                        let newMods = { ...prev };
                        delete newMods[mod.name];
                        return newMods;
                      });
                    }}
                  >Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardAction>
          <p className="text-sm text-muted-foreground">{mod.description}</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <p className="text-destructive">
          Mods are not checked by Tensamin or reviewed by moderators!
        </p>
        <p className="text-destructive">
          Mods can and probably will try to steal your private key!
        </p>
      </div>

      <div className="flex gap-3">
        <input
          ref={addModButtonRef}
          onChange={async (e) => {
            let files = Array.from(e.target.files || []);
            if (files[0]) {
              setNewMod(await readFileAsText(files[0]));
            }
          }}
          className="hidden"
          id="new-mod-file"
          type="file"
        />
        <input
          ref={importButtonRef}
          onChange={async (e) => {
            let files = Array.from(e.target.files || []);
            if (files[0]) {
              setNewMods(await readFileAsText(files[0]));
            }
          }}
          className="hidden"
          id="new-mods-file"
          type="file"
        />
        <Button
          onClick={() => {
            addModButtonRef.current.click();
          }}
        >
          Add Mod
        </Button>
        <div className="w-full" />
        <Button
          variant="outline"
          onClick={() => {
            downloadString("mods.json", JSON.stringify(mods));
          }}
        >
          Export Mods
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            importButtonRef.current.click();
          }}
        >
          Import Mods
        </Button>
      </div>

      {mods && mods !== "" && Object.keys(mods).length >= 1 ? (
        <div>
          {Object.keys(mods).map((key) => (
            <ModCard key={key} modKey={key} mod={mods[key]} onToggle={handleToggle} />
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col justify-center items-center">
          <Image
            className="select-none [user-drag:none] [-webkit-user-drag:none]"
            src="/megamind.png"
            width={200}
            height={200}
            alt="Meme"
          />
          <p className="text-2xl">No Mods?</p>
        </div>
      )}
    </div>
  );
};

export function Developer() {
  let [debugMode, setDebugMode] = useState(ls.get("debug") === "true" || false)

  function debugModeChange(event) {
    setDebugMode(event)
  }

  useEffect(() => {
    if (debugMode) {
      ls.set("debug", "true")
    } else {
      ls.remove("debug")
    }
  }, [debugMode])

  return (
    <div className="flex gap-2 items-center">
      <Switch id="debugMode" checked={debugMode} onCheckedChange={debugModeChange} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="debugMode">Debug Mode</Label>
        <p className="text-destructive text-xs">Sensitive data will be printed to the console!</p>
      </div>
    </div>
  )
};