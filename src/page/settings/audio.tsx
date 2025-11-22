"use client";

// Package Imports
import {
  useMediaDevices,
  useMediaDeviceSelect,
} from "@livekit/components-react";

// Components
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";

// Main
export default function Page() {
  const outputDevices = useMediaDevices({ kind: "audiooutput" });
  const inputDevices = useMediaDevices({ kind: "audioinput" });

  const audioInputDeviceController = useMediaDeviceSelect({
    kind: "audioinput",
  });

  const audioOutputDeviceController = useMediaDeviceSelect({
    kind: "audiooutput",
  });

  return (
    <div className="flex gap-5">
      <div className="flex flex-col gap-2">
        <p>Input Device</p>
        <Select
          value={audioInputDeviceController.activeDeviceId}
          onValueChange={(value) => {
            audioInputDeviceController.setActiveMediaDevice(value);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Microphone" />
          </SelectTrigger>
          <SelectContent>
            {inputDevices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <p>Output Device</p>
        <Select
          value={audioOutputDeviceController.activeDeviceId}
          onValueChange={(value) => {
            audioOutputDeviceController.setActiveMediaDevice(value);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Microphone" />
          </SelectTrigger>
          <SelectContent>
            {outputDevices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
