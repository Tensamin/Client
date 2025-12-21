import {
    attachSpeakingDetectionToTrack,
    type AudioPipelineHandle,
    type LivekitSpeakingOptions,
    type SpeakingController,
} from "@tensamin/audio";
import {
    closeAudioContext,
    getAudioContext,
    resumeAudioContext,
} from "@tensamin/audio/dist/context/audio-context.mjs";
import { createAudioPipeline } from "@tensamin/audio/dist/pipeline/audio-pipeline.mjs";
import type { LocalAudioTrack } from "livekit-client";

export type ProcessingConfig = {
  noiseSuppressionEnabled?: boolean;
  noiseSensitivity?: number; // 0..1 slider from UI (deprecated, use noiseReductionLevel)
  noiseReductionLevel?: number; // 0..100 explicit override
  inputGain?: number; // linear multiplier
  enableNoiseGate?: boolean;
  speakingMinDb?: number; // Speaking detection min dB
  speakingMaxDb?: number; // Speaking detection max dB
  assetCdnUrl?: string;
  muteWhenSilent?: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function mapNoiseReductionLevel(
  sensitivity?: number,
  override?: number,
): number {
  if (typeof override === "number" && Number.isFinite(override)) {
    return clamp(Math.round(override), 0, 100);
  }
  const sens = typeof sensitivity === "number" ? clamp(sensitivity, 0, 1) : 0.5;
  // Map 0..1 slider into a reasonable DeepFilterNet suppression range (30..100).
  return clamp(Math.round(30 + sens * 70), 10, 100);
}

function mapSpeakingConfig(
  minDb?: number,
  maxDb?: number,
  sensitivity?: number,
) {
  // Use explicit dB values if provided, otherwise compute from sensitivity
  let finalMinDb: number;
  let finalMaxDb: number;

  if (
    typeof minDb === "number" &&
    typeof maxDb === "number" &&
    minDb < maxDb
  ) {
    finalMinDb = minDb;
    finalMaxDb = maxDb;
  } else {
    // Fallback to sensitivity-based calculation
    const sens =
      typeof sensitivity === "number" ? clamp(sensitivity, 0, 1) : 0.5;
    const threshold = -20 - sens * 70;
    finalMinDb = Math.min(-25, threshold);
    finalMaxDb = -20;
  }

  // Compute ratios based on range for consistent behavior
  const range = finalMaxDb - finalMinDb;
  const speakOnRatio = clamp(0.5 + range / 100, 0.4, 0.9);
  const speakOffRatio = clamp(speakOnRatio - 0.2, 0.1, 0.6);

  return {
    minDb: finalMinDb,
    maxDb: finalMaxDb,
    speakOnRatio,
    speakOffRatio,
    hangoverMs: 350,
    attackMs: 50,
    releaseMs: 120,
  } satisfies LivekitSpeakingOptions["speaking"];
}

function toLivekitOptions(config?: ProcessingConfig): LivekitSpeakingOptions {
  const sensitivity = config?.noiseSensitivity;
  const inputGain = config?.inputGain ?? 1;
  const noiseSuppressionEnabled = config?.noiseSuppressionEnabled ?? true;
  const assetCdnUrl = config?.assetCdnUrl ?? "/audio";

  return {
    noiseSuppression: {
      enabled: noiseSuppressionEnabled,
      noiseReductionLevel: mapNoiseReductionLevel(
        sensitivity,
        config?.noiseReductionLevel,
      ),
      assetConfig: {
        cdnUrl: assetCdnUrl,
      },
    },
    speaking: mapSpeakingConfig(
      config?.speakingMinDb,
      config?.speakingMaxDb,
      sensitivity,
    ),
    output: {
      speechGain: clamp(inputGain, 0, 3),
      silenceGain: config?.enableNoiseGate === false ? 0.15 : 0,
      gainRampTime: 0.02,
      maxGainDb: 6,
      smoothTransitions: true,
    },
    muteWhenSilent: config?.muteWhenSilent ?? false,
  } satisfies LivekitSpeakingOptions;
}

class AudioService {
  private pipelines = new Set<AudioPipelineHandle>();
  private controllers = new Set<SpeakingController>();

  getAudioContext(): AudioContext {
    return getAudioContext();
  }

  async resumeContext() {
    try {
      // Ensure context exists before attempting resume to avoid a no-op.
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") {
        await resumeAudioContext();
      }
    } catch (error) {
      console.error("Failed to resume audio context", error);
    }
  }

  async attachToLocalTrack(
    track: LocalAudioTrack,
    config?: ProcessingConfig,
  ): Promise<SpeakingController> {
    await this.resumeContext();
    const controller = await attachSpeakingDetectionToTrack(
      track,
      toLivekitOptions(config),
    );
    this.controllers.add(controller);
    return controller;
  }

  async processStream(
    stream: MediaStream,
    config?: ProcessingConfig,
  ): Promise<{ stream: MediaStream; handle: AudioPipelineHandle }> {
    await this.resumeContext();
    const track = stream.getAudioTracks()[0];
    if (!track) {
      throw new Error("processStream requires an audio track in the stream");
    }

    const pipeline = await createAudioPipeline(track, toLivekitOptions(config));
    this.pipelines.add(pipeline);

    const processedStream = new MediaStream([pipeline.processedTrack]);
    return { stream: processedStream, handle: pipeline };
  }

  releasePipeline(handle: AudioPipelineHandle | null | undefined) {
    if (!handle) return;
    try {
      handle.dispose();
    } finally {
      this.pipelines.delete(handle);
    }
  }

  releaseController(controller: SpeakingController | null | undefined) {
    if (!controller) return;
    try {
      controller.dispose();
    } finally {
      this.controllers.delete(controller);
    }
  }

  async cleanup() {
    if (!this.controllers.size && !this.pipelines.size) {
      return;
    }

    this.controllers.forEach((controller) => {
      try {
        controller.dispose();
      } catch (error) {
        console.error("Failed to dispose controller", error);
      }
    });
    this.controllers.clear();

    this.pipelines.forEach((pipeline) => {
      try {
        pipeline.dispose();
      } catch (error) {
        console.error("Failed to dispose pipeline", error);
      }
    });
    this.pipelines.clear();

    try {
      await closeAudioContext();
    } catch (error) {
      console.error("Failed to close audio context", error);
    }
  }
}

export const audioService = new AudioService();
