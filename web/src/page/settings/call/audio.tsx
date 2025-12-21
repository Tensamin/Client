// Package Imports
import { useMediaDeviceSelect } from "@livekit/components-react";
import type { AudioPipelineHandle } from "@tensamin/audio";
import * as Icon from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Lib Imports
import { audioService } from "@/lib/audioService";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SettingsPageTitle } from "@/page/settings";

// Main
function AudioLevelRangeSlider({
  minValue,
  maxValue,
  audioLevel,
  onValueChange,
  min = -90,
  max = 0,
}: {
  minValue: number;
  maxValue: number;
  audioLevel: number;
  onValueChange: (values: [number, number]) => void;
  min?: number;
  max?: number;
}) {
  const bars = 50;
  const activeBarCount = Math.round(audioLevel * bars);

  return (
    <div className="flex flex-col gap-3 w-full">
      <Label>Speaking Detection Range</Label>

      {/* Visualization */}
      <div className="relative flex h-12 items-end gap-0.5 bg-muted/30 rounded-lg p-2">
        {Array.from({ length: bars }).map((_, i) => {
          const isActiveBar = i < activeBarCount;
          const intensity = i / bars;
          let barColor = "bg-muted-foreground/40";

          if (audioLevel > 0 && isActiveBar) {
            if (intensity < 0.5) {
              barColor = "bg-emerald-500";
            } else if (intensity < 0.75) {
              barColor = "bg-amber-500";
            } else {
              barColor = "bg-rose-500";
            }
          }

          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all duration-75 ${barColor}`}
              style={{
                height: `${Math.max(20, audioLevel * 100)}%`,
                opacity: audioLevel > 0 && isActiveBar ? 1 : 0.25,
              }}
            />
          );
        })}
      </div>

      {/* Slider */}
      <Slider
        value={[minValue, maxValue]}
        onValueChange={(values) => onValueChange(values as [number, number])}
        min={min}
        max={max}
        step={1}
        className="w-full"
      />
    </div>
  );
}

// Audio Test Hook
function useAudioTest(
  inputDeviceId: string,
  outputDeviceId: string,
  settings: {
    enableNoiseSuppression: boolean;
    noiseReductionLevel: number;
    inputGain: number;
    channelCount: number;
    sampleRate: number;
    speakingMinDb: number;
    speakingMaxDb: number;
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
  const pipelineHandleRef = useRef<AudioPipelineHandle | null>(null);

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

      await audioService.resumeContext();
      const audioContext = audioService.getAudioContext();

      const { stream: processedStream, handle } = await audioService
        .processStream(stream, {
          noiseSuppressionEnabled: settings.enableNoiseSuppression,
          noiseReductionLevel: settings.noiseReductionLevel,
          inputGain: settings.inputGain,
          enableNoiseGate: true,
          speakingMinDb: settings.speakingMinDb,
          speakingMaxDb: settings.speakingMaxDb,
          assetCdnUrl: "/audio",
        })
        .catch((error) => {
          console.error("Failed to start audio pipeline", error);
          throw error;
        });

      processedStreamRef.current = processedStream;
      pipelineHandleRef.current = handle;

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

    if (pipelineHandleRef.current) {
      audioService.releasePipeline(pipelineHandleRef.current);
      pipelineHandleRef.current = null;
    }

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
    settings.noiseReductionLevel,
    settings.inputGain,
    settings.channelCount,
    settings.sampleRate,
    settings.speakingMinDb,
    settings.speakingMaxDb,
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
      noiseReductionLevel: (data.call_noiseReductionLevel as number) ?? 60,
      inputGain: (data.call_inputGain as number) ?? 1.0,
      channelCount: (data.call_channelCount as number) ?? 2,
      sampleRate: (data.call_sampleRate as number) ?? 48000,
      speakingMinDb: (data.call_speakingMinDb as number) ?? -60,
      speakingMaxDb: (data.call_speakingMaxDb as number) ?? -20,
    }
  );

  return (
    <div className="flex gap-7">
      <div className="flex flex-col gap-7 flex-1">
        {/* Basic Setup */}
        <div className="flex flex-col">
          <SettingsPageTitle text="Basic Setup" />
          <div className="flex flex-col gap-4">
            <div className="flex gap-5">
              {/* Input Device */}
              <div className="flex flex-col gap-2">
                <Label>Input Device</Label>
                <Select
                  value={inputDevices.activeDeviceId}
                  onValueChange={(value) => {
                    set("call_inputDeviceID", value);
                    inputDevices.setActiveMediaDevice(value);
                  }}
                >
                  <SelectTrigger className="w-50">
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
              <div className="flex flex-col gap-2">
                <Label>Output Device</Label>
                <Select
                  value={outputDevices.activeDeviceId}
                  onValueChange={(value) => {
                    set("call_outputDeviceID", value);
                    outputDevices.setActiveMediaDevice(value);
                  }}
                >
                  <SelectTrigger className="w-50">
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

            {/* Input Gain */}
            <div className="flex flex-col gap-2">
              <Label>Input Gain</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[(data.call_inputGain as number) ?? 1.0]}
                  onValueChange={(value) => set("call_inputGain", value[0])}
                  step={0.01}
                  min={0}
                  max={2}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-10">
                  {(typeof data.call_inputGain === "number"
                    ? data.call_inputGain
                    : 1.0
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Echo Cancellation */}
            <SwitchWithLabel
              id="call_enableEchoCancellation"
              label="Enable Echo Cancellation"
              value={(data.call_enableEchoCancellation as boolean) ?? false}
              setValue={(value) => set("call_enableEchoCancellation", value)}
            />

            {/* Noise Suppression */}
            <SwitchWithLabel
              id="call_enableNoiseSuppression"
              label="Enable Noise Suppression"
              value={(data.call_enableNoiseSuppression as boolean) ?? true}
              setValue={(value) => set("call_enableNoiseSuppression", value)}
            />
          </div>
        </div>

        {/* Speaking Detection */}
        <div className="flex flex-col gap-4">
          <AudioLevelRangeSlider
            minValue={(data.call_speakingMinDb as number) ?? -60}
            maxValue={(data.call_speakingMaxDb as number) ?? -20}
            audioLevel={audioTest.audioLevel}
            onValueChange={([min, max]) => {
              set("call_speakingMinDb", min);
              set("call_speakingMaxDb", max);
            }}
            min={-90}
            max={0}
          />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Min:{" "}
              <span className="font-semibold text-foreground">
                {(data.call_speakingMinDb as number) ?? -60} dB
              </span>
            </span>
            <span className="text-muted-foreground">
              Max:{" "}
              <span className="font-semibold text-foreground">
                {(data.call_speakingMaxDb as number) ?? -20} dB
              </span>
            </span>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="flex flex-col">
          <SettingsPageTitle text="Advanced Settings" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Noise Suppression Amount</Label>
              <div className="flex items-center gap-3">
                <Slider
                  disabled={
                    !((data.call_enableNoiseSuppression as boolean) ?? true)
                  }
                  value={[(data.call_noiseReductionLevel as number) ?? 60]}
                  onValueChange={(value) =>
                    set("call_noiseReductionLevel", value[0])
                  }
                  step={1}
                  min={0}
                  max={100}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-10">
                  {(data.call_noiseReductionLevel as number) ?? 60}
                </span>
              </div>
            </div>
            <SwitchWithLabel
              id="call_enableNoiseGate"
              label="Enable Noise Gate"
              value={(data.call_enableNoiseGate as boolean) ?? true}
              setValue={(value) => set("call_enableNoiseGate", value)}
            />
            <SwitchWithLabel
              id="call_enableAutoGainControl"
              label="Enable Auto Gain Control"
              value={(data.call_enableAutoGainControl as boolean) ?? true}
              setValue={(value) => set("call_enableAutoGainControl", value)}
            />
            <SwitchWithLabel
              id="call_enableDynacast"
              label="Enable Dynacast"
              value={(data.call_enableDynacast as boolean) ?? true}
              setValue={(value) => set("call_enableDynacast", value)}
            />
            <SwitchWithLabel
              id="call_enableAdaptiveStream"
              label="Enable Adaptive Stream"
              value={(data.call_enableAdaptiveStream as boolean) ?? true}
              setValue={(value) => set("call_enableAdaptiveStream", value)}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="call_channelCount">Channel Count:</Label>
              <Input
                id="call_channelCount"
                type="number"
                value={(data.call_channelCount as number) ?? 2}
                onChange={(e) =>
                  set("call_channelCount", parseFloat(e.target.value) || 2)
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="call_sampleRate">Sample Rate (Hz):</Label>
              <Input
                id="call_sampleRate"
                type="number"
                value={(data.call_sampleRate as number) ?? 48000}
                onChange={(e) =>
                  set("call_sampleRate", parseFloat(e.target.value) || 48000)
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audio Test (Right) */}
      <div className="flex flex-col gap-3 w-80">
        <SettingsPageTitle text="Audio Test" />
        <div className="flex flex-col gap-4 p-4 rounded-lg border bg-card">
          <div className="flex flex-col gap-2">
            <AudioLevelMeter
              level={audioTest.audioLevel}
              isActive={audioTest.isListening}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant={audioTest.isRecording ? "destructive" : "outline"}
              size="sm"
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
            <Button
              variant={audioTest.isPlaying ? "destructive" : "outline"}
              size="sm"
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
