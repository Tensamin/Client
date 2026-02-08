/**
 * Audio feature barrel export
 */

// Pipeline
export { audioPipeline, audioService, AudioPipelineService, type ProcessingConfig } from "./pipeline";

// Sound player
export { playSound, preloadSound, type SoundName } from "./soundPlayer";

// System audio capture (re-export from lib for now, will move later)
export {
  captureSystemAudio,
  detectPlatform,
  getAudioSources,
  handleAudioCaptureError,
  isSystemAudioCaptureAvailable,
  getPlatformSetupInstructions,
  isPermissionError,
  type AudioSource,
  type CaptureOptions,
  type Platform,
  type SystemAudioCaptureResult,
} from "@/lib/systemAudioCapture";
