import {
	SpeexWorkletNode,
	loadSpeex,
	RnnoiseWorkletNode,
	loadRnnoise,
	NoiseGateWorkletNode,
} from "@sapphi-red/web-noise-suppressor";

export type NoiseSuppressionAlgorithm = "speex" | "rnnoise" | "noisegate";

interface NoiseSuppressionOptions {
	algorithm: NoiseSuppressionAlgorithm;
	maxChannels?: number;
	sensitivity?: number; // For noisegate
}

class AudioService {
	private static instance: AudioService;
	private audioContext: AudioContext | null = null;
	private wasmBinaries: Map<string, ArrayBuffer> = new Map();
	private workletLoaded: Map<string, boolean> = new Map();

	// Current noise suppression setup
	private currentProcessor: AudioWorkletNode | null = null;
	private sourceNode: MediaStreamAudioSourceNode | null = null;
	private destinationNode: MediaStreamAudioDestinationNode | null = null;
	private isProcessing: boolean = false;

	public static getInstance(): AudioService {
		if (!AudioService.instance) {
			AudioService.instance = new AudioService();
		}
		return AudioService.instance;
	}

	private constructor() {
		// private constructor for singleton
	}

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
		algorithm: "speex" | "rnnoise",
	): Promise<ArrayBuffer> {
		const cached = this.wasmBinaries.get(algorithm);
		if (cached) {
			return cached;
		}

		const wasmPath = `/audio/wasm/${algorithm}.wasm`;
		const simdPath = `/audio/wasm/${algorithm}_simd.wasm`;

		try {
			let wasmBinary: ArrayBuffer;

			if (algorithm === "speex") {
				wasmBinary = await loadSpeex({ url: wasmPath });
			} else {
				wasmBinary = await loadRnnoise({
					url: wasmPath,
					simdUrl: simdPath,
				});
			}

			this.wasmBinaries.set(algorithm, wasmBinary);
			return wasmBinary;
		} catch (error) {
			console.error("AudioService: Failed to load WASM for", algorithm, error);
			throw new Error(`Failed to load ${algorithm} WASM: ${error}`);
		}
	}

	private async loadWorklet(
		algorithm: NoiseSuppressionAlgorithm,
	): Promise<void> {
		if (this.workletLoaded.get(algorithm)) {
			return;
		}

		const ctx = this.getAudioContext();
		const workletPath = `/audio/worklets/${algorithm}Worklet.js`;

		try {
			await ctx.audioWorklet.addModule(workletPath);
			this.workletLoaded.set(algorithm, true);
		} catch (error) {
			console.error(
				"AudioService: Failed to load worklet for",
				algorithm,
				error,
			);
			throw new Error(`Failed to load ${algorithm} worklet: ${error}`);
		}
	}

	public async createNoiseProcessor(
		options: NoiseSuppressionOptions,
	): Promise<AudioWorkletNode> {
		const ctx = this.getAudioContext();

		// Load worklet first
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

	public async processStream(
		inputStream: MediaStream,
		options: NoiseSuppressionOptions,
	): Promise<MediaStream> {
		// DEBUG: Check if stream is providing audio
		// if (typeof DEBUG_ENABLED !== "undefined" && DEBUG_ENABLED) {
		// 	const streamHasAudio = await AudioServiceDebug.checkStreamAudio(inputStream, this.getAudioContext());
		// 	if (!streamHasAudio) {
		// 		console.warn("AudioService: Input stream has no audio data!");
		// 	}
		// }

		// Clean up any existing processing
		this.cleanup();

		const ctx = this.getAudioContext();

		try {
			// DEBUG: Check the input stream state in detail
			// if (typeof DEBUG_ENABLED !== "undefined" && DEBUG_ENABLED) {
			// 	AudioServiceDebug.logInputStreamDetails(inputStream);
			// 	AudioServiceDebug.testDirectStreamAudio(inputStream);
			// }

			this.sourceNode = ctx.createMediaStreamSource(inputStream);
			this.destinationNode = ctx.createMediaStreamDestination();

			// DEBUG: Check if the MediaStreamSource is actually producing audio
			// if (typeof DEBUG_ENABLED !== "undefined" && DEBUG_ENABLED) {
			// 	AudioServiceDebug.testMediaStreamSourceOutput(this.sourceNode, ctx);
			// }

			this.currentProcessor = await this.createNoiseProcessor(options);

			// Connect the audio graph
			this.sourceNode.connect(this.currentProcessor);
			this.currentProcessor.connect(this.destinationNode);

			// DEBUG: Monitor input to the processor
			// if (typeof DEBUG_ENABLED !== "undefined" && DEBUG_ENABLED) {
			// 	AudioServiceDebug.monitorInputToProcessor(this.sourceNode, ctx);
			// }

			this.isProcessing = true;

			// Return the processed stream
			return this.destinationNode.stream;
		} catch (error) {
			console.error("AudioService: Failed to process stream:", error);
			this.cleanup();
			throw new Error(`Failed to process stream: ${error}`);
		}
	}

	public connectAnalyzer(analyzer: AnalyserNode): void {
		if (this.currentProcessor && this.isProcessing) {
			console.log("AudioService: Connecting analyzer to processed audio...");
			console.log("AudioService: Processor details:", {
				processorType: this.currentProcessor.constructor.name,
				numberOfInputs: this.currentProcessor.numberOfInputs,
				numberOfOutputs: this.currentProcessor.numberOfOutputs,
				context: this.currentProcessor.context.state,
			});
			console.log("AudioService: Analyzer details:", {
				fftSize: analyzer.fftSize,
				frequencyBinCount: analyzer.frequencyBinCount,
				sampleRate: analyzer.context.sampleRate,
			});

			// Connect analyzer to the processor output
			this.currentProcessor.connect(analyzer);
			console.log("AudioService: Analyzer connected successfully");

			// DEBUG: Monitor processor output
			// if (typeof DEBUG_ENABLED !== "undefined" && DEBUG_ENABLED) {
			// 	AudioServiceDebug.monitorProcessorOutput(this.currentProcessor);
			// }
		} else {
			console.warn("AudioService: No active processor to connect analyzer to", {
				processor: !!this.currentProcessor,
				isProcessing: this.isProcessing,
			});
		}
	}

	public disconnectAnalyzer(analyzer: AnalyserNode): void {
		if (this.currentProcessor) {
			try {
				this.currentProcessor.disconnect(analyzer);
			} catch {
				console.warn(
					"AudioService: Analyzer was not connected or already disconnected",
				);
			}
		}
	}

	public cleanup(): void {
		if (this.sourceNode) {
			this.sourceNode.disconnect();
			this.sourceNode = null;
		}

		if (this.currentProcessor) {
			this.currentProcessor.disconnect();
			this.currentProcessor = null;
		}

		if (this.destinationNode) {
			this.destinationNode.disconnect();
			this.destinationNode = null;
		}

		this.isProcessing = false;
	}

	public isSupported(): boolean {
		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			return !!AudioContextClass && "audioWorklet" in AudioContext.prototype;
		} catch {
			return false;
		}
	}

	public get processing(): boolean {
		return this.isProcessing;
	}
}

export const audioService = AudioService.getInstance();

// DEBUG
// To enable debugging, uncomment the DEBUG_ENABLED line and the AudioServiceDebug usage in the functions above

/*
const DEBUG_ENABLED = true;

const AudioServiceDebug = {
	async checkStreamAudio(inputStream: MediaStream, ctx: AudioContext): Promise<boolean> {
		const tempSource = ctx.createMediaStreamSource(inputStream);
		const tempAnalyzer = ctx.createAnalyser();
		tempAnalyzer.fftSize = 256;
		tempSource.connect(tempAnalyzer);

		const tempData = new Uint8Array(tempAnalyzer.frequencyBinCount);
		let hasAudio = false;

		for (let i = 0; i < 20; i++) {
			// Check for 2 seconds
			tempAnalyzer.getByteFrequencyData(tempData);
			const sum = tempData.reduce((a, b) => a + b, 0);
			if (sum > 0) {
				hasAudio = true;
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		tempSource.disconnect();
		console.log("AudioService: Raw input stream has audio:", hasAudio);
		console.log(
			"AudioService: Raw input sample:",
			Array.from(tempData.slice(0, 5)),
		);
		return hasAudio;
	},

	logInputStreamDetails(inputStream: MediaStream): void {
		const tracks = inputStream.getTracks();
		console.log("AudioService: Input stream detailed analysis:");
		tracks.forEach((track, i) => {
			console.log(`  Track ${i}:`, {
				kind: track.kind,
				enabled: track.enabled,
				readyState: track.readyState,
				muted: track.muted,
				label: track.label,
				constraints: track.getConstraints(),
				settings: track.getSettings(),
			});
		});
	},

	testDirectStreamAudio(inputStream: MediaStream): void {
		console.log("AudioService: Testing direct stream audio...");
		const testElement = document.createElement("audio");
		testElement.srcObject = inputStream;
		testElement.muted = true; // Don't play, just test
		testElement.onloadedmetadata = () => {
			console.log(
				"AudioService: Stream successfully loaded in audio element",
			);
		};
		testElement.onerror = (e) => {
			console.error(
				"AudioService: Stream failed to load in audio element:",
				e,
			);
		};
	},

	testMediaStreamSourceOutput(sourceNode: MediaStreamAudioSourceNode, ctx: AudioContext): void {
		console.log("AudioService: Testing MediaStreamSource output...");
		const sourceTestAnalyzer = ctx.createAnalyser();
		sourceTestAnalyzer.fftSize = 256;
		sourceNode.connect(sourceTestAnalyzer);

		// Test the source for a few cycles
		let sourceTestCount = 0;
		const testSourceAudio = () => {
			if (sourceTestCount++ < 10) {
				const sourceData = new Uint8Array(
					sourceTestAnalyzer.frequencyBinCount,
				);
				sourceTestAnalyzer.getByteFrequencyData(sourceData);
				const sourceSum = sourceData.reduce((acc, val) => acc + val, 0);
				console.log(
					`AudioService: MediaStreamSource test ${sourceTestCount}:`,
					{
						sum: sourceSum,
						average: (sourceSum / sourceData.length).toFixed(2),
						sample: Array.from(sourceData.slice(0, 5)),
					},
				);
				setTimeout(testSourceAudio, 200);
			} else {
				sourceNode?.disconnect(sourceTestAnalyzer);
				console.log("AudioService: MediaStreamSource test complete");
			}
		};
		setTimeout(testSourceAudio, 100);
	},

	monitorInputToProcessor(sourceNode: MediaStreamAudioSourceNode, ctx: AudioContext): void {
		const inputAnalyzer = ctx.createAnalyser();
		inputAnalyzer.fftSize = 256;
		sourceNode.connect(inputAnalyzer);

		// Monitor input for a few seconds to verify audio is flowing
		let monitorCount = 0;
		const monitorInput = () => {
			if (monitorCount++ < 20) {
				// Monitor for about 2 seconds
				const inputData = new Uint8Array(inputAnalyzer.frequencyBinCount);
				inputAnalyzer.getByteFrequencyData(inputData);
				const inputSum = inputData.reduce((acc, val) => acc + val, 0);
				const inputLevel = inputSum / inputData.length;
				console.log(
					"AudioService: Input level to processor:",
					inputLevel.toFixed(2),
					"sample:",
					Array.from(inputData.slice(0, 5)),
				);
				setTimeout(monitorInput, 100);
			} else {
				// Clean up the temporary analyzer
				sourceNode?.disconnect(inputAnalyzer);
				console.log("AudioService: Input monitoring complete");
			}
		};
		setTimeout(monitorInput, 500); // Start monitoring after a brief delay
	},

	monitorProcessorOutput(processor: AudioWorkletNode): void {
		const debugAnalyzer = processor.context.createAnalyser();
		debugAnalyzer.fftSize = 256;
		processor.connect(debugAnalyzer);

		// Monitor processor output
		let outputMonitorCount = 0;
		const monitorOutput = () => {
			if (outputMonitorCount++ < 20) {
				const outputData = new Uint8Array(debugAnalyzer.frequencyBinCount);
				debugAnalyzer.getByteFrequencyData(outputData);
				const outputSum = outputData.reduce((acc, val) => acc + val, 0);
				const outputLevel = outputSum / outputData.length;
				console.log(
					"AudioService: Processor output level:",
					outputLevel.toFixed(2),
					"sample:",
					Array.from(outputData.slice(0, 5)),
				);
				setTimeout(monitorOutput, 100);
			} else {
				// Clean up
				processor?.disconnect(debugAnalyzer);
				console.log("AudioService: Output monitoring complete");
			}
		};
		setTimeout(monitorOutput, 500);
	},
};
*/
