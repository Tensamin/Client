"use client";

import { useLocalParticipant } from "@livekit/components-react";
import * as Icon from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { debugLog } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import LoadingIcon from "@/components/Loading/LoadingIcon";

interface CameraButtonProps {
  ghostMode?: boolean;
  className?: string;
}

export default function CameraButton({ ghostMode, className }: CameraButtonProps) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const [loading, setLoading] = useState(false);

  const toggleCamera = async () => {
    try {
      if (localParticipant) {
        setLoading(true);
        await localParticipant.setCameraEnabled(!isCameraEnabled);
        debugLog(
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
