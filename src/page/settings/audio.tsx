"use client";

// Package Imports
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  useMediaDevices,
  useMediaDeviceSelect,
  usePreviewTracks,
  useMaybeRoomContext,
} from "@livekit/components-react";
import { Track, LocalAudioTrack } from "livekit-client";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useCallContext } from "@/context/call";

// Lib Imports
import { audioService } from "@/lib/audioService";

// Components
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

// Types
type NoiseSuppressionMode = 0 | 1 | 2 | 3 | 4;

const NS_OPTIONS: {
  value: NoiseSuppressionMode;
  label: string;
  description: string;
}[] = [
  { value: 0, label: "Off", description: "No noise suppression" },
  {
    value: 1,
    label: "Built-in",
    description: "Browser's built-in noise suppression",
  },
  {
    value: 2,
    label: "Speex",
    description: "Speex DSP-based noise suppression",
  },
  {
    value: 3,
    label: "RNNoise",
    description: "AI-powered noise suppression (recommended)",
  },
];

// Audio Level Visualizer Component using LiveKit's speaking detection
function AudioLevelIndicator({
  trackRef,
  isListening,
}: {
  trackRef?: LocalAudioTrack;
  isListening: boolean;
}) {
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!trackRef || !isListening) {
      setAudioLevel(0);
      return;
    }

    const setupAnalyser = async () => {
      try {
        // Create audio context for analysis
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;

        // Get the media stream from the track
        const mediaStream = new MediaStream([
          trackRef.mediaStreamTrack as MediaStreamTrack,
        ]);
        const source =
          audioContextRef.current.createMediaStreamSource(mediaStream);
        source.connect(analyserRef.current);

        // Start level monitoring
        const updateLevel = () => {
          if (!analyserRef.current) return;

          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount,
          );
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate RMS level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const level = Math.min(100, (rms / 128) * 100);
          setAudioLevel(level);

          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        console.error("Failed to setup audio analyser:", err);
      }
    };

    setupAnalyser();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [trackRef, isListening]);

  return (
    <div className="flex flex-col gap-2">
      <Label>Input Level</Label>
      <div className="w-[250px] h-4 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-75 rounded-full"
          style={{
            width: `${audioLevel}%`,
            backgroundColor:
              audioLevel > 80
                ? "hsl(var(--destructive))"
                : audioLevel > 50
                  ? "hsl(45 93% 47%)"
                  : "hsl(var(--primary))",
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {isListening
          ? "Speak into your microphone to test"
          : "Enable 'Listen to myself' to see input levels"}
      </p>
    </div>
  );
}

// Main Component
export default function Page() {
  const { data, set } = useStorageContext();
  const { shouldConnect } = useCallContext();

  // LiveKit hooks for device management
  const outputDevices = useMediaDevices({ kind: "audiooutput" });
  const inputDevices = useMediaDevices({ kind: "audioinput" });

  const audioInputController = useMediaDeviceSelect({
    kind: "audioinput",
    requestPermissions: true,
  });

  const audioOutputController = useMediaDeviceSelect({
    kind: "audiooutput",
  });

  // Check if we're in a room context
  const maybeRoom = useMaybeRoomContext();
  const isInRoom = !!maybeRoom && shouldConnect;

  // State
  const [isListening, setIsListening] = useState(false);
  const [isNoiseSuppressionSupported, setIsNoiseSuppressionSupported] =
    useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Get current settings
  const nsState = (data.nsState as NoiseSuppressionMode) ?? 0;
  const monitorVolume = (data.audioMonitorVolume as number) ?? 50;

  // Build audio constraints based on noise suppression setting
  const audioConstraints: MediaTrackConstraints = useMemo(
    () =>
      nsState === 1
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
    [nsState],
  );

  // Audio preview using LiveKit's usePreviewTracks
  // Only enable when listening and not in a room
  const shouldPreview = isListening && !isInRoom;

  const previewTracks = usePreviewTracks(
    {
      audio: shouldPreview ? audioConstraints : false,
      video: false,
    },
    (err: Error) => {
      console.error("Preview track error:", err);
      setPreviewError(err.message);
      setIsListening(false);
    },
  );

  // Get audio track from preview
  const audioPreviewTrack = useMemo(() => {
    if (!previewTracks || !shouldPreview) return undefined;
    const audioTrack = previewTracks.find(
      (track) => track.kind === Track.Kind.Audio,
    );
    return audioTrack as LocalAudioTrack | undefined;
  }, [previewTracks, shouldPreview]);

  // Audio playback ref for "listen to myself"
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);

  // Check noise suppression support
  useEffect(() => {
    setIsNoiseSuppressionSupported(audioService.isSupported());
  }, []);

  // Handle audio playback for "listen to myself"
  useEffect(() => {
    if (!audioPreviewTrack || !isListening) {
      // Cleanup playback
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null;
        audioElementRef.current.pause();
      }
      if (
        playbackContextRef.current &&
        playbackContextRef.current.state !== "closed"
      ) {
        playbackContextRef.current.close();
        playbackContextRef.current = null;
      }
      return;
    }

    const setupPlayback = async () => {
      try {
        // Create audio context for playback with gain control
        playbackContextRef.current = new AudioContext();
        const ctx = playbackContextRef.current;

        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        // Create media stream from track
        const mediaStream = new MediaStream([
          audioPreviewTrack.mediaStreamTrack as MediaStreamTrack,
        ]);

        // Set up audio graph: source -> gain -> destination
        const source = ctx.createMediaStreamSource(mediaStream);
        gainNodeRef.current = ctx.createGain();
        gainNodeRef.current.gain.value = monitorVolume / 100;

        const destination = ctx.createMediaStreamDestination();
        source.connect(gainNodeRef.current);
        gainNodeRef.current.connect(destination);

        // Create audio element for playback
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
        }
        audioElementRef.current.srcObject = destination.stream;

        // Set output device if supported
        if ("setSinkId" in audioElementRef.current) {
          const activeOutputId = audioOutputController.activeDeviceId;
          if (activeOutputId) {
            try {
              await (
                audioElementRef.current as HTMLAudioElement & {
                  setSinkId: (id: string) => Promise<void>;
                }
              ).setSinkId(activeOutputId);
            } catch (err) {
              console.error("Failed to set output device:", err);
            }
          }
        }

        await audioElementRef.current.play();
      } catch (err) {
        console.error("Failed to setup audio playback:", err);
        setPreviewError("Failed to play audio");
      }
    };

    setupPlayback();

    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
      }
    };
  }, [
    audioPreviewTrack,
    isListening,
    audioOutputController.activeDeviceId,
    monitorVolume,
  ]);

  // Update gain when volume changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = monitorVolume / 100;
    }
  }, [monitorVolume]);

  // Cleanup preview tracks when disabling listening
  useEffect(() => {
    if (!isListening && previewTracks) {
      previewTracks.forEach((track) => track.stop());
    }
  }, [isListening, previewTracks]);

  // Stop listening when entering a call
  useEffect(() => {
    if (isInRoom && isListening) {
      setIsListening(false);
    }
  }, [isInRoom, isListening]);

  // Handle noise suppression change
  const handleNsChange = useCallback(
    (value: string) => {
      const newValue = parseInt(value) as NoiseSuppressionMode;
      set("nsState", newValue);

      // Restart preview if currently listening
      if (isListening) {
        setIsListening(false);
        setTimeout(() => setIsListening(true), 100);
      }
    },
    [set, isListening],
  );

  // Handle device change
  const handleInputDeviceChange = useCallback(
    async (deviceId: string) => {
      await audioInputController.setActiveMediaDevice(deviceId);

      // Restart preview to use new device
      if (isListening) {
        setIsListening(false);
        setTimeout(() => setIsListening(true), 100);
      }
    },
    [audioInputController, isListening],
  );

  const handleOutputDeviceChange = useCallback(
    async (deviceId: string) => {
      await audioOutputController.setActiveMediaDevice(deviceId);

      // Update audio element output if currently playing
      if (audioElementRef.current && "setSinkId" in audioElementRef.current) {
        try {
          await (
            audioElementRef.current as HTMLAudioElement & {
              setSinkId: (id: string) => Promise<void>;
            }
          ).setSinkId(deviceId);
        } catch (err) {
          console.error("Failed to update output device:", err);
        }
      }
    },
    [audioOutputController],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Device Selection */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-medium">Audio Devices</h3>
        <div className="flex gap-5 flex-wrap">
          <div className="flex flex-col gap-2">
            <Label>Input Device</Label>
            <Select
              value={audioInputController.activeDeviceId || ""}
              onValueChange={handleInputDeviceChange}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Microphone" />
              </SelectTrigger>
              <SelectContent>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label ||
                      `Microphone ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Output Device</Label>
            <Select
              value={audioOutputController.activeDeviceId || ""}
              onValueChange={handleOutputDeviceChange}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Speakers" />
              </SelectTrigger>
              <SelectContent>
                {outputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Noise Suppression */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-medium">Noise Suppression</h3>
        {!isNoiseSuppressionSupported && (
          <p className="text-sm text-muted-foreground">
            Advanced noise suppression (Speex, RNNoise) is not supported in this
            browser.
          </p>
        )}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Algorithm</Label>
            <Select value={nsState.toString()} onValueChange={handleNsChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Algorithm" />
              </SelectTrigger>
              <SelectContent>
                {NS_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                    disabled={
                      option.value >= 2 &&
                      option.value <= 3 &&
                      !isNoiseSuppressionSupported
                    }
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {NS_OPTIONS.find((o) => o.value === nsState)?.description}
            </p>
          </div>

          {/* Quick test buttons */}
          <div className="flex flex-col gap-2">
            <Label>Quick Select</Label>
            <div className="flex gap-2 flex-wrap">
              {NS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={nsState === option.value ? "default" : "outline"}
                  size="sm"
                  disabled={
                    option.value >= 2 &&
                    option.value <= 3 &&
                    !isNoiseSuppressionSupported
                  }
                  onClick={() => handleNsChange(option.value.toString())}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Preview */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-medium">Audio Preview</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Switch
              id="listenToMyself"
              checked={isListening}
              disabled={isInRoom}
              onCheckedChange={(checked) => {
                setPreviewError(null);
                setIsListening(checked);
              }}
            />
            <Label htmlFor="listenToMyself">
              Listen to myself
              {isInRoom && (
                <span className="text-muted-foreground ml-2">
                  (disabled during call)
                </span>
              )}
            </Label>
          </div>

          {previewError && (
            <p className="text-sm text-destructive">{previewError}</p>
          )}

          {/* Volume control */}
          {isListening && (
            <div className="flex flex-col gap-2">
              <Label>Monitor Volume: {monitorVolume}%</Label>
              <Slider
                value={[monitorVolume]}
                min={0}
                max={100}
                step={1}
                className="w-[250px]"
                onValueChange={([value]) => set("audioMonitorVolume", value)}
              />
            </div>
          )}

          {/* Audio level meter */}
          <AudioLevelIndicator
            trackRef={audioPreviewTrack}
            isListening={isListening}
          />
        </div>
      </div>

      {/* Info about current state */}
      {isInRoom && (
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            You are currently in a call. Audio preview is disabled to avoid
            feedback. Your selected noise suppression setting (
            {NS_OPTIONS.find((o) => o.value === nsState)?.label}) will be
            applied to your call audio.
          </p>
        </div>
      )}
    </div>
  );
}
