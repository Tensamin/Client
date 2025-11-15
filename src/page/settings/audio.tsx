"use client";

import { useState, useId, useEffect, useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useStorageContext } from "@/context/storage";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

export default function Page() {
  const { data, set, translate } = useStorageContext();

  // Set defaults in storage if missing
  useEffect(() => {
    if (!data.inputDevice) set("inputDevice", "default");
    if (!data.outputDevice) set("outputDevice", "default");
    if (!data.inputVolume) set("inputVolume", 50);
    if (!data.outputVolume) set("outputVolume", 80);
    if (!data.nsState) set("nsState", false);
  }, [
    data.inputDevice,
    data.outputDevice,
    data.inputVolume,
    data.outputVolume,
    data.nsState,
    set,
  ]);
  const inputVolumeId = useId();
  const outputVolumeId = useId();

  const inputDevice = (data.inputDevice as string) || "default";
  const outputDevice = (data.outputDevice as string) || "default";
  const inputVolume = (data.inputVolume as number) || 50;
  const outputVolume = (data.outputVolume as number) || 80;

  const setInputDevice = useCallback(
    (value: string) => set("inputDevice", value),
    [set]
  );
  const setOutputDevice = useCallback(
    (value: string) => set("outputDevice", value),
    [set]
  );
  const setInputVolume = useCallback(
    (value: number) => set("inputVolume", value),
    [set]
  );
  const setOutputVolume = useCallback(
    (value: number) => set("outputVolume", value),
    [set]
  );

  // Local state
  const [micTestActive, setMicTestActive] = useState(false);

  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([
    { deviceId: "default", label: "Default", kind: "audioinput" },
  ]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([
    { deviceId: "default", label: "Default", kind: "audiooutput" },
  ]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // Mic test state
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      setIsLoadingDevices(true);

      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputDevices: AudioDevice[] = [];
      const audioOutputDevices: AudioDevice[] = [];

      devices.forEach((device) => {
        if (
          device.kind === "audioinput" &&
          device.deviceId &&
          device.deviceId !== "default" &&
          device.deviceId.trim() !== ""
        ) {
          audioInputDevices.push({
            deviceId: device.deviceId,
            label:
              device.label ||
              `${translate("SETTINGS_AUDIO_MICROPHONE_FALLBACK")} ${
                audioInputDevices.length + 1
              }`,
            kind: device.kind,
          });
        } else if (
          device.kind === "audiooutput" &&
          device.deviceId &&
          device.deviceId !== "default" &&
          device.deviceId.trim() !== ""
        ) {
          audioOutputDevices.push({
            deviceId: device.deviceId,
            label:
              device.label ||
              `${translate("SETTINGS_AUDIO_SPEAKER_FALLBACK")} ${
                audioOutputDevices.length + 1
              }`,
            kind: device.kind,
          });
        }
      });

      setInputDevices([
        { deviceId: "default", label: "Default", kind: "audioinput" },
        ...audioInputDevices,
      ]);

      setOutputDevices([
        { deviceId: "default", label: "Default", kind: "audiooutput" },
        ...audioOutputDevices,
      ]);
    } catch (error) {
      console.error("Error enumerating devices:", error);
      setInputDevices([
        { deviceId: "default", label: "Default", kind: "audioinput" },
      ]);
      setOutputDevices([
        { deviceId: "default", label: "Default", kind: "audiooutput" },
      ]);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [translate]);

  useEffect(() => {
    const loadDevices = async () => {
      await enumerateDevices();
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      loadDevices();

      const handleDeviceChange = () => {
        loadDevices();
      };

      navigator.mediaDevices.addEventListener(
        "devicechange",
        handleDeviceChange
      );

      return () => {
        navigator.mediaDevices?.removeEventListener(
          "devicechange",
          handleDeviceChange
        );
      };
    } else {
      console.warn("MediaDevices API not supported");
      setIsLoadingDevices(false);
    }
  }, [enumerateDevices]);

  const handleMicTest = useCallback(async () => {
    if (!micTestActive) {
      try {
        setMicTestActive(true);

        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId:
              inputDevice !== "default" ? { exact: inputDevice } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        micStreamRef.current = stream;

        audioContextRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();

        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        analyserRef.current = audioContextRef.current.createAnalyser();
        micGainNodeRef.current = audioContextRef.current.createGain();

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        source.connect(micGainNodeRef.current);

        micGainNodeRef.current.gain.setValueAtTime(
          (outputVolume / 100) * 0.5,
          audioContextRef.current.currentTime
        );

        if (
          "setSinkId" in audioContextRef.current &&
          outputDevice !== "default"
        ) {
          try {
            await (
              audioContextRef.current as AudioContext & {
                setSinkId: (deviceId: string) => Promise<void>;
              }
            ).setSinkId(outputDevice);
          } catch (sinkError) {
            console.warn(
              "Could not set voice playback output device:",
              sinkError
            );
          }
        }

        micGainNodeRef.current.connect(audioContextRef.current.destination);

        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;

        const updateAudioLevel = () => {
          if (analyserRef.current && micStreamRef.current) {
            const timeDomainData = new Uint8Array(analyserRef.current.fftSize);
            const frequencyData = new Uint8Array(
              analyserRef.current.frequencyBinCount
            );

            analyserRef.current.getByteTimeDomainData(timeDomainData);
            analyserRef.current.getByteFrequencyData(frequencyData);

            let sum = 0;
            let peak = 0;
            for (let i = 0; i < timeDomainData.length; i++) {
              const value = (timeDomainData[i] - 128) / 128;
              sum += value * value;
              peak = Math.max(peak, Math.abs(value));
            }
            const rms = Math.sqrt(sum / timeDomainData.length);

            let freqSum = 0;
            for (let i = 0; i < frequencyData.length; i++) {
              freqSum += frequencyData[i];
            }
            const freqAverage = freqSum / frequencyData.length;

            const rmsLevel = Math.round(rms * 100 * 5);
            const peakLevel = Math.round(peak * 100 * 3);
            const freqLevel = Math.round((freqAverage / 255) * 100 * 2);

            const level = Math.max(rmsLevel, peakLevel, freqLevel);

            setAudioLevel(Math.min(100, Math.max(0, level)));

            if (micStreamRef.current) {
              animationFrameRef.current =
                requestAnimationFrame(updateAudioLevel);
            }
          }
        };

        updateAudioLevel();
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setMicTestActive(false);
        // Could show an error toast here
      }
    } else {
      // Stop mic test
      setMicTestActive(false);
      setAudioLevel(0);

      // Clean up audio resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (micGainNodeRef.current) {
        micGainNodeRef.current.disconnect();
        micGainNodeRef.current = null;
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        micStreamRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      analyserRef.current = null;
    }
  }, [micTestActive, inputDevice, outputDevice, outputVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup mic test resources
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (micGainNodeRef.current) {
        micGainNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Selected devices should always be valid
  useEffect(() => {
    if (!isLoadingDevices) {
      const validInputIds = inputDevices.map((d) => d.deviceId);
      const validOutputIds = outputDevices.map((d) => d.deviceId);

      if (!validInputIds.includes(inputDevice)) {
        setInputDevice("default");
      }

      if (!validOutputIds.includes(outputDevice)) {
        setOutputDevice("default");
      }
    }
  }, [
    inputDevices,
    outputDevices,
    inputDevice,
    outputDevice,
    isLoadingDevices,
    setInputDevice,
    setOutputDevice,
  ]);

  // Stop mic test if input device changes while testing
  const prevInputDeviceRef = useRef(inputDevice);
  useEffect(() => {
    if (micTestActive && prevInputDeviceRef.current !== inputDevice) {
      setMicTestActive(false);
      setAudioLevel(0);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (micGainNodeRef.current) {
        micGainNodeRef.current.disconnect();
        micGainNodeRef.current = null;
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        micStreamRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      analyserRef.current = null;
    }
    prevInputDeviceRef.current = inputDevice;
  }, [inputDevice, micTestActive]);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-8 max-w-2xl">
        <div>
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label htmlFor="input-device" className="text-sm font-medium">
                  {translate("SETTINGS_AUDIO_INPUT_DEVICE_LABEL")}
                </Label>
                <Select value={inputDevice} onValueChange={setInputDevice}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDevices ? (
                      <SelectItem value="loading-input">
                        {translate("SETTINGS_AUDIO_DEVICES_LOADING")}
                      </SelectItem>
                    ) : (
                      inputDevices
                        .filter(
                          (device) =>
                            device.deviceId && device.deviceId.trim() !== ""
                        )
                        .map((device, index) => {
                          const fallbackBase = translate(
                            "SETTINGS_AUDIO_MICROPHONE_FALLBACK"
                          );
                          const deviceLabel =
                            device.deviceId === "default"
                              ? translate("SETTINGS_AUDIO_DEFAULT_DEVICE")
                              : device.label?.trim()
                              ? device.label
                              : `${fallbackBase} ${index + 1}`;

                          return (
                            <SelectItem
                              key={device.deviceId}
                              value={device.deviceId}
                            >
                              {deviceLabel ||
                                translate("SETTINGS_AUDIO_UNKNOWN_DEVICE")}
                            </SelectItem>
                          );
                        })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-device" className="text-sm font-medium">
                  {translate("SETTINGS_AUDIO_OUTPUT_DEVICE_LABEL")}
                </Label>
                <Select value={outputDevice} onValueChange={setOutputDevice}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDevices ? (
                      <SelectItem value="loading-output">
                        {translate("SETTINGS_AUDIO_DEVICES_LOADING")}
                      </SelectItem>
                    ) : (
                      outputDevices
                        .filter(
                          (device) =>
                            device.deviceId && device.deviceId.trim() !== ""
                        )
                        .map((device, index) => {
                          const fallbackBase = translate(
                            "SETTINGS_AUDIO_SPEAKER_FALLBACK"
                          );
                          const deviceLabel =
                            device.deviceId === "default"
                              ? translate("SETTINGS_AUDIO_DEFAULT_DEVICE")
                              : device.label?.trim()
                              ? device.label
                              : `${fallbackBase} ${index + 1}`;

                          return (
                            <SelectItem
                              key={device.deviceId}
                              value={device.deviceId}
                            >
                              {deviceLabel ||
                                translate("SETTINGS_AUDIO_UNKNOWN_DEVICE")}
                            </SelectItem>
                          );
                        })
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor={inputVolumeId} className="text-sm font-medium">
                  {translate("SETTINGS_AUDIO_INPUT_VOLUME")}
                </Label>
                <div className="flex items-center space-x-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1">
                        <Slider
                          id={inputVolumeId}
                          min={0}
                          max={100}
                          value={[inputVolume]}
                          onValueChange={(values) => setInputVolume(values[0])}
                          className="w-full"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={12}
                      className="font-medium"
                    >
                      {inputVolume}%
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor={outputVolumeId} className="text-sm font-medium">
                  {translate("SETTINGS_AUDIO_OUTPUT_VOLUME")}
                </Label>
                <div className="flex items-center space-x-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1">
                        <Slider
                          id={outputVolumeId}
                          min={0}
                          max={100}
                          value={[outputVolume]}
                          onValueChange={(values) => setOutputVolume(values[0])}
                          className="w-full"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={12}
                      className="font-medium"
                    >
                      {outputVolume}%
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <Label className="text-sm font-medium">
              {translate("SETTINGS_AUDIO_TEST_TITLE")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {translate("SETTINGS_AUDIO_TEST_LABEL")}
            </p>
            <Button
              onClick={handleMicTest}
              variant={micTestActive ? "destructive" : "default"}
              className="w-fit"
            >
              {micTestActive
                ? translate("SETTINGS_AUDIO_STOP_TEST")
                : translate("SETTINGS_AUDIO_START_TEST")}
            </Button>

            {micTestActive && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground font-mono">
                  {translate("SETTINGS_AUDIO_CONTEXT_PREFIX")}{" "}
                  {audioContextRef.current?.state ||
                    translate("SETTINGS_AUDIO_CONTEXT_NONE")}
                </div>
                <div className="flex-1">
                  <Slider
                    value={[audioLevel]}
                    min={0}
                    max={100}
                    disabled
                    className="w-full pointer-events-none"
                  />
                </div>

                {audioLevel > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {audioLevel < 10
                      ? translate("SETTINGS_AUDIO_TEST_VOLUME_1")
                      : audioLevel < 30
                      ? translate("SETTINGS_AUDIO_TEST_VOLUME_2")
                      : audioLevel < 70
                      ? translate("SETTINGS_AUDIO_TEST_VOLUME_3")
                      : translate("SETTINGS_AUDIO_TEST_VOLUME_4")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
