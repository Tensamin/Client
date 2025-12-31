// Package Imports
import { useLocalParticipant } from "@livekit/components-react";
import { LocalVideoTrack, Track, VideoPresets } from "livekit-client";
import * as Icon from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Context Imports
import { useSubCallContext } from "@/context/call";
import { rawDebugLog, useStorageContext } from "@/context/storage";

// Components
import { LoadingIcon } from "@/components/loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserContext } from "@/context/user";
import { defaults } from "@/lib/defaults";

// Types
interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
}

// Mute Button
export function MuteButton({
  ghostMode,
  className,
}: {
  ghostMode?: boolean;
  className?: string;
}) {
  const { toggleMute } = useSubCallContext();
  const { isMicrophoneEnabled } = useLocalParticipant();

  return (
    <Button
      className={`h-9 flex-3 ${className}`}
      variant={
        ghostMode
          ? isMicrophoneEnabled
            ? "ghost"
            : "destructive"
          : isMicrophoneEnabled
            ? "outline"
            : "destructive"
      }
      onClick={toggleMute}
      aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
    >
      {isMicrophoneEnabled ? <Icon.Mic /> : <Icon.MicOff />}
    </Button>
  );
}

// Deaf Button
export function DeafButton({
  ghostMode,
  className,
}: {
  ghostMode?: boolean;
  className?: string;
}) {
  const { isDeafened, toggleDeafen } = useSubCallContext();

  return (
    <Button
      className={`h-9 flex-3 ${className}`}
      variant={
        ghostMode
          ? isDeafened
            ? "destructive"
            : "ghost"
          : isDeafened
            ? "destructive"
            : "outline"
      }
      onClick={toggleDeafen}
      aria-label={isDeafened ? "Undeafen" : "Deafen"}
    >
      {isDeafened ? <Icon.HeadphoneOff /> : <Icon.Headphones />}
    </Button>
  );
}

// Screen Share Picker (Electron)
function ScreenSharePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!open) {
      setSources([]);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);

    type ElectronAPI = {
      getScreenSources?: () => Promise<DesktopSource[]>;
    };

    const electronApi = (
      window as typeof window & { electronAPI?: ElectronAPI }
    ).electronAPI;

    if (!electronApi?.getScreenSources) {
      toast.error("Screen capture picker is unavailable in this environment.");
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    electronApi
      .getScreenSources()
      .then((result) => {
        if (!mounted) return;
        setSources(result);
      })
      .catch(() => {
        if (!mounted) return;
        toast.error("Failed to load screen sources.");
        setSources([]);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const screens = sources.filter((s) => s.id.startsWith("screen:"));
  const apps = sources.filter((s) => s.id.startsWith("window:"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Screen</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-4">
            <LoadingIcon />
          </div>
        ) : (
          <Tabs defaultValue={screens.length > 0 ? "screens" : "apps"}>
            <TabsList>
              {screens.length > 0 && (
                <TabsTrigger value="screens">Screens</TabsTrigger>
              )}
              {apps.length > 0 && (
                <TabsTrigger value="apps">Applications</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="screens" className="grid grid-cols-2 gap-4">
              {screens.map((source) => (
                <div key={source.id} onClick={() => onSelect(source.id)}>
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="w-full rounded-lg border"
                  />
                  {source.name && source.name !== "" && (
                    <p className="text-center mt-2 text-sm truncate">
                      {source.name}
                    </p>
                  )}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="apps" className="grid grid-cols-3 gap-4">
              {apps.map((source) => (
                <div key={source.id} onClick={() => onSelect(source.id)}>
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="w-full rounded-lg border"
                  />
                  <div className="flex items-center gap-2 mt-2 justify-center">
                    {source.appIcon && source.appIcon.endsWith("=") && (
                      <img
                        src={source.appIcon}
                        className="w-6 h-6"
                        alt={source.name || "Source"}
                      />
                    )}
                    <p className="text-center mt-2 text-sm truncate">
                      {source.name}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Screen Share Button
export function ScreenShareButton({
  ghostMode,
  className,
}: {
  ghostMode?: boolean;
  className?: string;
}) {
  const { isScreenShareEnabled, localParticipant } = useLocalParticipant();
  const { isElectron, data, set } = useStorageContext();
  const { ownUserHasPremium } = useUserContext();

  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleScreenShare = async () => {
    try {
      if (localParticipant) {
        if (isElectron) {
          if (isScreenShareEnabled) {
            await localParticipant.setScreenShareEnabled(false);
          } else {
            setLoading(true);
            // @ts-expect-error ElectronAPI only available in Electron
            const allowed = await window.electronAPI.getScreenAccess();
            if (!allowed) {
              toast.error(
                "Screen capture permission denied. Please allow screen access in your system settings.",
              );
              setLoading(false);
              return;
            }
            setPickerOpen(true);
            setLoading(false);
          }
        } else {
          await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
        }
      }
    } catch (err) {
      toast.error("Failed to start screen share.");
      rawDebugLog("Call Context", "Failed to get sources", { err }, "red");
      setLoading(false);
    }
  };

  const handleElectronShare = async (id: string) => {
    setPickerOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: id,
            maxFrameRate: 60,
          },
        } as unknown as MediaTrackConstraints,
      });

      const track = stream.getVideoTracks()[0];
      const localVideoTrack = new LocalVideoTrack(track);
      await localParticipant.publishTrack(localVideoTrack, {
        source: Track.Source.ScreenShare,
        ...VideoPresets.h1440,
        simulcast: false,
        videoEncoding: {
          ...VideoPresets.h1440.encoding,
          maxFramerate: 60,
        },
      });
    } catch (err) {
      console.error("Failed to share screen", err);
      toast.error("Failed to share screen");
    }
  };

  const toggleShareAudio = () => {
    set(
      "data.call_screenShare_audio",
      !(
        (data.call_screenShare_audio as boolean) ??
        defaults.call_screenShare_audio
      ),
    );
  };

  // call_screenShare_width
  // call_screenShare_height
  // call_screenShare_frameRate
  const qualityPresets = [
    // 480p
    {
      label: "480p / 30",
      width: 854,
      height: 480,
      frameRate: 30,
      premium: false,
    },

    // 720p
    {
      label: "720p / 60",
      width: 1280,
      height: 720,
      frameRate: 60,
      premium: false,
    },

    // 1080p
    {
      label: "1080p / 30",
      width: 1920,
      height: 1080,
      frameRate: 30,
      premium: false,
    },
    {
      label: "1080p / 60",
      width: 1920,
      height: 1080,
      frameRate: 60,
      premium: true,
    },
    {
      label: "1080p / 120",
      width: 1920,
      height: 1080,
      frameRate: 120,
      premium: true,
    },

    // 1440p
    {
      label: "1440p / 60",
      width: 2560,
      height: 1440,
      frameRate: 60,
      premium: true,
    },
    {
      label: "1440p / 120",
      width: 2560,
      height: 1440,
      frameRate: 120,
      premium: true,
    },
  ];

  return (
    <>
      <ScreenSharePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleElectronShare}
      />
      <Menubar asChild>
        <MenubarMenu>
          <MenubarTrigger asChild>
            <Button
              disabled={loading}
              className={`h-9 flex-3 ${className} rounded-lg ${
                isScreenShareEnabled &&
                "focus:bg-primary/85 focus-visible:dark:bg-primary/85 focus:text-primary-foreground data-[state=open]:bg-primary/85 data-[state=open]:text-background"
              }`}
              variant={
                ghostMode
                  ? isScreenShareEnabled
                    ? "default"
                    : "ghost"
                  : isScreenShareEnabled
                    ? "default"
                    : "outline"
              }
            >
              {isScreenShareEnabled ? (
                <Icon.MonitorDot />
              ) : loading ? (
                <LoadingIcon />
              ) : (
                <Icon.Monitor />
              )}
            </Button>
          </MenubarTrigger>
          <MenubarContent align="center">
            <MenubarItem onSelect={toggleScreenShare}>
              {isScreenShareEnabled ? (
                <>
                  <Icon.CircleStop color="var(--destructive)" />
                  Stop
                </>
              ) : (
                <>
                  <Icon.CirclePlay color="var(--foreground)" />
                  Start
                </>
              )}
            </MenubarItem>
            <MenubarItem onSelect={toggleShareAudio} className="flex gap-2">
              <Switch
                className="scale-75 -mx-1.5 w-7"
                checked={
                  (data.call_screenShare_audio as boolean) ??
                  defaults.call_screenShare_audio
                }
              />
              Share Audio
            </MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger className="flex gap-2 items-center">
                <Icon.Sparkles size={15} /> Change Quality
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarRadioGroup
                  value={`${data.call_screenShare_width}${data.call_screenShare_height}${data.call_screenShare_frameRate}`}
                >
                  {qualityPresets.map((preset) => {
                    const isPremium = preset.premium;
                    const disabled = isPremium && !ownUserHasPremium;
                    return (
                      <MenubarRadioItem
                        value={`${preset.width}${preset.height}${preset.frameRate}`}
                        key={preset.label}
                        disabled={disabled}
                        onSelect={() => {
                          set("call_screenShare_width", preset.width);
                          set("call_screenShare_height", preset.height);
                          set("call_screenShare_frameRate", preset.frameRate);
                          toast.success(
                            `Screen share quality ${preset.label} saved`,
                          );
                        }}
                      >
                        {preset.label}
                        {isPremium && (
                          <Icon.Gem
                            size={15}
                            className="ml-auto text-blue-300"
                          />
                        )}
                      </MenubarRadioItem>
                    );
                  })}
                </MenubarRadioGroup>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </>
  );
}

// Camera Button
export function CameraButton({
  ghostMode,
  className,
}: {
  ghostMode?: boolean;
  className?: string;
}) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const [loading, setLoading] = useState(false);

  const toggleCamera = async () => {
    try {
      if (localParticipant) {
        setLoading(true);
        await localParticipant.setCameraEnabled(!isCameraEnabled);
        rawDebugLog(
          "Call",
          isCameraEnabled ? "Camera disabled" : "Camera enabled",
        );
      }
    } catch (error) {
      console.error("Failed to toggle camera:", error);
      toast.error("Failed to toggle camera");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className={`h-9 flex-3 ${className}`}
      variant={
        ghostMode
          ? isCameraEnabled
            ? "ghost"
            : "destructive"
          : isCameraEnabled
            ? "outline"
            : "destructive"
      }
      onClick={toggleCamera}
      disabled
      aria-label={isCameraEnabled ? "Disable camera" : "Enable camera"}
    >
      {loading ? (
        <LoadingIcon />
      ) : isCameraEnabled ? (
        <Icon.Camera />
      ) : (
        <Icon.CameraOff />
      )}
    </Button>
  );
}
