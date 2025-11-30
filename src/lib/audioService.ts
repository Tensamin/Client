import {
  SpeexWorkletNode,
  loadSpeex,
  RnnoiseWorkletNode,
  loadRnnoise,
  NoiseGateWorkletNode,
} from "@sapphi-red/web-noise-suppressor";
import type { TrackProcessor, Track } from "livekit-client";
import type { AudioProcessorOptions } from "livekit-client";

export type NoiseSuppressionAlgorithm = "speex" | "rnnoise" | "noisegate";

interface NoiseSuppressionOptions {
  algorithm: NoiseSuppressionAlgorithm;
  maxChannels?: number;
  sensitivity?: number; // For noisegate
}

interface AudioGateOptions {
  threshold: number; // Threshold in dB (e.g., -50)
  maxChannels?: number;
}

/**
 * Audio constraints for acquiring media streams.
 */
export interface AudioConstraintsOptions {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate?: number;
  channelCount?: number;
}

class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private wasmBinaries: Map<string, ArrayBuffer> = new Map();
  private workletLoaded: Map<string, boolean> = new Map();

  // Current noise suppression setup
  private currentProcessor: AudioWorkletNode | null = null;
  private currentGateProcessor: AudioWorkletNode | null = null;
  private currentSecondProcessor: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private isProcessing: boolean = false;

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Returns whether the UA supports the `voiceIsolation` constraint.
   */
  public isVoiceIsolationSupported(): boolean {
    try {
      const supported =
        typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getSupportedConstraints === "function"
          ? navigator.mediaDevices.getSupportedConstraints()
          : ({} as MediaTrackSupportedConstraints);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!((supported as any)?.voiceIsolation === true);
    } catch {
      return false;
    }
  }

  private constructor() {}

  public getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      // Do not hardcode sampleRate here, let the browser decide to match the hardware
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  public getRecommendedConstraints(
    algorithm: NoiseSuppressionAlgorithm | "off",
    channelCount: number = 2
  ): MediaTrackConstraints {
    // REMOVED: sampleRate: 48000. Forcing this often causes glitches or failure
    // if the OS/Browser cannot resample efficiently.
    const baseConstraints = {
      channelCount,
    };

    // detect support for the experimental voiceIsolation constraint
    const getSupportedConstraints =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getSupportedConstraints === "function"
        ? navigator.mediaDevices.getSupportedConstraints()
        : ({} as MediaTrackSupportedConstraints);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supportsVoiceIsolation = !!(
      (getSupportedConstraints as any)?.voiceIsolation === true
    );

    switch (algorithm) {
      case "off":
        return {
          ...baseConstraints,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        };
      case "speex":
      case "rnnoise":
      case "noisegate":
      // 'speedx_rnnoise' option removed — both rnnoise and speex continue
      // to use the same recommended constraints when selected separately.
      default:
        return {
          ...baseConstraints,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(supportsVoiceIsolation ? { voiceIsolation: true } : {}),
        };
    }
  }

  private async loadWasmBinary(
    algorithm: "speex" | "rnnoise"
  ): Promise<ArrayBuffer> {
    const cached = this.wasmBinaries.get(algorithm);
    if (cached) return cached;

    const wasmPath = `/audio/wasm/${algorithm}.wasm`;
    const simdPath = `/audio/wasm/${algorithm}_simd.wasm`;

    try {
      let wasmBinary: ArrayBuffer;
      if (algorithm === "speex") {
        wasmBinary = await loadSpeex({ url: wasmPath });
      } else {
        wasmBinary = await loadRnnoise({ url: wasmPath, simdUrl: simdPath });
      }
      this.wasmBinaries.set(algorithm, wasmBinary);
      return wasmBinary;
    } catch (error) {
      console.error("AudioService: Failed to load WASM for", algorithm, error);
      throw new Error(`Failed to load ${algorithm} WASM: ${error}`);
    }
  }

  private async loadWorklet(
    algorithm: NoiseSuppressionAlgorithm
  ): Promise<void> {
    if (this.workletLoaded.get(algorithm)) return;

    const ctx = this.getAudioContext();
    const workletPath = `/audio/worklets/${algorithm}Worklet.js`;

    try {
      await ctx.audioWorklet.addModule(workletPath);
      this.workletLoaded.set(algorithm, true);
    } catch (error) {
      console.error("AudioService: Failed to load worklet", algorithm, error);
      throw new Error(`Failed to load ${algorithm} worklet: ${error}`);
    }
  }

  public async createNoiseProcessor(
    options: NoiseSuppressionOptions
  ): Promise<AudioWorkletNode> {
    const ctx = this.getAudioContext();
    await this.loadWorklet(options.algorithm);

    switch (options.algorithm) {
      case "speex": {
        const wasmBinary = await this.loadWasmBinary("speex");
        return new SpeexWorkletNode(ctx, {
          wasmBinary,
          maxChannels: options.maxChannels || 2,
        });
      }
      case "rnnoise": {
        const wasmBinary = await this.loadWasmBinary("rnnoise");
        return new RnnoiseWorkletNode(ctx, {
          wasmBinary,
          maxChannels: options.maxChannels || 2,
        });
      }
      // Combined RNNoise + SpeedX removed — createNoiseProcessor only
      // creates single processor instances for speex, rnnoise, and noisegate.
      case "noisegate": {
        return new NoiseGateWorkletNode(ctx, {
          openThreshold: options.sensitivity || -50,
          holdMs: 100,
          maxChannels: options.maxChannels || 2,
        });
      }
      default:
        throw new Error(`Unsupported algorithm: ${options.algorithm}`);
    }
  }

  public async createAudioGate(
    options: AudioGateOptions
  ): Promise<AudioWorkletNode> {
    const ctx = this.getAudioContext();
    await this.loadWorklet("noisegate");
    return new NoiseGateWorkletNode(ctx, {
      openThreshold: options.threshold,
      closeThreshold: options.threshold - 6,
      holdMs: 100,
      maxChannels: options.maxChannels || 2,
    });
  }

  public async processStreamWithGate(
    inputStream: MediaStream,
    gateOptions: AudioGateOptions
  ): Promise<MediaStream> {
    this.cleanup();
    const ctx = this.getAudioContext();

    // CRITICAL FIX: Ensure context is running
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    try {
      this.sourceNode = ctx.createMediaStreamSource(inputStream);
      this.destinationNode = ctx.createMediaStreamDestination();
      this.currentGateProcessor = await this.createAudioGate(gateOptions);

      this.sourceNode.connect(this.currentGateProcessor);
      this.currentGateProcessor.connect(this.destinationNode);

      this.isProcessing = true;
      return this.destinationNode.stream;
    } catch (error) {
      console.error("AudioService: Gate error", error);
      this.cleanup();
      throw error;
    }
  }

  public async processStream(
    inputStream: MediaStream,
    options: NoiseSuppressionOptions,
    gateOptions?: AudioGateOptions
  ): Promise<MediaStream> {
    this.cleanup();
    const ctx = this.getAudioContext();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    try {
      this.sourceNode = ctx.createMediaStreamSource(inputStream);
      this.destinationNode = ctx.createMediaStreamDestination();

      // Create a single noise suppression processor instance (Speex / RNNoise
      // / NoiseGate). The combined 'speedx_rnnoise' chain has been removed
      // in favor of running algorithms individually.
      this.currentProcessor = await this.createNoiseProcessor(options);

      if (gateOptions) {
        this.currentGateProcessor = await this.createAudioGate(gateOptions);
        this.sourceNode.connect(this.currentProcessor);
        this.currentProcessor.connect(this.currentGateProcessor);
        this.currentGateProcessor.connect(this.destinationNode);
      } else {
        this.sourceNode.connect(this.currentProcessor);
        this.currentProcessor.connect(this.destinationNode);
      }

      this.isProcessing = true;
      return this.destinationNode.stream;
    } catch (error) {
      console.error("AudioService: Process error", error);
      this.cleanup();
      throw error;
    }
  }

  public cleanup(): void {
    try {
      this.sourceNode?.disconnect();
      this.currentProcessor?.disconnect();
      this.currentGateProcessor?.disconnect();
      this.currentSecondProcessor?.disconnect();
      this.destinationNode?.disconnect();
    } catch {}

    this.sourceNode = null;
    this.currentProcessor = null;
    this.currentGateProcessor = null;
    this.currentSecondProcessor = null;
    this.destinationNode = null;
    this.isProcessing = false;
  }

  public isSupported(): boolean {
    return (
      // eslint-disable-next-line
      !!(window.AudioContext || (window as any).webkitAudioContext) &&
      !!window.AudioWorklet
    );
  }

  public getProcessor(): TrackProcessor<
    Track.Kind.Audio,
    AudioProcessorOptions
  > {
    const self = this;
    let originalTrack: MediaStreamTrack | undefined = undefined;
    let processedStream: MediaStream | undefined = undefined;

    const setProcessedTrackFromStream = (stream?: MediaStream) => {
      (processor as any).processedTrack = stream?.getAudioTracks()?.[0];
      processedStream = stream;
    };

    const processor: TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> = {
      name: "tensamin-audio-processor",
      processedTrack: undefined,

      async init(opts) {
        if (!opts || !opts.track)
          throw new TypeError("Processor init requires options.track");
        originalTrack = opts.track;
        const inputStream = new MediaStream([originalTrack]);

        const ctx = self.getAudioContext();
        if (ctx.state === "suspended") await ctx.resume();

        try {
          const algorithm: any = self.isSupported() ? "rnnoise" : "noisegate";
          const channelCount = Math.max(opts.kind === "audio" ? 1 : 1, 1);
          const processed = await self.processStream(inputStream, {
            algorithm,
            maxChannels: channelCount,
          });
          setProcessedTrackFromStream(processed);
        } catch (err) {
          console.error("audioService.getProcessor.init failed", err);
          setProcessedTrackFromStream(undefined);
          throw err;
        }
      },

      async restart(opts) {
        if (!opts || !opts.track)
          throw new TypeError("Processor restart requires options.track");
        try {
          processedStream?.getTracks().forEach((t) => t.stop());
        } catch {}

        originalTrack = opts.track as MediaStreamTrack;
        const inputStream = new MediaStream([originalTrack]);

        try {
          const algorithm: any = self.isSupported() ? "rnnoise" : "noisegate";
          const channelCount = 1;
          const processed = await self.processStream(inputStream, {
            algorithm,
            maxChannels: channelCount,
          });
          setProcessedTrackFromStream(processed);
        } catch (err) {
          console.error("audioService.getProcessor.restart failed", err);
          setProcessedTrackFromStream(undefined);
          throw err;
        }
      },

      // Cleanup
      async destroy() {
        try {
          processedStream?.getTracks().forEach((t) => t.stop());
        } catch {}
        setProcessedTrackFromStream(undefined);
        self.cleanup();
      },

      onPublish(_pub?: unknown) {},
    } as TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>;

    return processor;
  }
}

export const audioService = AudioService.getInstance();
