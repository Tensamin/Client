// Package Imports
import { useMediaDeviceSelect } from "@livekit/components-react";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsPageTitle } from "@/page/settings";

// Main
export default function Page() {
  const { data, set } = useStorageContext();

  const inputDevices = useMediaDeviceSelect({
    kind: "audioinput",
  });
  const outputDevices = useMediaDeviceSelect({
    kind: "audiooutput",
  });

  const options = [
    {
      label: "Enable Echo Cancellation",
      key: "call_enableEchoCancellation",
      default: true,
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
      <div className="flex gap-5">
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
