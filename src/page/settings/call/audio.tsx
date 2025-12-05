// Package Imports
import { useMediaDeviceSelect } from "@livekit/components-react";
import { useState, useEffect, useRef, useCallback } from "react";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Lib Imports
import { audioService } from "@/lib/audioService";

// Components
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsPageTitle } from "@/page/settings";
import { Slider } from "@/components/ui/slider";

// Icons
import * as Icon from "lucide-react";

// Audio Test Hook
function useAudioTest(
  inputDeviceId: string,
  outputDeviceId: string,
  settings: {
    enableNoiseSuppression: boolean;
    noiseSensitivity: number;
    inputGain: number;
    channelCount: number;
    sampleRate: number;
  }
) {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(
    null
  );

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputDeviceId ? { exact: inputDeviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: settings.channelCount,
          sampleRate: settings.sampleRate,
        },
      });

      streamRef.current = stream;

      const audioContext = audioService.getAudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Apply noise processing if enabled
      if (settings.enableNoiseSuppression) {
        const threshold = -20 - settings.noiseSensitivity * 70;

        const processed = await audioService.processStream(stream, {
          enableNoiseGate: true,
          algorithm: "rnnoise",
          maxChannels: settings.channelCount,
          sensitivity: threshold,
          inputGain: settings.inputGain,
        });
        processedStreamRef.current = processed;
      } else {
        const audioContext = audioService.getAudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = settings.inputGain;
        const dest = audioContext.createMediaStreamDestination();
        source.connect(gainNode);
        gainNode.connect(dest);
        processedStreamRef.current = dest.stream;
      }

      // Setup analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      sourceNodeRef.current = audioContext.createMediaStreamSource(
        processedStreamRef.current!
      );
      sourceNodeRef.current.connect(analyser);

      // Create destination for loopback
      destinationNodeRef.current = audioContext.createMediaStreamDestination();
      analyser.connect(destinationNodeRef.current);

      // Start level monitoring
      updateAudioLevel();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start audio test:", error);
    }
  }, [inputDeviceId, settings, updateAudioLevel]);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    destinationNodeRef.current?.disconnect();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    processedStreamRef.current?.getTracks().forEach((track) => track.stop());

    audioService.cleanup();

    streamRef.current = null;
    processedStreamRef.current = null;
    analyserRef.current = null;
    sourceNodeRef.current = null;
    destinationNodeRef.current = null;

    setAudioLevel(0);
    setIsListening(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!isListening) {
      await startListening();
    }

    if (!processedStreamRef.current) return;

    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(processedStreamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setRecordedBlob(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
  }, [isListening, startListening]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }, [isRecording]);

  const playRecording = useCallback(async () => {
    if (!recordedBlob) return;

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      URL.revokeObjectURL(audioElementRef.current.src);
    }

    const audio = new Audio(URL.createObjectURL(recordedBlob));
    audioElementRef.current = audio;

    // Set output device if supported
    if (outputDeviceId && "setSinkId" in audio) {
      try {
        await (
          audio as HTMLAudioElement & {
            setSinkId: (id: string) => Promise<void>;
          }
        ).setSinkId(outputDeviceId);
      } catch (e) {
        console.warn("Failed to set output device:", e);
      }
    }

    audio.onended = () => {
      setIsPlaying(false);
    };

    setIsPlaying(true);
    await audio.play();
  }, [recordedBlob, outputDeviceId]);

  const stopPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopPlayback();
    };
  }, [stopListening, stopPlayback]);

  // Restart listening when settings change (if already listening)
  useEffect(() => {
    if (isListening && !isRecording) {
      stopListening();
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.enableNoiseSuppression,
    settings.noiseSensitivity,
    settings.inputGain,
    settings.channelCount,
    settings.sampleRate,
    inputDeviceId,
  ]);

  return {
    isListening,
    isRecording,
    isPlaying,
    audioLevel,
    recordedBlob,
    startListening,
    stopListening,
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
  };
}

// Audio Level Meter Component
function AudioLevelMeter({
  level,
  isActive,
}: {
  level: number;
  isActive: boolean;
}) {
  const bars = 20;
  const activeBarCount = Math.round(level * bars);

  return (
    <div className="flex gap-0.5 h-6 items-end">
      {Array.from({ length: bars }).map((_, i) => {
        const isActiveBar = i < activeBarCount;
        const intensity = i / bars;
        let barColor = "bg-muted-foreground";

        if (isActive && isActiveBar) {
          if (intensity < 0.5) {
            barColor = "bg-green-500";
          } else if (intensity < 0.75) {
            barColor = "bg-yellow-500";
          } else {
            barColor = "bg-red-500";
          }
        }

        return (
          <div
            key={i}
            className={`w-2 rounded-sm transition-all duration-75 ${barColor}`}
            style={{
              height: `${40 + i * 3}%`,
              opacity: isActive && isActiveBar ? 1 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

// Main
export default function Page() {
  const { data, set } = useStorageContext();

  const inputDevices = useMediaDeviceSelect({
    kind: "audioinput",
  });
  const outputDevices = useMediaDeviceSelect({
    kind: "audiooutput",
  });

  // Audio test hook
  const audioTest = useAudioTest(
    inputDevices.activeDeviceId || "",
    outputDevices.activeDeviceId || "",
    {
      enableNoiseSuppression:
        (data.call_enableNoiseSuppression as boolean) ?? true,
      noiseSensitivity: (data.call_noiseSensitivity as number) ?? 0.5,
      inputGain: (data.call_inputGain as number) ?? 1.0,
      channelCount: (data.call_channelCount as number) ?? 2,
      sampleRate: (data.call_sampleRate as number) ?? 48000,
    }
  );

  const options = [
    {
      label: "Enable Echo Cancellation",
      key: "call_enableEchoCancellation",
      default: false,
    },
    {
      label: "Enable Noise Suppression",
      key: "call_enableNoiseSuppression",
      default: true,
    },
    {
      label: "Enable Auto Gain Control",
      key: "call_enableAutoGainControl",
      default: true,
    },
    {
      label: "Enable Voice Isolation",
      key: "call_enableVoiceIsolation",
      default: true,
    },
  ];

  const advancedSwitches = [
    {
      label: "Enable Dynacast",
      key: "call_enableDynacast",
      default: true,
    },
    {
      label: "Enable Adaptive Stream",
      key: "call_enableAdaptiveStream",
      default: true,
    },
  ];

  const advanced = [
    {
      label: "Latency (seconds)",
      key: "call_latency",
      default: 0.02,
    },
    {
      label: "Channel Count",
      key: "call_channelCount",
      default: 2,
    },
    {
      label: "Sample Rate (Hz)",
      key: "call_sampleRate",
      default: 48000,
    },
    {
      label: "Sample Size (bits)",
      key: "call_sampleSize",
      default: 16,
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      {/* Input/Output Device */}
      <div className="flex gap-5">
        {/* Input Device */}
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Input Device</p>
          <Select
            value={inputDevices.activeDeviceId}
            onValueChange={(value) => {
              set("call_inputDeviceID", value);
              inputDevices.setActiveMediaDevice(value);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select device..." />
            </SelectTrigger>
            <SelectContent>
              {inputDevices.devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || "Unknown Device"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Output Device */}
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Output Device</p>
          <Select
            value={outputDevices.activeDeviceId}
            onValueChange={(value) => {
              set("call_outputDeviceID", value);
              outputDevices.setActiveMediaDevice(value);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select device..." />
            </SelectTrigger>
            <SelectContent>
              {outputDevices.devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || "Unknown Device"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Audio Test Section */}
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Test Audio</p>
        <div className="flex flex-col gap-4 p-4 rounded-lg border bg-card">
          {/* Audio Level Meter */}
          <div className="flex flex-col gap-2">
            <AudioLevelMeter
              level={audioTest.audioLevel}
              isActive={audioTest.isListening}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 flex-wrap">
            {/* Record Button */}
            <Button
              variant={audioTest.isRecording ? "destructive" : "outline"}
              size="sm"
              className="w-38"
              onClick={() => {
                if (audioTest.isRecording) {
                  audioTest.stopRecording();
                } else {
                  audioTest.startRecording();
                }
              }}
            >
              {audioTest.isRecording ? (
                <>
                  <Icon.Square className="h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Icon.Mic className="h-4 w-4 text-destructive" />
                  Record Test
                </>
              )}
            </Button>

            {/* Playback Button */}
            <Button
              variant={audioTest.isPlaying ? "destructive" : "outline"}
              size="sm"
              className="w-38"
              onClick={() => {
                if (audioTest.isPlaying) {
                  audioTest.stopPlayback();
                } else {
                  audioTest.playRecording();
                }
              }}
              disabled={!audioTest.recordedBlob || audioTest.isRecording}
            >
              {audioTest.isPlaying ? (
                <>
                  <Icon.Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Icon.Play className="h-4 w-4" />
                  Play Recording
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      {/* Input Sensitivity */}
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Input Sensitivity</p>
        <div>
          <Slider
            value={[(data.call_inputGain as number) ?? 1.0]}
            onValueChange={(value) => set("call_inputGain", value)}
            step={0.01}
            min={0}
            max={2}
          />
        </div>
      </div>
      {/* Voice Enhancement Settings */}
      <div className="flex flex-col">
        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <SwitchWithLabel
              key={option.key}
              id={option.key}
              label={option.label}
              value={(data[option.key] as boolean) ?? option.default}
              setValue={(value) => set(option.key, value)}
            />
          ))}
        </div>
      </div>
      {/* Advanced Section */}
      <div className="flex flex-col">
        <SettingsPageTitle text="Advanced" />
        <div className="flex flex-col gap-3 pb-4">
          {advancedSwitches.map((option) => (
            <SwitchWithLabel
              key={option.key}
              id={option.key}
              label={option.label}
              value={(data[option.key] as boolean) ?? option.default}
              setValue={(value) => set(option.key, value)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {/* Noise Gate Threshold */}
          <div className="flex flex-col gap-2">
            <Label className="font-semibold text-md">
              Noise Gate Threshold
            </Label>
            <Slider
              value={[(data.call_noiseSensitivity as number) ?? 0.5]}
              onValueChange={(value) => set("call_noiseSensitivity", value)}
              step={0.01}
              min={0}
              max={1}
            />
          </div>
          {advanced.map((option) => (
            <div key={option.key} className="flex flex-col gap-2">
              <Label htmlFor={option.key}>{option.label}:</Label>
              <Input
                id={option.key}
                type="number"
                value={(data[option.key] as number) ?? option.default}
                onChange={(e) =>
                  set(option.key, parseFloat(e.target.value) || option.default)
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwitchWithLabel({
  id,
  label,
  value,
  setValue,
}: {
  id: string;
  label: string;
  value: boolean;
  setValue: (value: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <Switch id={id} checked={value} onCheckedChange={setValue} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

// call_noiseSensitivity
