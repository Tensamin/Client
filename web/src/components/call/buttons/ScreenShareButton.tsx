"use client";

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

import { useStorageContext } from "@/context/StorageContext";
import { useUserContext } from "@/context/UserContext";
import { debugLog } from "@/lib/logger";
import { defaults } from "@/config/defaults";

import { Button } from "@/components/ui/button";
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

import ScreenSharePicker, {
  type DesktopSource,
  type AudioSource,
} from "./ScreenSharePicker";

interface ScreenShareButtonProps {
  ghostMode?: boolean;
  className?: string;
}

const QUALITY_PRESETS = [
  {
    label: "480p / 30",
    width: 854,
    height: 480,
    frameRate: 30,
    premium: false,
  },
  {
    label: "720p / 60",
    width: 1280,
    height: 720,
    frameRate: 60,
    premium: false,
  },
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

export default function ScreenShareButton({
  ghostMode,
  className,
}: ScreenShareButtonProps) {
  const { isScreenShareEnabled, localParticipant } = useLocalParticipant();
  const { isElectron, data, set } = useStorageContext();
  const { ownUserHasPremium } = useUserContext();

  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [getSources, setGetSources] = useState(false);
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);

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

        await mediaStreamTrack.applyConstraints({
          width: { ideal: dataWithDefaults.call_screenShare_width },
          height: { ideal: dataWithDefaults.call_screenShare_height },
          frameRate: { ideal: dataWithDefaults.call_screenShare_frameRate },
        });

        debugLog(
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
        debugLog("ScreenShare", "Failed to apply constraints", { err }, "red");
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
      debugLog("Call Context", "Failed to get sources", { err }, "red");
      setLoading(false);
    }
  };

  const handleElectronShare = useCallback(
    async (videoId: string, audioId: string) => {
      setPickerOpen(false);
      debugLog(
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
          debugLog("ScreenShare", "Video track published", undefined, "green");
        }

        // Capture audio (only if not "none")
        if (audioId !== "none") {
          try {
            let audioStream: MediaStream | null = null;

            if (audioId === "system") {
              debugLog(
                "ScreenShare",
                "Capturing system audio",
                { videoId },
                "purple",
              );
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
              debugLog(
                "ScreenShare",
                "Capturing PipeWire/device audio",
                { audioId },
                "purple",
              );
              audioStream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: audioId } },
                video: false,
              } as MediaStreamConstraints);
            } else {
              debugLog(
                "ScreenShare",
                "Capturing other audio source",
                { audioId },
                "purple",
              );
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
                debugLog(
                  "ScreenShare",
                  "Audio track published successfully",
                  undefined,
                  "green",
                );
              } else {
                debugLog(
                  "ScreenShare",
                  "No audio tracks captured",
                  undefined,
                  "yellow",
                );
                toast.error(
                  "Audio capture unavailable for this source. Continuing with video only.",
                  {
                    description: "Try selecting a different audio source.",
                    duration: 5000,
                  },
                );
              }
            }
          } catch (audioErr) {
            const errorMessage =
              audioErr instanceof Error ? audioErr.message : String(audioErr);
            debugLog(
              "ScreenShare",
              "Audio capture failed",
              { error: errorMessage },
              "red",
            );

            let description = "Check audio source settings.";
            if (
              errorMessage.includes("Permission denied") ||
              errorMessage.includes("NotAllowedError")
            ) {
              description =
                "Permission denied. Check your system privacy settings.";
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
          debugLog(
            "ScreenShare",
            "Audio disabled by user choice",
            undefined,
            "purple",
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        debugLog(
          "ScreenShare",
          "Failed to share screen",
          { error: errorMessage },
          "red",
        );
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
      getAudioSources?: () => Promise<AudioSource[]>;
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

  return (
    <>
      <ScreenSharePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(videoId, audioId, includeAudio) => {
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
                  {QUALITY_PRESETS.map((preset) => {
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
