import {
  SpeexWorkletNode,
  loadSpeex,
  RnnoiseWorkletNode,
  loadRnnoise,
  NoiseGateWorkletNode,
} from "@sapphi-red/web-noise-suppressor";
import { TrackProcessor, Track } from "livekit-client";
import type { AudioProcessorOptions } from "livekit-client";
import { rawDebugLog } from "@/context/storage";

export type NoiseSuppressionAlgorithm = "speex" | "rnnoise" | "noisegate";

interface NoiseSuppressionOptions {
  enableNoiseGate: boolean;
  algorithm: NoiseSuppressionAlgorithm;
  maxChannels?: number;
  sensitivity?: number;
  inputGain?: number;
}

interface AudioGateOptions {
  threshold: number;
  maxChannels?: number;
}

class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private wasmBinaries: Map<string, ArrayBuffer> = new Map();
  private workletLoaded: Map<string, boolean> = new Map();

  // Simple log helpers (green messages)
  private logGreen(message: string): void {
    // eslint-disable-next-line no-console
    rawDebugLog("Audio Service", message, "", "green");
  }

  // Current noise suppression setup
  private currentProcessor: AudioWorkletNode | null = null;
  private currentGateProcessor: AudioWorkletNode | null = null;
  private currentSecondProcessor: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private isProcessing: boolean = false;

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private constructor() {}

  public getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
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
      this.logGreen(`Loaded WASM for ${algorithm}`);
      return wasmBinary;
    } catch (error) {
      rawDebugLog(
        "Audio Service",
        "Failed to load WASM",
        {
          algorithm,
          error,
        },
        "red"
      );
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
      this.logGreen(`Loaded worklet for ${algorithm}`);
    } catch (error) {
      rawDebugLog(
        "Audio Service",
        "Failed to load worklet",
        {
          algorithm,
          error,
        },
        "red"
      );
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
        const node = new SpeexWorkletNode(ctx, {
          wasmBinary,
          maxChannels: options.maxChannels || 2,
        });
        this.logGreen(
          `Noise suppression enabled (speex, maxChannels=${
            options.maxChannels || 2
          })`
        );
        return node;
      }
      case "rnnoise": {
        const wasmBinary = await this.loadWasmBinary("rnnoise");
        const node = new RnnoiseWorkletNode(ctx, {
          wasmBinary,
          maxChannels: options.maxChannels || 2,
        });
        this.logGreen(
          `Noise suppression enabled (rnnoise, maxChannels=${
            options.maxChannels || 2
          })`
        );
        return node;
      }
      case "noisegate": {
        const threshold = options.sensitivity || -50;
        const node = new NoiseGateWorkletNode(ctx, {
          openThreshold: threshold,
          closeThreshold: threshold - 10, // 10dB hysteresis
          holdMs: 200, // Longer hold time
          maxChannels: options.maxChannels || 2,
        });
        // Attach port listener if available so we can log gate-specific events
        try {
          if ((node as any).port) {
            (node as any).port.onmessage = (evt: MessageEvent) => {
              rawDebugLog(
                "Audio Service",
                "Noise gate event",
                evt.data,
                "green"
              );
            };
            this.logGreen(`Attached noise gate message handler`);
          }
        } catch (err) {
          rawDebugLog(
            "Audio Service",
            "Failed to attach noise gate message handler",
            err,
            "red"
          );
        }
        this.logGreen(
          `Noise gate enabled (threshold=${
            options.sensitivity ?? -50
          }, maxChannels=${options.maxChannels || 2})`
        );
        return node;
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
    const node = new NoiseGateWorkletNode(ctx, {
      openThreshold: options.threshold,
      closeThreshold: options.threshold - 10, // Increased hysteresis to 10dB
      holdMs: 200, // Increased hold time to 200ms
      maxChannels: options.maxChannels || 2,
    });
    this.logGreen(
      `Audio gate enabled (threshold=${options.threshold}, maxChannels=${
        options.maxChannels || 2
      })`
    );
    try {
      if ((node as any).port) {
        (node as any).port.onmessage = (evt: MessageEvent) => {
          rawDebugLog("Audio Service", "Audio gate event", evt.data, "green");
        };
        this.logGreen(`Attached audio gate message handler`);
      }
    } catch (err) {
      rawDebugLog(
        "Audio Service",
        "Failed to attach audio gate message handler",
        err,
        "red"
      );
    }
    return node;
  }

  public async processStreamWithGate(
    inputStream: MediaStream,
    gateOptions: AudioGateOptions
  ): Promise<MediaStream> {
    this.cleanup();
    const ctx = this.getAudioContext();

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
      this.logGreen(
        `Processing stream with gate: threshold=${gateOptions.threshold}`
      );
      return this.destinationNode.stream;
    } catch (error) {
      rawDebugLog("Audio Service", "Noise gate error", error, "red");
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
      this.currentProcessor = await this.createNoiseProcessor(options);

      // Create and configure gain node
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = options.inputGain ?? 1.0;
      this.logGreen(`Input gain set to ${this.gainNode.gain.value}`);

      const shouldEnableGate =
        gateOptions ||
        (options.enableNoiseGate && options.algorithm !== "noisegate");

      // Connect: Source -> Gain -> Processor -> [Gate] -> Destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.currentProcessor);

      if (shouldEnableGate) {
        const effectiveGateOptions = gateOptions || {
          threshold: options.sensitivity ?? -50,
          maxChannels: options.maxChannels,
        };
        this.currentGateProcessor = await this.createAudioGate(
          effectiveGateOptions
        );
        this.currentProcessor.connect(this.currentGateProcessor);
        this.currentGateProcessor.connect(this.destinationNode);
      } else {
        this.currentProcessor.connect(this.destinationNode);
      }

      this.isProcessing = true;
      if (options.algorithm === "noisegate") {
        this.logGreen(
          `Processing stream with noise gate: threshold=${
            options.sensitivity ?? "(default)"
          }`
        );
      } else {
        this.logGreen(
          `Processing stream with noise suppression: algorithm=${options.algorithm}`
        );
        if (shouldEnableGate) {
          this.logGreen(`Processing stream with additional noise gate`);
        }
      }
      return this.destinationNode.stream;
    } catch (error) {
      rawDebugLog("Audio Service", "Process error", error, "red");
      this.cleanup();
      throw error;
    }
  }

  public cleanup(): void {
    try {
      this.sourceNode?.disconnect();
      this.gainNode?.disconnect();
      this.currentProcessor?.disconnect();
      this.currentGateProcessor?.disconnect();
      this.currentSecondProcessor?.disconnect();
      this.destinationNode?.disconnect();
    } catch {}

    this.sourceNode = null;
    this.gainNode = null;
    this.currentProcessor = null;
    this.currentGateProcessor = null;
    this.currentSecondProcessor = null;
    this.destinationNode = null;
    if (this.currentGateProcessor) {
      this.logGreen("Audio gate disabled");
    }
    if (this.currentProcessor) {
      this.logGreen("Noise suppression disabled");
    }
    this.isProcessing = false;
  }

  public isSupported(): boolean {
    return (
      // eslint-disable-next-line
      !!(window.AudioContext || (window as any).webkitAudioContext) &&
      !!window.AudioWorklet
    );
  }

  public getProcessor(
    defaultNoiseOptions?: NoiseSuppressionOptions
  ): TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
    // eslint-disable-next-line
    const self = this;
    let originalTrack: MediaStreamTrack | undefined = undefined;
    let processedStream: MediaStream | undefined = undefined;

    const setProcessedTrackFromStream = (stream?: MediaStream) => {
      processor.processedTrack = stream?.getAudioTracks()?.[0];
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
          const algorithm =
            defaultNoiseOptions?.algorithm ??
            (self.isSupported() ? "rnnoise" : "noisegate");
          const channelCount = Math.max(
            opts.kind === "audio" ? 1 : 1,
            defaultNoiseOptions?.maxChannels ?? 1
          );

          const processed = await self.processStream(inputStream, {
            enableNoiseGate: defaultNoiseOptions?.enableNoiseGate ?? true,
            algorithm,
            maxChannels: channelCount,
            sensitivity: defaultNoiseOptions?.sensitivity,
            inputGain: defaultNoiseOptions?.inputGain,
          });
          setProcessedTrackFromStream(processed);
          if (processor.processedTrack) {
            if (algorithm === "noisegate") {
              self.logGreen(
                `Processor initialized: noise gate working (processed track set)`
              );
            } else {
              self.logGreen(
                `Processor initialized: noise suppression working (processed track set)`
              );
            }
          } else {
            self.logGreen(
              `Processor initialized: noise suppression not active (no processed track)`
            );
          }
        } catch (error) {
          rawDebugLog("Audio Service", "Failed to get processor", error, "red");
          setProcessedTrackFromStream(undefined);
          throw error;
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
          const algorithm =
            defaultNoiseOptions?.algorithm ??
            (self.isSupported() ? "rnnoise" : "noisegate");
          const processed = await self.processStream(inputStream, {
            enableNoiseGate: defaultNoiseOptions?.enableNoiseGate ?? true,
            algorithm,
            maxChannels: defaultNoiseOptions?.maxChannels ?? 1,
            sensitivity: defaultNoiseOptions?.sensitivity,
            inputGain: defaultNoiseOptions?.inputGain,
          });
          setProcessedTrackFromStream(processed);
          if (processor.processedTrack) {
            if (algorithm === "noisegate") {
              self.logGreen(
                `Processor restarted: noise gate working (processed track set)`
              );
            } else {
              self.logGreen(
                `Processor restarted: noise suppression working (processed track set)`
              );
            }
          } else {
            self.logGreen(
              `Processor restarted: noise suppression not active (no processed track)`
            );
          }
        } catch (err) {
          rawDebugLog(
            "Audio Service",
            "Failed to restart audio processor",
            err,
            "red"
          );
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
        const hadGate = !!self.currentGateProcessor;
        self.cleanup();
        if (hadGate) {
          self.logGreen(`Processor destroyed: audio gate disabled`);
        } else {
          self.logGreen(`Processor destroyed: noise suppression disabled`);
        }
      },
    } as TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>;

    return processor;
  }
}

export const audioService = AudioService.getInstance();
