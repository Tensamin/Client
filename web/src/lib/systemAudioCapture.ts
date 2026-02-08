/**
 * System Audio Capture Module
 *
 * Cross-platform system/application audio capture for screen sharing.
 * Supports Windows, macOS, and Linux with different APIs and constraints.
 *
 * Platform-specific notes:
 * - macOS: Uses desktopCapturer API with loopback audio. Requires screen recording permission.
 * - Windows: Uses desktopCapturer with WASAPI. System audio capture is available through "Entire System".
 * - Linux: Uses PipeWire/PulseAudio loopback. May require additional user setup.
 *
 * IMPORTANT: This module is designed for system audio only, NOT microphone capture.
 * If audio capture fails, we continue with video-only streaming (no fallback to mic).
 */

import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export type Platform = "darwin" | "win32" | "linux" | "web";

export interface AudioSource {
  /** Unique identifier for the audio source */
  id: string;
  /** Display name for the audio source */
  name: string;
  /** Type of audio source */
  type: "none" | "system" | "application" | "monitor" | "pipewire" | "loopback";
  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface SystemAudioCaptureResult {
  /** The captured audio stream, or null if capture failed */
  stream: MediaStream | null;
  /** The audio track from the stream */
  track: MediaStreamTrack | null;
  /** Error message if capture failed */
  error: string | null;
  /** Whether the capture was successful */
  success: boolean;
}

export interface CaptureOptions {
  /** The audio source ID to capture */
  sourceId: string;
  /** The video source ID (for system audio that requires video context) */
  videoSourceId?: string;
  /** Sample rate for audio capture */
  sampleRate?: number;
  /** Number of audio channels */
  channelCount?: number;
  /** Echo cancellation (typically disabled for system audio) */
  echoCancellation?: boolean;
  /** Noise suppression (typically disabled for system audio) */
  noiseSuppression?: boolean;
  /** Auto gain control (typically disabled for system audio) */
  autoGainControl?: boolean;
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect the current platform.
 * In Electron, we check for window.electronAPI.
 * Otherwise, we detect based on navigator.platform.
 */
export function detectPlatform(): Platform {
  if (typeof window === "undefined") {
    return "web";
  }

  // Check if running in Electron with electronAPI
  const electronAPI = (window as ElectronWindow).electronAPI;
  if (electronAPI) {
    // Try to detect platform from user agent
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac os") || ua.includes("macintosh")) {
      return "darwin";
    }
    if (ua.includes("windows")) {
      return "win32";
    }
    if (ua.includes("linux")) {
      return "linux";
    }
  }

  // Web browser - use getDisplayMedia API
  return "web";
}

/**
 * Check if system audio capture is available on the current platform.
 */
export function isSystemAudioCaptureAvailable(): boolean {
  const platform = detectPlatform();

  if (platform === "web") {
    // Web browsers support getDisplayMedia with audio on some platforms
    return typeof navigator.mediaDevices?.getDisplayMedia === "function";
  }

  // Electron supports desktopCapturer with audio on all platforms
  const electronAPI = (window as ElectronWindow).electronAPI;
  return !!electronAPI?.getAudioSources;
}

// ============================================================================
// Types for Electron API
// ============================================================================

interface ElectronAudioSource {
  id: string;
  name: string;
  type: string;
}

interface ElectronWindow extends Window {
  electronAPI?: {
    getAudioSources: () => Promise<ElectronAudioSource[]>;
    getScreenSources: () => Promise<Array<{ id: string; name: string }>>;
    getScreenAccess: () => Promise<boolean>;
  };
}

// ============================================================================
// Audio Source Enumeration
// ============================================================================

/**
 * Get available system audio sources.
 * This lists all applications and system audio that can be captured.
 */
export async function getAudioSources(): Promise<AudioSource[]> {
  const platform = detectPlatform();
  const sources: AudioSource[] = [
    { id: "none", name: "No Audio", type: "none" },
  ];

  try {
    if (platform === "web") {
      // Web browsers don't provide granular audio source selection
      // System audio is captured along with the screen share
      sources.push({
        id: "system",
        name: "System Audio (with screen)",
        type: "system",
      });
      return sources;
    }

    // Electron: Get audio sources from main process
    const electronAPI = (window as ElectronWindow).electronAPI;
    if (!electronAPI?.getAudioSources) {
      console.warn("[SystemAudioCapture] Electron API not available");
      return sources;
    }

    const electronSources = await electronAPI.getAudioSources();

    for (const source of electronSources) {
      if (source.id === "none") continue; // Already added

      sources.push({
        id: source.id,
        name: source.name,
        type: mapElectronAudioType(source.type),
      });
    }

    // On Linux, also check for PipeWire/PulseAudio monitor devices
    if (platform === "linux") {
      const monitorDevices = await getLinuxMonitorDevices();
      sources.push(...monitorDevices);
    }
  } catch (error) {
    console.error(
      "[SystemAudioCapture] Failed to enumerate audio sources:",
      error,
    );
    // Return at least the basic sources
  }

  return sources;
}

/**
 * Map Electron audio source type to our internal type.
 */
function mapElectronAudioType(type: string): AudioSource["type"] {
  switch (type) {
    case "system":
      return "system";
    case "pipewire":
      return "pipewire";
    case "monitor":
      return "monitor";
    case "application":
      return "application";
    case "loopback":
      return "loopback";
    default:
      return "system";
  }
}

/**
 * Get Linux PipeWire/PulseAudio monitor devices.
 * These allow capturing audio output as input.
 */
async function getLinuxMonitorDevices(): Promise<AudioSource[]> {
  const sources: AudioSource[] = [];

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    for (const device of audioInputs) {
      const label = device.label.toLowerCase();

      // Look for monitor/loopback devices
      if (
        label.includes("monitor") ||
        label.includes("loopback") ||
        label.includes("pipewire")
      ) {
        // Avoid duplicates
        const existingIds = sources.map((s) => s.id);
        if (!existingIds.includes(device.deviceId)) {
          sources.push({
            id: device.deviceId,
            name: device.label || "Monitor Device",
            type: "monitor",
          });
        }
      }
    }
  } catch (error) {
    console.warn(
      "[SystemAudioCapture] Failed to enumerate Linux monitor devices:",
      error,
    );
  }

  return sources;
}

// ============================================================================
// Audio Capture Implementation
// ============================================================================

/**
 * Capture system audio from the specified source.
 *
 * IMPORTANT: This function does NOT fall back to microphone.
 * If capture fails, it returns an error and lets the caller decide how to proceed.
 */
export async function captureSystemAudio(
  options: CaptureOptions,
): Promise<SystemAudioCaptureResult> {
  const { sourceId, videoSourceId } = options;

  // Handle "none" selection
  if (sourceId === "none") {
    return {
      stream: null,
      track: null,
      error: null,
      success: true, // Successfully chose no audio
    };
  }

  const platform = detectPlatform();

  try {
    let result: SystemAudioCaptureResult;

    switch (platform) {
      case "darwin":
        result = await captureMacOSAudio(sourceId, videoSourceId);
        break;
      case "win32":
        result = await captureWindowsAudio(sourceId, videoSourceId);
        break;
      case "linux":
        result = await captureLinuxAudio(sourceId, videoSourceId);
        break;
      case "web":
        result = await captureWebAudio(sourceId);
        break;
      default:
        result = {
          stream: null,
          track: null,
          error: `Unsupported platform: ${platform}`,
          success: false,
        };
    }

    if (!result.success) {
      console.error("[SystemAudioCapture] Capture failed:", result.error);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SystemAudioCapture] Unexpected error:", error);
    return {
      stream: null,
      track: null,
      error: errorMessage,
      success: false,
    };
  }
}

/**
 * Capture audio on macOS using desktopCapturer.
 *
 * macOS requires specific Chromium flags for loopback audio capture:
 * - audioLoopbackDevice must be enabled in Electron main process
 * - User must grant screen recording permission
 */
async function captureMacOSAudio(
  sourceId: string,
  videoSourceId?: string,
): Promise<SystemAudioCaptureResult> {
  try {
    // System audio capture on macOS requires the video source ID
    // because audio is captured along with the screen/window
    const captureSourceId = videoSourceId || sourceId;

    if (sourceId === "system" && videoSourceId) {
      // Capture system audio using desktop capturer constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: videoSourceId,
          },
        },
        video: false,
      } as MediaStreamConstraints);

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        return {
          stream: null,
          track: null,
          error:
            "No audio track captured. macOS may require screen recording permission.",
          success: false,
        };
      }

      return {
        stream,
        track: audioTrack,
        error: null,
        success: true,
      };
    }

    // For other source types, try device-based capture
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: captureSourceId,
        },
      },
      video: false,
    } as MediaStreamConstraints);

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      return {
        stream: null,
        track: null,
        error: "No audio track available for the selected source on macOS.",
        success: false,
      };
    }

    return {
      stream,
      track: audioTrack,
      error: null,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check for specific macOS permission errors
    if (
      message.includes("Permission denied") ||
      message.includes("NotAllowedError")
    ) {
      return {
        stream: null,
        track: null,
        error:
          "Screen recording permission required. Enable it in System Preferences > Security & Privacy.",
        success: false,
      };
    }

    return {
      stream: null,
      track: null,
      error: `macOS audio capture failed: ${message}`,
      success: false,
    };
  }
}

/**
 * Capture audio on Windows using desktopCapturer.
 *
 * Windows supports:
 * - System audio capture via WASAPI loopback
 * - Per-application audio capture (when supported)
 */
async function captureWindowsAudio(
  sourceId: string,
  videoSourceId?: string,
): Promise<SystemAudioCaptureResult> {
  try {
    if (sourceId === "system" && videoSourceId) {
      // Capture entire system audio using the video source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: videoSourceId,
          },
        },
        video: false,
      } as MediaStreamConstraints);

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        return {
          stream: null,
          track: null,
          error: "No audio track captured. System audio may not be available.",
          success: false,
        };
      }

      return {
        stream,
        track: audioTrack,
        error: null,
        success: true,
      };
    }

    // For specific audio source
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
        },
      },
      video: false,
    } as MediaStreamConstraints);

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      return {
        stream: null,
        track: null,
        error: "No audio track available for the selected source.",
        success: false,
      };
    }

    return {
      stream,
      track: audioTrack,
      error: null,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check for specific Windows errors
    if (message.includes("Could not start audio source")) {
      return {
        stream: null,
        track: null,
        error:
          "Audio device is busy or unavailable. Try closing other applications using audio.",
        success: false,
      };
    }

    return {
      stream: null,
      track: null,
      error: `Windows audio capture failed: ${message}`,
      success: false,
    };
  }
}

/**
 * Capture audio on Linux using PipeWire/PulseAudio.
 *
 * Linux setup notes:
 * - PipeWire is recommended for best compatibility
 * - Users may need to enable the PipeWire ALSA plugin
 * - The "Monitor of" devices capture audio output
 */
async function captureLinuxAudio(
  sourceId: string,
  videoSourceId?: string,
): Promise<SystemAudioCaptureResult> {
  try {
    // Handle PipeWire-specific sources
    if (sourceId.startsWith("pipewire:")) {
      // PipeWire sources use device ID constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: sourceId },
        },
        video: false,
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        return {
          stream: null,
          track: null,
          error: "PipeWire audio capture failed. Ensure PipeWire is running.",
          success: false,
        };
      }

      return {
        stream,
        track: audioTrack,
        error: null,
        success: true,
      };
    }

    // Handle system audio with video source
    if (sourceId === "system" && videoSourceId) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: videoSourceId,
          },
        },
        video: false,
      } as MediaStreamConstraints);

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        return {
          stream: null,
          track: null,
          error:
            "System audio not available. You may need to configure PipeWire/PulseAudio.",
          success: false,
        };
      }

      return {
        stream,
        track: audioTrack,
        error: null,
        success: true,
      };
    }

    // Try monitor device (PulseAudio/PipeWire loopback)
    // These device IDs are typically the raw device IDs from enumerateDevices
    if (sourceId.length > 20) {
      // Likely a device ID from enumerateDevices
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: sourceId },
        },
        video: false,
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        return {
          stream: null,
          track: null,
          error: "Failed to capture from monitor device.",
          success: false,
        };
      }

      return {
        stream,
        track: audioTrack,
        error: null,
        success: true,
      };
    }

    // Fallback: Try desktop capturer
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
        },
      },
      video: false,
    } as MediaStreamConstraints);

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      return {
        stream: null,
        track: null,
        error:
          "No audio track available. Check your PipeWire/PulseAudio configuration.",
        success: false,
      };
    }

    return {
      stream,
      track: audioTrack,
      error: null,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Provide helpful Linux-specific error messages
    if (
      message.includes("NotFoundError") ||
      message.includes("Requested device not found")
    ) {
      return {
        stream: null,
        track: null,
        error:
          "Audio device not found. If using PipeWire, ensure the application is outputting audio first.",
        success: false,
      };
    }

    if (message.includes("NotAllowedError")) {
      return {
        stream: null,
        track: null,
        error:
          "Audio permission denied. Check your browser/system permissions.",
        success: false,
      };
    }

    return {
      stream: null,
      track: null,
      error: `Linux audio capture failed: ${message}. Try using a PipeWire/PulseAudio monitor device.`,
      success: false,
    };
  }
}

/**
 * Capture audio in web browsers using getDisplayMedia.
 *
 * Web browsers handle system audio differently:
 * - Chrome/Edge on Windows supports system audio with getDisplayMedia
 * - Firefox and Safari have limited or no system audio support
 * - Audio capture is tied to the display/window being shared
 */
async function captureWebAudio(
  sourceId: string,
): Promise<SystemAudioCaptureResult> {
  try {
    // Web browsers use getDisplayMedia for screen share with audio
    // The audio is captured as part of the display media request
    // This function is typically called after getDisplayMedia is already done,
    // so we just need to extract the audio track

    // For web, we rely on the systemAudio: "include" option in getDisplayMedia
    // which should be handled at the screen share initiation level
    return {
      stream: null,
      track: null,
      error:
        "Web audio capture should be handled through getDisplayMedia options.",
      success: false,
    };
  } catch (error) {
    return {
      stream: null,
      track: null,
      error: `Web audio capture not available: ${error instanceof Error ? error.message : String(error)}`,
      success: false,
    };
  }
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Show a toast error for audio capture failure without interrupting screen share.
 */
export function handleAudioCaptureError(error: string): void {
  console.error("[SystemAudioCapture] Error:", error);
  toast.error(`Audio capture failed: ${error}`, {
    description: "Screen sharing will continue without audio.",
    duration: 5000,
  });
}

/**
 * Check if the error indicates a permission issue.
 */
export function isPermissionError(error: string): boolean {
  const permissionKeywords = [
    "permission",
    "denied",
    "NotAllowedError",
    "security",
    "access",
  ];
  const lowerError = error.toLowerCase();
  return permissionKeywords.some((keyword) =>
    lowerError.includes(keyword.toLowerCase()),
  );
}

/**
 * Get platform-specific setup instructions for audio capture.
 */
export function getPlatformSetupInstructions(): string {
  const platform = detectPlatform();

  switch (platform) {
    case "darwin":
      return "macOS: Go to System Preferences > Security & Privacy > Privacy > Screen Recording and enable permission for this app.";
    case "win32":
      return "Windows: System audio should work automatically. If not, check that your audio device is set as the default output.";
    case "linux":
      return "Linux: For system audio, you may need to use PipeWire or PulseAudio. Run 'pactl load-module module-loopback' or configure a monitor device.";
    case "web":
      return "Web: System audio support varies by browser. Chrome on Windows has the best support. Select 'Share system audio' when starting screen share.";
    default:
      return "System audio capture may not be available on your platform.";
  }
}
