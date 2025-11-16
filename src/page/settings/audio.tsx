"use client";

import { useState, useId, useEffect, useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from "@/components/ui/tooltip";
import { useStorageContext } from "@/context/storage";
import { audioService } from "@/lib/audioService";
import { useCallContext } from "@/context/call";

interface AudioDevice {
	deviceId: string;
	label: string;
	kind: "audioinput" | "audiooutput";
}

export default function Page() {
	const { data, set, translate } = useStorageContext();
	const { noiseSuppressionSupported, getLocalStream } = useCallContext();

	// Set defaults in storage if missing
	useEffect(() => {
		if (!data.inputDevice) set("inputDevice", "default");
		if (!data.outputDevice) set("outputDevice", "default");
		if (!data.inputVolume) set("inputVolume", 50);
		if (!data.outputVolume) set("outputVolume", 80);
		if (data.nsState === undefined || data.nsState === null) set("nsState", 0);
	}, [
		data.inputDevice,
		data.outputDevice,
		data.inputVolume,
		data.outputVolume,
		data.nsState,
		set,
	]);
	const inputVolumeId = useId();
	const outputVolumeId = useId();

	const inputDevice = (data.inputDevice as string) || "default";
	const outputDevice = (data.outputDevice as string) || "default";
	const inputVolume = (data.inputVolume as number) || 50;
	const outputVolume = (data.outputVolume as number) || 80;
	const nsState = (data.nsState as number) || 0;

	const setInputDevice = useCallback(
		(value: string) => set("inputDevice", value),
		[set],
	);
	const setOutputDevice = useCallback(
		(value: string) => set("outputDevice", value),
		[set],
	);
	const setInputVolume = useCallback(
		(value: number) => set("inputVolume", value),
		[set],
	);
	const setOutputVolume = useCallback(
		(value: number) => set("outputVolume", value),
		[set],
	);
	const setNsState = useCallback(
		(value: number) => set("nsState", value),
		[set],
	);

	// Local state
	const [micTestActive, setMicTestActive] = useState(false);

	const [inputDevices, setInputDevices] = useState<AudioDevice[]>([
		{ deviceId: "default", label: "Default", kind: "audioinput" },
	]);
	const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([
		{ deviceId: "default", label: "Default", kind: "audiooutput" },
	]);
	const [isLoadingDevices, setIsLoadingDevices] = useState(true);

	// Mic test state
	const [audioLevel, setAudioLevel] = useState(0);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const micStreamRef = useRef<MediaStream | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const micGainNodeRef = useRef<GainNode | null>(null);
	const isUsingSharedContextRef = useRef<boolean>(false);

	const enumerateDevices = useCallback(async () => {
		try {
			setIsLoadingDevices(true);

			const devices = await navigator.mediaDevices.enumerateDevices();

			const audioInputDevices: AudioDevice[] = [];
			const audioOutputDevices: AudioDevice[] = [];

			devices.forEach((device) => {
				if (
					device.kind === "audioinput" &&
					device.deviceId &&
					device.deviceId !== "default" &&
					device.deviceId.trim() !== ""
				) {
					audioInputDevices.push({
						deviceId: device.deviceId,
						label: device.label || `Microphone ${audioInputDevices.length + 1}`,
						kind: device.kind,
					});
				} else if (
					device.kind === "audiooutput" &&
					device.deviceId &&
					device.deviceId !== "default" &&
					device.deviceId.trim() !== ""
				) {
					audioOutputDevices.push({
						deviceId: device.deviceId,
						label: device.label || `Speaker ${audioOutputDevices.length + 1}`,
						kind: device.kind,
					});
				}
			});

			setInputDevices([
				{ deviceId: "default", label: "Default", kind: "audioinput" },
				...audioInputDevices,
			]);

			setOutputDevices([
				{ deviceId: "default", label: "Default", kind: "audiooutput" },
				...audioOutputDevices,
			]);
		} catch (error) {
			console.error("Error enumerating devices:", error);
			setInputDevices([
				{ deviceId: "default", label: "Default", kind: "audioinput" },
			]);
			setOutputDevices([
				{ deviceId: "default", label: "Default", kind: "audiooutput" },
			]);
		} finally {
			setIsLoadingDevices(false);
		}
	}, []);

	useEffect(() => {
		const loadDevices = async () => {
			await enumerateDevices();
		};

		if (typeof navigator !== "undefined" && navigator.mediaDevices) {
			loadDevices();

			const handleDeviceChange = () => {
				loadDevices();
			};

			navigator.mediaDevices.addEventListener(
				"devicechange",
				handleDeviceChange,
			);

			return () => {
				navigator.mediaDevices?.removeEventListener(
					"devicechange",
					handleDeviceChange,
				);
			};
		} else {
			console.warn("MediaDevices API not supported");
			setIsLoadingDevices(false);
		}
	}, [enumerateDevices]);

	const handleMicTest = useCallback(async () => {
		if (!micTestActive) {
			try {

				setMicTestActive(true);

				// For mic testing with noise suppression
				let stream: MediaStream;
				let useSharedContext = false;

				if (nsState >= 2 && nsState <= 3 && noiseSuppressionSupported) {
					// Get the processed stream to actually test noise suppression
					stream = await getLocalStream("VOICE");
					useSharedContext = true;
				} else {
					stream = await getLocalStream("VOICE");
				}

				micStreamRef.current = stream;

				// Use the shared AudioContext from audioService if noise suppression is active
				if (useSharedContext) {
					audioContextRef.current = audioService.getAudioContext();
					isUsingSharedContextRef.current = true;
				} else {
					audioContextRef.current = new (
						window.AudioContext ||
						(window as unknown as { webkitAudioContext: typeof AudioContext })
							.webkitAudioContext
					)();
					isUsingSharedContextRef.current = false;
				}

				if (audioContextRef.current?.state === "suspended") {
					await audioContextRef.current.resume();
				}

				if (!audioContextRef.current) {
					throw new Error("Failed to create AudioContext");
				}

				analyserRef.current = audioContextRef.current.createAnalyser();
				micGainNodeRef.current = audioContextRef.current.createGain();

				// Configure analyzer before connecting
				analyserRef.current.fftSize = 2048;
				analyserRef.current.smoothingTimeConstant = 0.8;
				/*
				console.log("Analyzer configuration:", {
					fftSize: analyserRef.current.fftSize,
					frequencyBinCount: analyserRef.current.frequencyBinCount,
					smoothingTimeConstant: analyserRef.current.smoothingTimeConstant,
					sampleRate: audioContextRef.current.sampleRate,
				}); 
				*/

				if (useSharedContext && audioService.processing) {
					// Connect the analyzer
					audioService.connectAnalyzer(analyserRef.current);
					// Connect a gain node for output monitoring
					analyserRef.current.connect(micGainNodeRef.current);
				} else {
					const source =
						audioContextRef.current.createMediaStreamSource(stream);

					source.connect(analyserRef.current);
					source.connect(micGainNodeRef.current);
				}

				micGainNodeRef.current.gain.setValueAtTime(
					(outputVolume / 100) * 0.5,
					audioContextRef.current.currentTime,
				);

				if (
					"setSinkId" in audioContextRef.current &&
					outputDevice !== "default"
				) {
					try {
						await (
							audioContextRef.current as AudioContext & {
								setSinkId: (deviceId: string) => Promise<void>;
							}
						).setSinkId(outputDevice);
					} catch (sinkError) {
						console.warn(
							"Could not set voice playback output device:",
							sinkError,
						);
					}
				}

				micGainNodeRef.current.connect(audioContextRef.current.destination);

				const updateAudioLevel = () => {
					if (analyserRef.current && micStreamRef.current) {
						const timeDomainData = new Uint8Array(analyserRef.current.fftSize);
						const frequencyData = new Uint8Array(
							analyserRef.current.frequencyBinCount,
						);

						analyserRef.current.getByteTimeDomainData(timeDomainData);
						analyserRef.current.getByteFrequencyData(frequencyData);

						let sum = 0;
						let peak = 0;
						for (let i = 0; i < timeDomainData.length; i++) {
							const value = (timeDomainData[i] - 128) / 128;
							sum += value * value;
							peak = Math.max(peak, Math.abs(value));
						}
						const rms = Math.sqrt(sum / timeDomainData.length);

						let freqSum = 0;
						for (let i = 0; i < frequencyData.length; i++) {
							freqSum += frequencyData[i];
						}
						const freqAverage = freqSum / frequencyData.length;

						const rmsLevel = Math.round(rms * 100 * 5);
						const peakLevel = Math.round(peak * 100 * 3);
						const freqLevel = Math.round((freqAverage / 255) * 100 * 2);

						const level = Math.max(rmsLevel, peakLevel, freqLevel);

						const finalLevel = Math.min(100, Math.max(0, level));

						setAudioLevel(finalLevel);

						if (micStreamRef.current?.active) {
							animationFrameRef.current =
								requestAnimationFrame(updateAudioLevel);
						} else {
						}
					} else {
					}
				};

				updateAudioLevel();
			} catch (error) {
				console.error("Error accessing microphone:", error);
				setMicTestActive(false);
				// Could show an error toast here
			}
		} else {
			// Stop mic test
			setMicTestActive(false);
			setAudioLevel(0);

			// Clean up audio resources
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}

			if (analyserRef.current) {
				// Disconnect from audioService if we were using shared context
				if (isUsingSharedContextRef.current && audioService.processing) {
					audioService.disconnectAnalyzer(analyserRef.current);
				}
				analyserRef.current = null;
			}

			if (micGainNodeRef.current) {
				micGainNodeRef.current.disconnect();
				micGainNodeRef.current = null;
			}

			if (micStreamRef.current) {
				micStreamRef.current.getTracks().forEach((track) => {
					track.stop();
				});
				micStreamRef.current = null;
			}

			// If we were using noise suppression, clean up the audioService processing
			// since the mic test was likely the only consumer
			if (isUsingSharedContextRef.current && audioService.processing) {
				audioService.cleanup();
			}

			if (audioContextRef.current) {
				// Only close the AudioContext if we created it ourselves (not shared)
				if (!isUsingSharedContextRef.current) {
					audioContextRef.current.close();
				}
				audioContextRef.current = null;
			}

			isUsingSharedContextRef.current = false;
		}
	}, [
		micTestActive,
		outputDevice,
		outputVolume,
		getLocalStream,
		nsState,
		noiseSuppressionSupported,
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// Cleanup mic test resources
			if (micStreamRef.current) {
				micStreamRef.current.getTracks().forEach((track) => {
					track.stop();
				});
			}
			if (
				analyserRef.current &&
				isUsingSharedContextRef.current &&
				audioService.processing
			) {
				audioService.disconnectAnalyzer(analyserRef.current);
			}
			if (micGainNodeRef.current) {
				micGainNodeRef.current.disconnect();
			}
			// If we were using noise suppression, clean up the audioService processing
			if (isUsingSharedContextRef.current && audioService.processing) {
				audioService.cleanup();
			}
			if (audioContextRef.current) {
				// Only close the AudioContext if we created it ourselves (not shared)
				if (!isUsingSharedContextRef.current) {
					audioContextRef.current.close();
				}
			}
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	// Selected devices should always be valid
	useEffect(() => {
		if (!isLoadingDevices) {
			const validInputIds = inputDevices.map((d) => d.deviceId);
			const validOutputIds = outputDevices.map((d) => d.deviceId);

			if (!validInputIds.includes(inputDevice)) {
				setInputDevice("default");
			}

			if (!validOutputIds.includes(outputDevice)) {
				setOutputDevice("default");
			}
		}
	}, [
		inputDevices,
		outputDevices,
		inputDevice,
		outputDevice,
		isLoadingDevices,
		setInputDevice,
		setOutputDevice,
	]);

	// Stop mic test if nsState changes while testing (to apply new noise suppression)
	const prevNsStateRef = useRef(nsState);
	useEffect(() => {
		if (micTestActive && prevNsStateRef.current !== nsState) {
			setMicTestActive(false);
			setAudioLevel(0);

			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}

			if (analyserRef.current) {
				// Disconnect from audioService if we were using shared context
				if (isUsingSharedContextRef.current && audioService.processing) {
					audioService.disconnectAnalyzer(analyserRef.current);
				}
				analyserRef.current = null;
			}

			if (micGainNodeRef.current) {
				micGainNodeRef.current.disconnect();
				micGainNodeRef.current = null;
			}

			if (micStreamRef.current) {
				micStreamRef.current.getTracks().forEach((track) => {
					track.stop();
				});
				micStreamRef.current = null;
			}

			// If we were using noise suppression, clean up the audioService processing
			if (isUsingSharedContextRef.current && audioService.processing) {
				audioService.cleanup();
			}

			if (audioContextRef.current) {
				// Only close the AudioContext if we created it ourselves (not shared)
				if (!isUsingSharedContextRef.current) {
					audioContextRef.current.close();
				}
				audioContextRef.current = null;
			}

			isUsingSharedContextRef.current = false;
		}
		prevNsStateRef.current = nsState;
	}, [nsState, micTestActive]);

	return (
		<TooltipProvider delayDuration={100}>
			<div className="space-y-8 max-w-2xl">
				<div>
					<div className="space-y-4 mb-8">
						<div className="grid grid-cols-2 gap-8">
							<div className="space-y-2">
								<Label htmlFor="input-device" className="text-sm font-medium">
									{translate("SETTINGS_AUDIO_INPUT_DEVICE_LABEL")}
								</Label>
								<Select value={inputDevice} onValueChange={setInputDevice}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{isLoadingDevices ? (
											<SelectItem value="loading-input">
												{translate("SETTINGS_AUDIO_DEVICES_LOADING")}
											</SelectItem>
										) : (
											inputDevices
												.filter(
													(device) =>
														device.deviceId && device.deviceId.trim() !== "",
												)
												.map((device) => (
													<SelectItem
														key={device.deviceId}
														value={device.deviceId}
													>
														{device.label || "Unknown Device"}
													</SelectItem>
												))
										)}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="output-device" className="text-sm font-medium">
									{translate("SETTINGS_AUDIO_OUTPUT_DEVICE_LABEL")}
								</Label>
								<Select value={outputDevice} onValueChange={setOutputDevice}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{isLoadingDevices ? (
											<SelectItem value="loading-output">
												{translate("SETTINGS_AUDIO_DEVICES_LOADING")}
											</SelectItem>
										) : (
											outputDevices
												.filter(
													(device) =>
														device.deviceId && device.deviceId.trim() !== "",
												)
												.map((device) => (
													<SelectItem
														key={device.deviceId}
														value={device.deviceId}
													>
														{device.label || "Unknown Device"}
													</SelectItem>
												))
										)}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<div className="space-y-6 mb-8">
						<div className="grid grid-cols-2 gap-8">
							<div className="space-y-3">
								<Label htmlFor={inputVolumeId} className="text-sm font-medium">
									{translate("SETTINGS_AUDIO_INPUT_VOLUME")}
								</Label>
								<div className="flex items-center space-x-3">
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex-1">
												<Slider
													id={inputVolumeId}
													min={0}
													max={100}
													value={[inputVolume]}
													onValueChange={(values) => setInputVolume(values[0])}
													className="w-full"
												/>
											</div>
										</TooltipTrigger>
										<TooltipContent
											side="top"
											sideOffset={12}
											className="font-medium"
										>
											{inputVolume}%
										</TooltipContent>
									</Tooltip>
								</div>
							</div>

							<div className="space-y-3">
								<Label htmlFor={outputVolumeId} className="text-sm font-medium">
									{translate("SETTINGS_AUDIO_OUTPUT_VOLUME")}
								</Label>
								<div className="flex items-center space-x-3">
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex-1">
												<Slider
													id={outputVolumeId}
													min={0}
													max={100}
													value={[outputVolume]}
													onValueChange={(values) => setOutputVolume(values[0])}
													className="w-full"
												/>
											</div>
										</TooltipTrigger>
										<TooltipContent
											side="top"
											sideOffset={12}
											className="font-medium"
										>
											{outputVolume}%
										</TooltipContent>
									</Tooltip>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-4 mb-8">
						<Label className="text-sm font-medium">{translate("SETTINGS_AUDIO_NS_LABEL")}</Label>
						<p className="text-sm text-muted-foreground">
							{translate("SETTINGS_AUDIO_NS_DESCRIPTION")}
						</p>
						<div className="space-y-2">
							<Select
								value={nsState.toString()}
								onValueChange={(value) => setNsState(parseInt(value))}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">{translate("SETTINGS_AUDIO_NS_DISABLED")}</SelectItem>
									<SelectItem value="1">
										{translate("SETTINGS_AUDIO_NS_BUILTIN")}
									</SelectItem>
									{noiseSuppressionSupported && (
										<>
											<SelectItem value="2">
												{translate("SETTINGS_AUDIO_NS_SPEEX")}
											</SelectItem>
											<SelectItem value="3">
												{translate("SETTINGS_AUDIO_NS_RNNOISE")}
											</SelectItem>
										</>
									)}
								</SelectContent>
							</Select>
							{!noiseSuppressionSupported &&
								(nsState === 2 || nsState === 3) && (
									<p className="text-sm text-yellow-600 dark:text-yellow-400">
										{translate("SETTINGS_AUDIO_NS_UNSUPPORTED")}
									</p>
								)}
						</div>
					</div>

					<div className="space-y-4 mb-8">
						<Label className="text-sm font-medium">Test</Label>
						<p className="text-sm text-muted-foreground">
							{translate("SETTINGS_AUDIO_TEST_LABEL")}
						</p>
						<Button
							onClick={handleMicTest}
							variant={micTestActive ? "destructive" : "default"}
							className="w-fit"
						>
							{micTestActive
								? translate("SETTINGS_AUDIO_STOP_TEST")
								: translate("SETTINGS_AUDIO_START_TEST")}
						</Button>

						{micTestActive && (
							<div className="mt-3 space-y-2">
								<div className="flex justify-between items-center">
									<div className="text-xs text-muted-foreground font-mono">
										Context: {audioContextRef.current?.state || "none"}
									</div>
									<div className="text-xs text-muted-foreground font-mono">
										NS:{" "}
										{nsState === 0
											? "Disabled"
											: nsState === 1
												? "Built-in"
												: nsState === 2
													? "Speex"
													: nsState === 3
														? "RNNoise"
														: "Unknown"}
									</div>
								</div>
								<div className="flex-1">
									<Slider
										value={[audioLevel]}
										min={0}
										max={100}
										disabled
										className="w-full pointer-events-none"
									/>
								</div>

								{audioLevel > 0 && (
									<p className="text-xs text-muted-foreground text-center">
										{audioLevel < 10
											? translate("SETTINGS_AUDIO_TEST_VOLUME_1")
											: audioLevel < 30
												? translate("SETTINGS_AUDIO_TEST_VOLUME_2")
												: audioLevel < 70
													? translate("SETTINGS_AUDIO_TEST_VOLUME_3")
													: translate("SETTINGS_AUDIO_TEST_VOLUME_4")}
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}
