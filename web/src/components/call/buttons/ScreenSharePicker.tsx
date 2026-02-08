"use client";

import * as Icon from "lucide-react";
import { useEffect, useState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
}

export interface AudioSource {
  id: string;
  name: string;
  type: string;
}

interface ScreenSharePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (videoId: string, audioId: string, includeAudio: boolean) => void;
  sources: DesktopSource[];
  audioSources: AudioSource[];
}

export default function ScreenSharePicker({
  open,
  onOpenChange,
  onSelect,
  sources,
  audioSources,
}: ScreenSharePickerProps) {
  const screens = sources.filter((s) => s.id.startsWith("screen:"));
  const apps = sources.filter((s) => s.id.startsWith("window:"));
  const [selectedVideoSource, setSelectedVideoSource] = useState<string | null>(null);
  const [selectedAudioSource, setSelectedAudioSource] = useState<string>("system");
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // Auto-select video source if only one available
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
      const audioId = includeAudio ? (selectedAudioSource || "system") : "none";
      onSelect(selectedVideoSource, audioId, includeAudio);
      setSelectedVideoSource(null);
      setSelectedAudioSource("system");
      setIncludeAudio(true);
    }
  };

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
