// Package Imports
import { useLocalParticipant } from "@livekit/components-react";
import {
  LocalAudioTrack,
  LocalVideoTrack,
  Track,
  VideoPresets,
} from "livekit-client";
import * as Icon from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Context Imports
import { useSubCallContext } from "@/context/call";
import { rawDebugLog, useStorageContext } from "@/context/storage";

// Components
import { LoadingIcon } from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  sources,
  audioSources,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (videoId: string, audioId: string, includeAudio: boolean) => void;
  sources: DesktopSource[];
  audioSources: Array<{ id: string; name: string; type: string }>;
}) {
  const screens = sources.filter((s) => s.id.startsWith("screen:"));
  const apps = sources.filter((s) => s.id.startsWith("window:"));
  const [selectedVideoSource, setSelectedVideoSource] = useState<string | null>(
    null,
  );
  const [selectedAudioSource, setSelectedAudioSource] = useState<string>("system");
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // Auto-select video source if only one available (but still show dialog for audio selection)
  useEffect(() => {
    if (sources.length === 1 && !selectedVideoSource && open) {
      setSelectedVideoSource(sources[0].id);
    }
  }, [sources, selectedVideoSource, open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedAudioSource("system");
      setIncludeAudio(true);
    }
  }, [open]);

  const handleShare = () => {
    if (selectedVideoSource) {
      // If audio is disabled, pass "none" regardless of selection
      const audioId = includeAudio ? (selectedAudioSource || "system") : "none";
      onSelect(selectedVideoSource, audioId, includeAudio);
      setSelectedVideoSource(null);
      setSelectedAudioSource("system");
      setIncludeAudio(true);
    }
  };

  // Filter audio sources to exclude "none" since we have a checkbox now
  const filteredAudioSources = audioSources.filter((s) => s.id !== "none");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Share Screen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Video Source Selection */}
          <Tabs defaultValue={screens.length > 0 ? "screens" : "apps"}>
            {sources.length !== 1 && (
              <TabsList>
                {screens.length > 0 && (
                  <TabsTrigger value="screens">Screens</TabsTrigger>
                )}
                {apps.length > 0 && (
                  <TabsTrigger value="apps">Applications</TabsTrigger>
                )}
              </TabsList>
            )}
            <TabsContent value="screens" className="grid grid-cols-2 gap-4">
              {screens.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedVideoSource(source.id)}
                  className={`cursor-pointer hover:opacity-80 rounded-lg border-2 transition-colors ${
                    selectedVideoSource === source.id
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="w-full rounded-lg border"
                  />
                  {source.name && source.name !== "" && (
                    <p className="text-center mt-2 text-sm truncate px-2">
                      {source.name}
                    </p>
                  )}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="apps" className="grid grid-cols-3 gap-4">
              {apps.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedVideoSource(source.id)}
                  className={`cursor-pointer hover:opacity-80 rounded-lg border-2 transition-colors ${
                    selectedVideoSource === source.id
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="w-full rounded-lg border"
                  />
                  <div className="flex items-center gap-2 mt-2 justify-center px-2">
                    {source.appIcon && source.appIcon.endsWith("=") && (
                      <img
                        src={source.appIcon}
                        className="w-6 h-6"
                        alt={source.name || "Source"}
                      />
                    )}
                    <p className="text-center text-sm truncate">
                      {source.name}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          {/* Audio Settings Section */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {/* Include Audio Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-audio"
                checked={includeAudio}
                onCheckedChange={(checked) => setIncludeAudio(checked === true)}
              />
              <Label htmlFor="include-audio" className="text-sm font-medium cursor-pointer">
                Include Audio
              </Label>
              <span className="text-xs text-muted-foreground">
                (Share system/application audio with viewers)
              </span>
            </div>

            {/* Audio Source Selection - Only shown when audio is enabled */}
            {includeAudio && filteredAudioSources.length > 0 && (
              <div className="flex flex-col gap-2 pl-6">
                <Label className="text-sm text-muted-foreground">Audio Source</Label>
                <Select
                  value={selectedAudioSource}
                  onValueChange={setSelectedAudioSource}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select audio source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAudioSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        <div className="flex items-center gap-2">
                          {source.type === "system" && <Icon.Volume2 className="h-4 w-4" />}
                          {source.type === "pipewire" && <Icon.AudioLines className="h-4 w-4" />}
                          {source.type === "monitor" && <Icon.Monitor className="h-4 w-4" />}
                          <span>{source.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Note: Changing the audio source requires restarting the screen share.
                </p>
              </div>
            )}
          </div>

          {/* Share Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={!selectedVideoSource}>
              <Icon.MonitorPlay className="h-4 w-4 mr-2" />
              Start Sharing
            </Button>
          </div>
        </div>
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
  const [getSources, setGetSources] = useState(false);

  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [audioSources, setAudioSources] = useState<
    Array<{ id: string; name: string; type: string }>
  >([]);

  // Defaults
  const dataWithDefaults = {
    call_screenShare_width:
      (data.call_screenShare_width as number) ??
      defaults.call_screenShare_width,
    call_screenShare_height:
      (data.call_screenShare_height as number) ??
      defaults.call_screenShare_height,
    call_screenShare_frameRate:
      (data.call_screenShare_frameRate as number) ??
      defaults.call_screenShare_frameRate,
  };

  // Apply constraints during screen share
  useEffect(() => {
    if (!isScreenShareEnabled || !localParticipant) return;

    const applyNewConstraints = async () => {
      try {
        const screenShareTrack = localParticipant.getTrackPublication(
          Track.Source.ScreenShare,
        );

        if (!screenShareTrack?.track) return;

        const videoTrack = screenShareTrack.track as LocalVideoTrack;
        const mediaStreamTrack = videoTrack.mediaStreamTrack;

        if (!mediaStreamTrack || mediaStreamTrack.kind !== "video") return;

        // Apply new constraints to the existing track
        await mediaStreamTrack.applyConstraints({
          width: { ideal: dataWithDefaults.call_screenShare_width },
          height: { ideal: dataWithDefaults.call_screenShare_height },
          frameRate: { ideal: dataWithDefaults.call_screenShare_frameRate },
        });

        rawDebugLog(
          "ScreenShare",
          "Applied new constraints",
          {
            width: dataWithDefaults.call_screenShare_width,
            height: dataWithDefaults.call_screenShare_height,
            frameRate: dataWithDefaults.call_screenShare_frameRate,
          },
          "purple",
        );
      } catch (err) {
        rawDebugLog(
          "ScreenShare",
          "Failed to apply constraints",
          { err },
          "red",
        );
      }
    };

    applyNewConstraints();
  }, [
    isScreenShareEnabled,
    localParticipant,
    dataWithDefaults.call_screenShare_width,
    dataWithDefaults.call_screenShare_height,
    dataWithDefaults.call_screenShare_frameRate,
  ]);

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
            setGetSources(true);
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

  const handleElectronShare = useCallback(
    async (videoId: string, audioId: string) => {
      setPickerOpen(false);
      rawDebugLog(
        "ScreenShare",
        "Starting screen share",
        { videoId, audioId, includesAudio: audioId !== "none" },
        "purple",
      );

      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: videoId,
              minWidth: dataWithDefaults.call_screenShare_width,
              maxWidth: dataWithDefaults.call_screenShare_width,
              minHeight: dataWithDefaults.call_screenShare_height,
              maxHeight: dataWithDefaults.call_screenShare_height,
              minFrameRate: dataWithDefaults.call_screenShare_frameRate,
              maxFrameRate: dataWithDefaults.call_screenShare_frameRate,
            },
          },
        } as MediaStreamConstraints);

        const videoTrack = videoStream.getVideoTracks()[0];

        if (videoTrack) {
          const localVideoTrack = new LocalVideoTrack(videoTrack);
          await localParticipant.publishTrack(localVideoTrack, {
            source: Track.Source.ScreenShare,
            ...VideoPresets.h1440,
            simulcast: false,
            videoEncoding: {
              ...VideoPresets.h1440.encoding,
              maxFramerate: dataWithDefaults.call_screenShare_frameRate,
            },
          });
          rawDebugLog("ScreenShare", "Video track published", undefined, "green");
        }

        // Capture audio (only if not "none")
        // IMPORTANT: We do NOT fall back to microphone to avoid users hearing audio twice
        if (audioId !== "none") {
          try {
            let audioStream: MediaStream | null = null;

            if (audioId === "system") {
              // System audio capture - uses the video source ID for loopback
              rawDebugLog("ScreenShare", "Capturing system audio", { videoId }, "purple");
              audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: videoId,
                  },
                } as unknown,
                video: false,
              } as MediaStreamConstraints);
            } else if (audioId.startsWith("pipewire:") || audioId.length > 20) {
              // PipeWire or device ID based capture (Linux)
              rawDebugLog("ScreenShare", "Capturing PipeWire/device audio", { audioId }, "purple");
              audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  deviceId: { exact: audioId },
                },
                video: false,
              } as MediaStreamConstraints);
            } else {
              // Other audio source types
              rawDebugLog("ScreenShare", "Capturing other audio source", { audioId }, "purple");
              audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: audioId,
                  },
                } as unknown,
                video: false,
              } as MediaStreamConstraints);
            }

            if (audioStream) {
              const audioTracks = audioStream.getAudioTracks();
              if (audioTracks.length > 0) {
                const audioTrack = audioTracks[0];
                const localAudioTrack = new LocalAudioTrack(audioTrack);
                await localParticipant.publishTrack(localAudioTrack, {
                  source: Track.Source.ScreenShareAudio,
                });
                rawDebugLog("ScreenShare", "Audio track published successfully", undefined, "green");
              } else {
                // No audio tracks captured - notify user but continue with video
                rawDebugLog("ScreenShare", "No audio tracks captured", undefined, "yellow");
                toast.error("Audio capture unavailable for this source. Continuing with video only.", {
                  description: "Try selecting a different audio source.",
                  duration: 5000,
                });
              }
            }
          } catch (audioErr) {
            // Audio capture failed - continue with video-only (no mic fallback!)
            const errorMessage = audioErr instanceof Error ? audioErr.message : String(audioErr);
            rawDebugLog("ScreenShare", "Audio capture failed", { error: errorMessage }, "red");

            // Provide platform-specific error messages
            let description = "Check audio source settings.";
            if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
              description = "Permission denied. Check your system privacy settings.";
            } else if (errorMessage.includes("NotFoundError")) {
              description = "Audio device not found. Ensure audio is playing.";
            } else if (errorMessage.includes("NotReadableError")) {
              description = "Audio device is busy or unavailable.";
            }

            toast.error("Screen sharing started but audio capture failed.", {
              description,
              duration: 5000,
            });
          }
        } else {
          rawDebugLog("ScreenShare", "Audio disabled by user choice", undefined, "purple");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        rawDebugLog("ScreenShare", "Failed to share screen", { error: errorMessage }, "red");
        toast.error("Failed to share screen");
      }
    },
    [
      dataWithDefaults.call_screenShare_frameRate,
      dataWithDefaults.call_screenShare_height,
      dataWithDefaults.call_screenShare_width,
      localParticipant,
    ],
  );

  // Get sources
  useEffect(() => {
    let mounted = true;
    if (!getSources) {
      return () => {
        mounted = false;
      };
    }

    setLoading(true);

    type ElectronAPI = {
      getScreenSources?: () => Promise<DesktopSource[]>;
      getAudioSources?: () => Promise<
        Array<{ id: string; name: string; type: string }>
      >;
    };

    const electronApi = (
      window as typeof window & { electronAPI?: ElectronAPI }
    ).electronAPI;

    if (!electronApi?.getScreenSources || !electronApi?.getAudioSources) {
      toast.error("Screen capture picker is unavailable in this environment.");
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // Load sources
    const loadSources = async () => {
      try {
        const [videoSources, audioSourcesList] = await Promise.all([
          electronApi.getScreenSources!(),
          electronApi.getAudioSources!(),
        ]);

        if (!mounted) return;

        const audioDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = audioDevices.filter((d) => d.kind === "audioinput");

        const enhancedAudioSources = [...audioSourcesList];
        audioInputs.forEach((device) => {
          if (
            device.label.toLowerCase().includes("monitor") ||
            device.label.toLowerCase().includes("loopback") ||
            device.label.toLowerCase().includes("pipewire")
          ) {
            enhancedAudioSources.push({
              id: device.deviceId,
              name: device.label || "Unknown Audio Device",
              type: "monitor",
            });
          }
        });

        setSources(videoSources);
        setAudioSources(enhancedAudioSources);
        setPickerOpen(true);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load sources:", error);
        toast.error("Failed to load screen sources.");
        setSources([]);
        setAudioSources([]);
      } finally {
        if (mounted) {
          setLoading(false);
          setGetSources(false);
        }
      }
    };

    loadSources();

    return () => {
      mounted = false;
    };
  }, [handleElectronShare, getSources]);

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
        onSelect={(videoId, audioId, includeAudio) => {
          // If audio is not included, pass "none" to ensure no audio capture is attempted
          const effectiveAudioId = includeAudio ? audioId : "none";
          handleElectronShare(videoId, effectiveAudioId);
        }}
        sources={sources}
        audioSources={audioSources}
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
                <Icon.Loader2 className="animate-spin" />
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
            <MenubarSub>
              <MenubarSubTrigger className="flex gap-2 items-center">
                <Icon.Sparkles size={15} /> Change Quality
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarRadioGroup
                  value={`${dataWithDefaults.call_screenShare_width}${dataWithDefaults.call_screenShare_height}${dataWithDefaults.call_screenShare_frameRate}`}
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
          undefined,
          "purple",
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
