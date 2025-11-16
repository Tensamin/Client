"use client";

// Package Imports
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	useCallback,
	useEffectEvent,
} from "react";
import { v7 } from "uuid";
import useWebSocket, { ReadyState } from "react-use-websocket";

// Lib Imports
import { responseTimeout } from "@/lib/utils";
import { call_wss } from "@/lib/endpoints";
import {
	audioService,
	type NoiseSuppressionAlgorithm,
} from "@/lib/audioService";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { useStorageContext } from "@/context/storage";

// Types
import {
	AdvancedSuccessMessage,
	AdvancedSuccessMessageData,
	CallUser,
} from "@/lib/types";

// Main
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.l.google.com:5349" },
  { urls: "stun:stun1.l.google.com:3478" },
  { urls: "stun:stun1.l.google.com:5349" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:5349" },
  { urls: "stun:stun3.l.google.com:3478" },
  { urls: "stun:stun3.l.google.com:5349" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:5349" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credentials: "openrelayproject",
  },
  //{ urls: "stun:webrtc.tensamin.net:3478" },
  /*
  {
    urls: "turns:webrtc.tensamin.net:5349",
    username: "tensamin",
    credential:
      "d31297d3f156d7a0d62ce40a324c1a2ddc1dd6182c7bee4bb31efd9bbb0ac7ca",
  },
  */
];

const CallContext = createContext<CallContextType | null>(null);

export function useCallContext() {
	const context = useContext(CallContext);
	if (!context) throw new Error("hook outside of provider");
	return context;
}

export function CallProvider({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const usersRef = useRef<Map<string, CallUser>>(new Map());

	function exitCall() {
		setShouldConnect(false);
		usersRef.current.entries().forEach(([_, user]) => {
			user.connection?.close();
		});
		usersRef.current.clear();
	}

	// Websocket Stuff
	const pendingRequests = useRef(new Map());
	const [state, setState] = useState<
		"CONNECTED" | "CONNECTING" | "CLOSED" | "FAILED"
	>("CLOSED");
	const [identified, setIdentified] = useState(false);
	const [shouldConnect, setShouldConnect] = useState(false);
	const [failed, setFailed] = useState(false);

	const [callId, setCallId] = useState("019a6488-0086-7759-9bfc-9bda36d58e4f");
	const [ownPing, setOwnPing] = useState<number>(0);

	// Noise Suppression State
	const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(false);
	const [noiseSuppressionAlgorithm, setNoiseSuppressionAlgorithm] =
		useState<NoiseSuppressionAlgorithm>("speex");
	const [noiseSuppressionSupported, setNoiseSuppressionSupported] =
		useState(false);

	// Check noise suppression support on mount
	useEffect(() => {
		setNoiseSuppressionSupported(audioService.isSupported());
	}, []);

	const {
		debugLog,
		data: { call_onlyAllowRelays },
	} = useStorageContext();
	const { privateKeyHash, ownUuid } = useCryptoContext();

	const handleMessage = useCallback(
		async (message: MessageEvent) => {
			let parsedMessage: AdvancedSuccessMessage = {
				type: "",
				data: {},
				id: "",
			};
			try {
				try {
					parsedMessage = JSON.parse(message.data);
				} catch {
					debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_INVALID_MESSAGE");
				}
				if (parsedMessage.type !== "pong") {
					debugLog("CALL_CONTEXT", "CALL_CONTEXT_RECEIVE", {
						type: parsedMessage.type,
						data: parsedMessage.data,
					});
				}

				const currentRequest = pendingRequests.current.get(parsedMessage.id);
				if (currentRequest) {
					clearTimeout(currentRequest.timeoutId);
					pendingRequests.current.delete(parsedMessage.id);
					currentRequest.resolve(parsedMessage);
				}

				switch (parsedMessage.type) {
					case "client_connected":
						if (
							parsedMessage.data.user_id === ownUuid ||
							!parsedMessage.data.user_id
						)
							break;

						usersRef.current.set(parsedMessage.data.user_id, {
							state: parsedMessage.data.call_state ?? "UNKNOWN",
							active: false,
							connection: startConnection(
								parsedMessage.data.user_id,
								true,
								new RTCPeerConnection({
									iceServers,
									iceTransportPolicy: data.call_onlyAllowRelays
										? "relay"
										: "all",
								}),
							),
						});
						debugLog("CALL_CONTEXT", "CALL_CONTEXT_PEERS_UPDATED", {
							peers: Array.from(usersRef.current.keys()),
						});
						break;

					case "client_disconnected":
						if (
							parsedMessage.data.user_id === ownUuid ||
							!parsedMessage.data.user_id
						)
							break;

						usersRef.current
							.get(parsedMessage.data.user_id)
							?.connection?.close();
						usersRef.current.delete(parsedMessage.data.user_id);
						break;

					case "webrtc_ice":
						if (parsedMessage?.data?.payload) {
							const senderId = parsedMessage.data.sender_id;
							if (!senderId) {
								debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_SENDER", {
									type: "ICE",
								});
								break;
							}

							const user = usersRef.current.get(senderId);
							if (user?.connection) {
								user.connection.addIceCandidate(
									new RTCIceCandidate(
										parsedMessage.data.payload as RTCIceCandidate,
									),
								);
							} else {
								debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_CONNECTION", {
									senderId,
									type: "ICE",
								});
							}
						}
						break;

					case "webrtc_sdp":
						if (parsedMessage?.data?.payload) {
							const senderId = parsedMessage.data.sender_id;
							if (!senderId) {
								debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_SENDER", {
									type: "SDP",
								});
								break;
							}

							const user = usersRef.current.get(senderId);
							const connection = user?.connection;
							if (!connection) {
								debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_CONNECTION", {
									senderId,
									type: "SDP",
								});
								break;
							}
							await connection.setRemoteDescription(
								new RTCSessionDescription(
									parsedMessage.data.payload as RTCSessionDescriptionInit,
								),
							);
							if (parsedMessage.data.payload.type === "offer") {
								const answer = await connection.createAnswer();
								await connection.setLocalDescription(answer);
								debugLog("CALL_CONTEXT", "CALL_CONTEXT_SDP_SEND", {
									variant: "answer",
									receiverId: parsedMessage.data.sender_id,
								});
								void send("webrtc_sdp", {
									receiver_id: parsedMessage.data.sender_id,
									payload: connection.localDescription!,
								});
							}
						}
						break;

					default:
						break;
				}
			} catch (err: unknown) {
				debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
			}
		},
		[debugLog],
	);

	const { sendMessage: sendRaw, readyState } = useWebSocket(
		shouldConnect ? call_wss : null,
		{
			onOpen: () => debugLog("CALL_CONTEXT", "CALL_CONTEXT_CONNECTED"),
			onClose: () => {
				debugLog("CALL_CONTEXT", "CALL_CONTEXT_DISCONNECTED");
				pendingRequests.current.forEach(({ reject, timeoutId }) => {
					clearTimeout(timeoutId);
					reject(new Error("ERROR_CALL_CONTEXT_CLOSED_BEFORE_RESPONSE"));
				});
				pendingRequests.current.clear();
			},
			onMessage: handleMessage,
			shouldReconnect: () => false,
			share: true,
		},
	);

	const send = useCallback(
		async (
			requestType: string,
			data: AdvancedSuccessMessageData = {},
			noResponse = false,
		): Promise<AdvancedSuccessMessage> => {
			if (
				readyState !== ReadyState.CLOSED &&
				readyState !== ReadyState.CLOSING
			) {
				if (noResponse) {
					const messageToSend = {
						type: requestType,
						data,
					};

					try {
						if (messageToSend.type !== "ping") {
							debugLog("CALL_CONTEXT", "CALL_CONTEXT_SEND", {
								type: messageToSend.type,
								data: messageToSend.data,
							});
						}
						sendRaw(JSON.stringify(messageToSend));
					} catch (err: unknown) {
						debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
					}
					return {
						id: "",
						type: "error",
						data: {},
					};
				}

				return new Promise((resolve, reject) => {
					const id = v7();

					const messageToSend = {
						id,
						type: requestType,
						data,
					};

					const timeoutId = setTimeout(() => {
						pendingRequests.current.delete(id);
						debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_TIMEOUT", requestType);
						reject();
					}, responseTimeout);

					pendingRequests.current.set(id, { resolve, reject, timeoutId });

					try {
						if (messageToSend.type !== "ping") {
							debugLog("CALL_CONTEXT", "CALL_CONTEXT_SEND", {
								type: messageToSend.type,
								data: messageToSend.data,
							});
						}
						sendRaw(JSON.stringify(messageToSend));
					} catch (err: unknown) {
						clearTimeout(timeoutId);
						pendingRequests.current.delete(id);
						debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
						reject(err);
					}
				});
			} else {
				return {
					id: "",
					type: "error",
					data: {},
				};
			}
		},
		[readyState, debugLog, sendRaw],
	);

	const sendPing = useEffectEvent(async () => {
		const originalNow = Date.now();
		const data = await send("ping", { last_ping: originalNow });
		if (data.type !== "error") {
			const travelTime = Date.now() - originalNow;
			setOwnPing(travelTime);
		}
	});

	const fail = useEffectEvent(() => {
		setState("FAILED");
		setShouldConnect(false);
		setFailed(true);
	});

	useEffect(() => {
		if (readyState === ReadyState.OPEN && !identified && privateKeyHash) {
			send("identification", {
				call_id: callId,
				user_id: ownUuid,
				private_key_hash: privateKeyHash,
			})
				.then((message) => {
					if (!message.type.startsWith("error")) {
						setIdentified(true);
						setState("CONNECTED");
						debugLog("CALL_CONTEXT", "CALL_CONTEXT_IDENTIFICATION_SUCCESS");

						Object.keys(message?.data?.about ?? {}).forEach((userId) => {
							usersRef.current.set(userId, {
								state: message.data.about?.[userId].state ?? "UNKNOWN",
								active: false,
								connection: startConnection(
									userId,
									false,
									new RTCPeerConnection({
										iceServers,
										iceTransportPolicy: call_onlyAllowRelays ? "relay" : "all",
									}),
								),
							});
						});
						debugLog("CALL_CONTEXT", "CALL_CONTEXT_PEERS_INITIALIZED", {
							peers: Array.from(usersRef.current.keys()),
						});
					} else {
						debugLog("CALL_CONTEXT", message.type.toUpperCase());
						fail();
					}
				})
				.catch((err) => {
					debugLog(
						"CALL_CONTEXT",
						"ERROR_CALL_CONTEXT_IDENTIFICATION_FAILED",
						err,
					);
					fail();
				});
		}

		if (readyState === ReadyState.CONNECTING) setState("CONNECTING");
		if (readyState === ReadyState.UNINSTANTIATED) setState("CLOSED");
		if (readyState === ReadyState.CLOSED) setState("CLOSED");
	}, [
		readyState,
		privateKeyHash,
		setFailed,
		identified,
		ownUuid,
		debugLog,
		send,
	]);

	useEffect(() => {
		if (state !== "CONNECTED") return;

		const interval = setInterval(() => {
			void sendPing();
		}, 5000);

		return () => {
			clearInterval(interval);
		};
	}, [state]);

	// WebRTC Stuff
	const { data } = useStorageContext();

	function startConnection(
		userId: string,
		isInitiator: boolean,
		connection: RTCPeerConnection,
	) {
		console.log(userId);
		if (userId === ownUuid) return;

		connection.onicecandidate = (event) => {
			if (event.candidate) {
				send(
					"webrtc_ice",
					{
						receiver_id: userId,
						payload: event.candidate,
					},
					true,
				);
			}
		};

		connection.onconnectionstatechange = () => {
			switch (connection.connectionState) {
				case "connecting": {
					const user = usersRef.current.get(userId);
					if (user) user.active = false;
					break;
				}

				case "disconnected":
					usersRef.current.delete(userId);
					break;
			}
		};

		connection.ontrack = (event) => {
			debugLog("CALL_CONTEXT", "CALL_CONTEXT_TRACK_RECEIVED", {
				userId,
				track: event.track.kind,
			});
			const user = usersRef.current.get(userId);
			if (user) {
				const existingStream = user.stream;
				if (existingStream) {
					existingStream.addTrack(event.track);
					user.stream = existingStream;
				} else {
					const newStream = new MediaStream([event.track]);
					user.stream = newStream;
				}
			}
		};

		const addLocalTracks = async () => {
			try {
				const localStream = await getLocalStream("VOICE");
				localStream.getTracks().forEach((track) => {
					connection.addTrack(track, localStream);
				});
			} catch (error) {
				debugLog(
					"CALL_CONTEXT",
					"ERROR_CALL_CONTEXT_LOCAL_STREAM_FAILED",
					error,
				);
			}
		};

		if (isInitiator) {
			connection.onnegotiationneeded = async () => {
				const offer = await connection.createOffer();
				await connection.setLocalDescription(offer);
				debugLog("CALL_CONTEXT", "CALL_CONTEXT_SDP_SEND", {
					variant: "offer",
					receiverId: userId,
				});
				send(
					"webrtc_sdp",
					{
						receiver_id: userId,
						payload: connection.localDescription!,
					},
					true,
				);
			};
		}

		void addLocalTracks();
		return connection;
	}

	async function getLocalStream(
		type: "VOICE" | "VIDEO" | "CAMERA",
	): Promise<MediaStream> {
		debugLog(
			"NOISE_SUPPRESSION",
			"NS_SUPPORTED_STATE",
			noiseSuppressionSupported,
		);

		/*
		const voiceConstraints: MediaStreamConstraints = {
			audio: true,
			video: false,
		};
		*/

		// Audio Constraints for Noise Suppression (and raw), disables all features.
		// They will be handled by the real NS (RNNoise, Speex, etc.) or are not needed
		const voiceConstraintsNS: MediaStreamConstraints = {
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
				sampleRate: 48000, // required by rnnoise
				channelCount: (data.call_channelCount as number) || 2,
			},
			video: false,
		};

		const voiceConstraintsBuiltIn: MediaStreamConstraints = {
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
				sampleRate: 48000,
				channelCount: (data.call_channelCount as number) || 2,
			},
			video: false,
		};

		const videoConstraints: MediaStreamConstraints = {
			audio: data.call_captureAudio as boolean,
			video: {
				width: data.call_videoWidth as number,
				height: data.call_videoHeight as number,
				frameRate: data.call_videoFramerate as number,
			},
		};

		const cameraConstraints: MediaStreamConstraints = {
			audio: false,
			video: {
				width: data.call_videoWidth as number,
				height: data.call_videoHeight as number,
				frameRate: data.call_videoFramerate as number,
			},
		};
		/*
		nsState:
		0 = disabled
		1 = enabled, builtin w/ echo cancellation (sounds like absolute dogshit)
		2 = enabled, speex
		3 = enabled, rnnoise
		 */
		switch (type) {
			case "VOICE": {
				const nsState = data.nsState as number;

				let constraints: MediaStreamConstraints;

				// Determine constraints based on nsState
				switch (nsState) {
					case 1:
						constraints = voiceConstraintsBuiltIn;
						break;
					case 2:
					case 3:
						constraints = voiceConstraintsNS;
						break;
					default:
						constraints = voiceConstraintsNS;
						break;
				}
				const rawStream =
					await navigator.mediaDevices.getUserMedia(constraints);
				const debugTracks = rawStream.getTracks().map((t) => ({
					kind: t.kind,
					enabled: t.enabled,
					readyState: t.readyState,
				}));
				debugLog("CALL_CONTEXT", "CALL_CONTEXT_RAW_STREAM", debugTracks);

				// Apply noise suppression if enabled and supported
				if (
					nsState &&
					nsState >= 2 &&
					nsState <= 3 &&
					noiseSuppressionSupported
				) {
					try {
						let algorithm: NoiseSuppressionAlgorithm;
						switch (nsState) {
							case 2:
								algorithm = "speex";
								debugLog("CALL_CONTEXT", "CALL_CONTEXT_NS_ALGORITHM", "speex");
								break;
							case 3:
								algorithm = "rnnoise";
								debugLog(
									"CALL_CONTEXT",
									"CALL_CONTEXT_NS_ALGORITHM",
									"rnnoise",
								);
								break;
							default:
								// Fallback to raw stream for invalid nsState
								debugLog(
									"CALL_CONTEXT",
									"CALL_CONTEXT_INVALID_NS_STATE",
									"Invalid nsState",
								);
								return rawStream;
						}

						const processedStream = await audioService.processStream(
							rawStream,
							{
								algorithm,
								maxChannels: (data.call_channelCount as number) || 2,
							},
						);

						// Do not stop original tracks, the MediaStreamSource needs them to read audio data
						// WebAudio will read from the original tracks and they'll be stopped automatically.
						return processedStream;
					} catch (error) {
						debugLog("CALL_CONTEXT", "ERROR_NOISE_SUPPRESSION_FAILED", error);
						// Fallback to raw stream if noise suppression fails
						return rawStream;
					}
				}

				return rawStream;
			}
			case "VIDEO":
				return navigator.mediaDevices.getDisplayMedia(videoConstraints);
			case "CAMERA":
				return navigator.mediaDevices.getUserMedia(cameraConstraints);
			default:
				return navigator.mediaDevices.getUserMedia({
					audio: false,
					video: false,
				});
		}
	}

	// Noise suppression methods
	const enableNoiseSuppression = useCallback(
		(algorithm?: NoiseSuppressionAlgorithm) => {
			if (noiseSuppressionSupported) {
				setNoiseSuppressionEnabled(true);
				if (algorithm) {
					setNoiseSuppressionAlgorithm(algorithm);
				}
			}
		},
		[noiseSuppressionSupported],
	);

	const disableNoiseSuppression = useCallback(() => {
		setNoiseSuppressionEnabled(false);
		audioService.cleanup();
	}, []);

	const toggleNoiseSuppression = useCallback(() => {
		if (noiseSuppressionEnabled) {
			disableNoiseSuppression();
		} else {
			enableNoiseSuppression();
		}
	}, [
		noiseSuppressionEnabled,
		enableNoiseSuppression,
		disableNoiseSuppression,
	]);

	return (
		<CallContext.Provider
			value={{
				users: usersRef.current,
				exitCall,
				setShouldConnect,
				ownPing,
				send,
				state,
				// Noise suppression
				noiseSuppressionEnabled,
				noiseSuppressionAlgorithm,
				noiseSuppressionSupported,
				enableNoiseSuppression,
				disableNoiseSuppression,
				toggleNoiseSuppression,
				setNoiseSuppressionAlgorithm,
				// Audio stream
				getLocalStream,
			}}
		>
			{Array.from(usersRef.current.entries()).map(([userId, user]) =>
				user.stream ? (
					// eslint-disable-next-line jsx-a11y/media-has-caption
					// biome-ignore lint/a11y/useMediaCaption: not needed for call
					<audio
						onPlaying={() => {
							const user = usersRef.current.get(userId);
							if (user) user.active = true;
						}}
						onPlay={() => {
							const user = usersRef.current.get(userId);
							if (user) user.active = true;
						}}
						onAbort={() => {
							const user = usersRef.current.get(userId);
							if (user) user.active = false;
						}}
						key={userId}
						autoPlay
						playsInline
						ref={(el) => {
							if (el && el.srcObject !== user.stream) {
								el.srcObject = user?.stream ?? null;
							}
						}}
					/>
				) : null,
			)}
			{children}
		</CallContext.Provider>
	);
        
  const usersRef = useRef<Map<string, CallUser>>(new Map());
  const pendingRequests = useRef(new Map());
  const [state, setState] = useState<
    "CONNECTED" | "CONNECTING" | "CLOSED" | "FAILED"
  >("CLOSED");
  const [identified, setIdentified] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [, setFailed] = useState(false);

  const [callId] = useState("019a6488-0086-7759-9bfc-9bda36d58e4f");
  const [ownPing, setOwnPing] = useState<number>(0);

  const {
    debugLog,
    data: { call_onlyAllowRelays },
  } = useStorageContext();
  const { privateKeyHash, ownUuid } = useCryptoContext();

  function exitCall() {
    setShouldConnect(false);
    usersRef.current.entries().forEach(([, user]) => {
      user.connection?.close();
    });
    usersRef.current.clear();
  }

  // WebRTC Stuff
  const { data } = useStorageContext();

  const startConnection = useCallback(
    (userId: string, isInitiator: boolean, connection: RTCPeerConnection) => {
      console.log(userId);
      if (userId === ownUuid) return;

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          // eslint-disable-next-line
          send(
            "webrtc_ice",
            {
              receiver_id: userId,
              payload: event.candidate,
            },
            true
          );
        }
      };

      connection.onconnectionstatechange = () => {
        switch (connection.connectionState) {
          case "connecting":
            const user = usersRef.current.get(userId);
            if (user) user.active = false;
            break;

          case "disconnected":
            usersRef.current.delete(userId);
            break;
        }
      };

      connection.ontrack = (event) => {
        debugLog("CALL_CONTEXT", "CALL_CONTEXT_TRACK_RECEIVED", {
          userId,
          track: event.track.kind,
        });
        const user = usersRef.current.get(userId);
        if (user) {
          const existingStream = user.stream;
          if (existingStream) {
            existingStream.addTrack(event.track);
            user.stream = existingStream;
          } else {
            const newStream = new MediaStream([event.track]);
            user.stream = newStream;
          }
        }
      };

      function getLocalStream(
        type: "VOICE" | "VIDEO" | "CAMERA"
      ): Promise<MediaStream> {
        const voiceConstraints: MediaStreamConstraints = {
          audio: true,
          video: false,
        };

        const videoConstraints: MediaStreamConstraints = {
          audio: data.call_captureAudio as boolean,
          video: {
            width: data.call_videoWidth as number,
            height: data.call_videoHeight as number,
            frameRate: data.call_videoFramerate as number,
          },
        };

        const cameraConstraints: MediaStreamConstraints = {
          audio: false,
          video: {
            width: data.call_videoWidth as number,
            height: data.call_videoHeight as number,
            frameRate: data.call_videoFramerate as number,
          },
        };

        switch (type) {
          case "VOICE":
            return navigator.mediaDevices.getUserMedia(voiceConstraints);
          case "VIDEO":
            return navigator.mediaDevices.getDisplayMedia(videoConstraints);
          case "CAMERA":
            return navigator.mediaDevices.getUserMedia(cameraConstraints);
          default:
            return navigator.mediaDevices.getUserMedia({
              audio: false,
              video: false,
            });
        }
      }

      const addLocalTracks = async () => {
        try {
          const localStream = await getLocalStream("VOICE");
          localStream.getTracks().forEach((track) => {
            connection.addTrack(track, localStream);
          });
        } catch (error) {
          debugLog(
            "CALL_CONTEXT",
            "ERROR_CALL_CONTEXT_LOCAL_STREAM_FAILED",
            error
          );
        }
      };

      if (isInitiator) {
        connection.onnegotiationneeded = async () => {
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          debugLog("CALL_CONTEXT", "CALL_CONTEXT_SDP_SEND", {
            variant: "offer",
            receiverId: userId,
          });
          send(
            "webrtc_sdp",
            {
              receiver_id: userId,
              payload: connection.localDescription!,
            },
            true
          );
        };
      }

      void addLocalTracks();
      return connection;
    },
    [
      ownUuid,
      debugLog,
      data.call_captureAudio,
      data.call_videoWidth,
      data.call_videoHeight,
      data.call_videoFramerate,
    ]
  );

  // Websocket Stuff
  const handleMessage = useCallback(
    async (message: MessageEvent) => {
      let parsedMessage: AdvancedSuccessMessage = {
        type: "",
        data: {},
        id: "",
      };
      try {
        try {
          parsedMessage = JSON.parse(message.data);
        } catch {
          debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_INVALID_MESSAGE");
        }
        if (parsedMessage.type !== "pong") {
          debugLog("CALL_CONTEXT", "CALL_CONTEXT_RECEIVE", {
            type: parsedMessage.type,
            data: parsedMessage.data,
          });
        }

        const currentRequest = pendingRequests.current.get(parsedMessage.id);
        if (currentRequest) {
          clearTimeout(currentRequest.timeoutId);
          pendingRequests.current.delete(parsedMessage.id);
          currentRequest.resolve(parsedMessage);
        }

        switch (parsedMessage.type) {
          case "client_connected":
            if (
              parsedMessage.data.user_id === ownUuid ||
              !parsedMessage.data.user_id
            )
              break;

            usersRef.current.set(parsedMessage.data.user_id, {
              state: parsedMessage.data.call_state ?? "UNKNOWN",
              active: false,
              connection: startConnection(
                parsedMessage.data.user_id,
                true,
                new RTCPeerConnection({
                  iceServers,
                  iceTransportPolicy: data.call_onlyAllowRelays
                    ? "relay"
                    : "all",
                })
              ),
            });
            debugLog("CALL_CONTEXT", "CALL_CONTEXT_PEERS_UPDATED", {
              peers: Array.from(usersRef.current.keys()),
            });
            break;

          case "client_disconnected":
            if (
              parsedMessage.data.user_id === ownUuid ||
              !parsedMessage.data.user_id
            )
              break;

            usersRef.current
              .get(parsedMessage.data.user_id)
              ?.connection?.close();
            usersRef.current.delete(parsedMessage.data.user_id);
            break;

          case "webrtc_ice":
            if (parsedMessage?.data?.payload) {
              const senderId = parsedMessage.data.sender_id;
              if (!senderId) {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_SENDER", {
                  type: "ICE",
                });
                break;
              }

              const user = usersRef.current.get(senderId);
              if (user?.connection) {
                user.connection.addIceCandidate(
                  new RTCIceCandidate(
                    parsedMessage.data.payload as RTCIceCandidate
                  )
                );
              } else {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_CONNECTION", {
                  senderId,
                  type: "ICE",
                });
              }
            }
            break;

          case "webrtc_sdp":
            if (parsedMessage?.data?.payload) {
              const senderId = parsedMessage.data.sender_id;
              if (!senderId) {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_SENDER", {
                  type: "SDP",
                });
                break;
              }

              const user = usersRef.current.get(senderId);
              const connection = user?.connection;
              if (!connection) {
                debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_NO_CONNECTION", {
                  senderId,
                  type: "SDP",
                });
                break;
              }
              await connection.setRemoteDescription(
                new RTCSessionDescription(
                  parsedMessage.data.payload as RTCSessionDescriptionInit
                )
              );
              if (
                (parsedMessage.data.payload as RTCSessionDescriptionInit)
                  .type === "offer"
              ) {
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                debugLog("CALL_CONTEXT", "CALL_CONTEXT_SDP_SEND", {
                  variant: "answer",
                  receiverId: parsedMessage.data.sender_id,
                });
                void send(
                  "webrtc_sdp",
                  {
                    receiver_id: parsedMessage.data.sender_id,
                    payload: connection.localDescription!,
                  },
                  true
                );
              }
            }
            break;

          default:
            break;
        }
      } catch (err: unknown) {
        debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
      }
    },
    [debugLog, data.call_onlyAllowRelays, ownUuid, startConnection]
  );

  const { sendMessage: sendRaw, readyState } = useWebSocket(
    shouldConnect ? call_wss : null,
    {
      onOpen: () => debugLog("CALL_CONTEXT", "CALL_CONTEXT_CONNECTED"),
      onClose: () => {
        debugLog("CALL_CONTEXT", "CALL_CONTEXT_DISCONNECTED");
        pendingRequests.current.forEach(({ reject, timeoutId }) => {
          clearTimeout(timeoutId);
          reject(new Error("ERROR_CALL_CONTEXT_CLOSED_BEFORE_RESPONSE"));
        });
        pendingRequests.current.clear();
      },
      onMessage: handleMessage,
      shouldReconnect: () => false,
      share: true,
    }
  );

  const send: (
    requestType: string,
    data?: AdvancedSuccessMessageData,
    noResponse?: boolean
  ) => Promise<AdvancedSuccessMessage> = useCallback(
    async (
      requestType: string,
      data: AdvancedSuccessMessageData = {},
      noResponse = false
    ): Promise<AdvancedSuccessMessage> => {
      if (
        readyState !== ReadyState.CLOSED &&
        readyState !== ReadyState.CLOSING
      ) {
        if (noResponse) {
          const messageToSend = {
            type: requestType,
            data,
          };

          try {
            if (messageToSend.type !== "ping") {
              debugLog("CALL_CONTEXT", "CALL_CONTEXT_SEND", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (err: unknown) {
            debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
          }
          return {
            id: "",
            type: "error",
            data: {},
          };
        }

        return new Promise((resolve, reject) => {
          const id = v7();

          const messageToSend = {
            id,
            type: requestType,
            data,
          };

          const timeoutId = setTimeout(() => {
            pendingRequests.current.delete(id);
            debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_TIMEOUT", requestType);
            reject();
          }, responseTimeout);

          pendingRequests.current.set(id, { resolve, reject, timeoutId });

          try {
            if (messageToSend.type !== "ping") {
              debugLog("CALL_CONTEXT", "CALL_CONTEXT_SEND", {
                type: messageToSend.type,
                data: messageToSend.data,
              });
            }
            sendRaw(JSON.stringify(messageToSend));
          } catch (err: unknown) {
            clearTimeout(timeoutId);
            pendingRequests.current.delete(id);
            debugLog("CALL_CONTEXT", "ERROR_CALL_CONTEXT_UNKNOWN", err);
            reject(err);
          }
        });
      } else {
        return {
          id: "",
          type: "error",
          data: {},
        };
      }
    },
    [readyState, debugLog, sendRaw]
  );

  const sendPing = useEffectEvent(async () => {
    const originalNow = Date.now();
    const data = await send("ping", { last_ping: originalNow });
    if (data.type !== "error") {
      const travelTime = Date.now() - originalNow;
      setOwnPing(travelTime);
    }
  });

  const fail = useEffectEvent(() => {
    setState("FAILED");
    setShouldConnect(false);
    setFailed(true);
  });

  useEffect(() => {
    if (readyState === ReadyState.OPEN && !identified && privateKeyHash) {
      send("identification", {
        call_id: callId,
        user_id: ownUuid,
        private_key_hash: privateKeyHash,
      })
        .then((message) => {
          if (!message.type.startsWith("error")) {
            setIdentified(true);
            setState("CONNECTED");
            debugLog("CALL_CONTEXT", "CALL_CONTEXT_IDENTIFICATION_SUCCESS");

            Object.keys(message?.data?.about ?? {}).forEach((userId) => {
              usersRef.current.set(userId, {
                state: message.data.about?.[userId].state ?? "UNKNOWN",
                active: false,
                connection: startConnection(
                  userId,
                  false,
                  new RTCPeerConnection({
                    iceServers,
                    iceTransportPolicy: call_onlyAllowRelays ? "relay" : "all",
                  })
                ),
              });
            });
            debugLog("CALL_CONTEXT", "CALL_CONTEXT_PEERS_INITIALIZED", {
              peers: Array.from(usersRef.current.keys()),
            });
          } else {
            debugLog("CALL_CONTEXT", message.type.toUpperCase());
            fail();
          }
        })
        .catch((err) => {
          debugLog(
            "CALL_CONTEXT",
            "ERROR_CALL_CONTEXT_IDENTIFICATION_FAILED",
            err
          );
          fail();
        });
    }

    if (readyState === ReadyState.CONNECTING) setState("CONNECTING");
    if (readyState === ReadyState.UNINSTANTIATED) setState("CLOSED");
    if (readyState === ReadyState.CLOSED) setState("CLOSED");
  }, [
    readyState,
    privateKeyHash,
    setFailed,
    identified,
    ownUuid,
    debugLog,
    send,
    callId,
    call_onlyAllowRelays,
    startConnection,
  ]);

  useEffect(() => {
    if (state !== "CONNECTED") return;

    const interval = setInterval(() => {
      void sendPing();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [state]);

  return (
    <CallContext.Provider
      value={{
        users: usersRef.current,
        exitCall,
        setShouldConnect,
        ownPing,
        send,
        state,
      }}
    >
      {Array.from(usersRef.current.entries()).map(([userId, user]) =>
        user.stream ? (
          <audio
            onPlaying={() => {
              const user = usersRef.current.get(userId);
              if (user) user.active = true;
            }}
            onPlay={() => {
              const user = usersRef.current.get(userId);
              if (user) user.active = true;
            }}
            onAbort={() => {
              const user = usersRef.current.get(userId);
              if (user) user.active = false;
            }}
            key={userId}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && el.srcObject !== user.stream) {
                el.srcObject = user?.stream ?? null;
              }
            }}
          />
        ) : null
      )}
      {children}
    </CallContext.Provider>
  );
}

type CallContextType = {
	users: Map<string, CallUser>;
	setShouldConnect: (value: boolean) => void;
	ownPing: number;
	exitCall: () => void;
	send: (
		requestType: string,
		data?: AdvancedSuccessMessageData,
		noResponse?: boolean,
	) => Promise<AdvancedSuccessMessage>;
	state: "CONNECTED" | "CONNECTING" | "CLOSED" | "FAILED";
	// Noise suppression properties
	noiseSuppressionEnabled: boolean;
	noiseSuppressionAlgorithm: NoiseSuppressionAlgorithm;
	noiseSuppressionSupported: boolean;
	enableNoiseSuppression: (algorithm?: NoiseSuppressionAlgorithm) => void;
	disableNoiseSuppression: () => void;
	toggleNoiseSuppression: () => void;
	setNoiseSuppressionAlgorithm: (algorithm: NoiseSuppressionAlgorithm) => void;
	// Audio stream
	getLocalStream: (type: "VOICE" | "VIDEO" | "CAMERA") => Promise<MediaStream>;
};
