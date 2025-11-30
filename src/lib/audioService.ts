import {
  SpeexWorkletNode,
  loadSpeex,
  RnnoiseWorkletNode,
  loadRnnoise,
  NoiseGateWorkletNode,
} from "@sapphi-red/web-noise-suppressor";

export type NoiseSuppressionAlgorithm =
  | "speex"
  | "rnnoise"
  | "noisegate"
  | "speedx_rnnoise";

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
    const supportsVoiceIsolation = !!((getSupportedConstraints as any)?.voiceIsolation === true);

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
      case "speedx_rnnoise":
        return {
          ...baseConstraints,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(supportsVoiceIsolation ? { voiceIsolation: true } : {}),
        };
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
    // Ensure the required worklets are loaded. For combined algorithms, load
    // the worklets for both RNNoise and Speex to support the chaining.
    if (options.algorithm === "speedx_rnnoise") {
      await this.loadWorklet("rnnoise");
      await this.loadWorklet("speex");
    } else {
      await this.loadWorklet(options.algorithm);
    }

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
      case "speedx_rnnoise": {
        // Return RNNoise node here when requested as a single processor; the
        // actual combined chain is handled by processStream which will create
        // both nodes and chain them. Returning an RNNoise node here is a
        // sensible fallback and allows callers that expect a single node to
        // receive the first suppression node in the chain.
        const wasmBinary = await this.loadWasmBinary("rnnoise");
        return new RnnoiseWorkletNode(ctx, {
          wasmBinary,
          maxChannels: options.maxChannels || 2,
        });
      }
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

    // CRITICAL FIX: Ensure context is running.
    // Without this, the worklets will be silent if autoplay policy blocked the context.
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    try {
      this.sourceNode = ctx.createMediaStreamSource(inputStream);
      this.destinationNode = ctx.createMediaStreamDestination();

      // Special handling for combined algorithms that require multiple
      // processors chained. If we requested speedx_rnnoise, build the
      // RNNoise -> Speex (SpeedX) chain. The createNoiseProcessor can be used
      // to construct each processor individually.
      if (options.algorithm === "speedx_rnnoise") {
        const rnnoiseOptions = { algorithm: "rnnoise" as NoiseSuppressionAlgorithm, maxChannels: options.maxChannels };
        const speexOptions = { algorithm: "speex" as NoiseSuppressionAlgorithm, maxChannels: options.maxChannels };
        const rnNode = await this.createNoiseProcessor(rnnoiseOptions);
        const spNode = await this.createNoiseProcessor(speexOptions);
        this.currentProcessor = rnNode;
        this.currentSecondProcessor = spNode;
        // chain: source -> rnNode -> spNode -> (optional gate) -> destination
        this.sourceNode.connect(this.currentProcessor);
        this.currentProcessor.connect(this.currentSecondProcessor);
        console.debug("AudioService: Created RNNoise -> SpeedX (Speex) processing chain.");
        if (gateOptions) {
          this.currentGateProcessor = await this.createAudioGate(gateOptions);
          this.currentSecondProcessor.connect(this.currentGateProcessor);
          this.currentGateProcessor.connect(this.destinationNode);
        } else {
          this.currentSecondProcessor.connect(this.destinationNode);
        }
      } else {
        this.currentProcessor = await this.createNoiseProcessor(options);
      }

      if (options.algorithm !== "speedx_rnnoise") {
        if (gateOptions) {
          this.currentGateProcessor = await this.createAudioGate(gateOptions);
          this.sourceNode.connect(this.currentProcessor);
          this.currentProcessor.connect(this.currentGateProcessor);
          this.currentGateProcessor.connect(this.destinationNode);
        } else {
          this.sourceNode.connect(this.currentProcessor);
          this.currentProcessor.connect(this.destinationNode);
        }
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
}

export const audioService = AudioService.getInstance();
