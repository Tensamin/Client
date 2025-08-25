"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { v7 } from "uuid";

import { log, log as logFunction, sha256 } from "@/lib/utils";
import { endpoint } from "@/lib/endpoints";
import ls from "@/lib/localStorageManager";

import { useCryptoContext } from "@/components/context/crypto";
import { useUsersContext } from "@/components/context/users";
import { useEncryptionContext } from "@/components/context/encryption";
import { useWebSocketContext } from "@/components/context/websocket";
import { useMessageContext } from "@/components/context/message";

// Config
const webrtc_servers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:3478" },
    ],
    iceCandidatePoolSize: 4,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
};

let CallContext = createContext(null);

// useContext hook
export let useCallContext = () => {
    let context = useContext(CallContext);
    if (!context) {
        throw new Error(
            "useCallContext must be used within a CallProvider",
        );
    }
    return context;
};

// Provider
export let CallProvider = ({ children }) => {
    let pendingRequests = useRef(new Map());
    let responseTimeout = 10000;

    // Context hooks
    let { encrypt_base64_using_aes, decrypt_base64_using_aes, get_shared_secret } = useEncryptionContext();
    let { privateKeyHash, privateKey } = useCryptoContext();
    let { ownUuid, get } = useUsersContext();
    let { receiver } = useMessageContext();
    let { message, wsSend } = useWebSocketContext();

    // Pre Call
    let [createCall, setCreateCall] = useState(false);
    let [invitedToCall, setInvitedToCall] = useState(false);
    let [inviteData, setInviteData] = useState({});
    let [inviteOnNewCall, setInviteOnNewCall] = useState(false);

    // Call Stuff
    let [clientPing, setClientPing] = useState("?");
    let [connected, setConnected] = useState(false);
    let [callId, setCallId] = useState(null);
    let [callSecret, setCallSecret] = useState(null);
    let [identified, setIdentified] = useState(false);

    // Streaming
    let [stream, setStream] = useState(false);
    let [streamResolution, setStreamResolution] = useState("1280x720");
    let [streamRefresh, setStreamRefresh] = useState("30");
    let [streamAudio, setStreamAudio] = useState(false);
    let screenStreamRef = useRef(null);

    // Audio
    let [mute, setMute] = useState(ls.get("call_mute") === "true" || false);
    let [deaf, setDeaf] = useState(ls.get("call_deaf") === "true" || false);
    let [outputDeviceId, setOutput] = useState(null);
    let [inputDeviceId, setInput] = useState(null);
    let sinkObserverRef = useRef(null);
    let currentSinkIdRef = useRef(null);
    let micRefs = useRef(new Map());
    let screenRefs = useRef(new Map());
    let watchingRefs = useRef(new Map());
    let videoRefs = useRef(new Map());
    let audioRefs = useRef(new Map());
    let audioStreamsRefs = useRef(new Map());

    // Directional Audio
    let [positions, setPositions] = useState({});
    let [audioPositions, setAudioPositions] = useState({});
    let [directionalAudio, setDirectionalAudio] = useState(false);
    let [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    let destinationNodeRef = useRef(null);
    let spatialAudioElRef = useRef(null);

    // Users
    let [connectedUsers, setConnectedUsers] = useState([]);
    let [streamingUsers, setStreamingUsers] = useState([]);
    let [watchingUsers, setWatchingUsers] = useState([]);

    let micStreamRef = useRef(null);
    let micRawStreamRef = useRef(null);
    let [inputSensitivity, setInputSensitivity] = useState(() => {
        let v = ls.get("call_input_sensitivity");
        let n = Number.isFinite(Number(v)) ? Number(v) : 70;
        return Math.min(100, Math.max(0, n));
    });
    let micCtxRef = useRef(null);
    let micMeterTimerRef = useRef(null);

    /// Audio
    let applySinkToAllAudios = useCallback(async (sinkId) => {
        try {
            let audios = Array.from(document.querySelectorAll('audio'));
            await Promise.all(audios.map(async (el) => {
                if (typeof el.setSinkId === 'function' && sinkId) {
                    try {
                        await el.setSinkId(sinkId);
                        try { el.dataset.sinkApplied = sinkId; } catch { /* ignore */ }
                    } catch { /* ignore */ }
                }
            }));
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        ls.set("call_input_sensitivity", String(inputSensitivity));
    }, [inputSensitivity]);

    useEffect(() => {
        if (outputDeviceId === null) {
            let output = ls.get("call_output");
            setOutput(output || "default");
        }
    }, [outputDeviceId]);

    useEffect(() => {
        if (!outputDeviceId) return;
        ls.set("call_output", outputDeviceId);
        currentSinkIdRef.current = outputDeviceId;
        applySinkToAllAudios(outputDeviceId);
    }, [outputDeviceId, applySinkToAllAudios]);

    // Apply sink to all audio elements
    useEffect(() => {
        if (sinkObserverRef.current) return;
        try {
            const processAudio = (el) => {
                try {
                    if (!el || el.dataset?.sinkApplied === currentSinkIdRef.current) return;
                    if (typeof el.setSinkId === 'function' && currentSinkIdRef.current) {
                        el.setSinkId(currentSinkIdRef.current).catch(() => { /* ignore */ });
                        el.dataset.sinkApplied = currentSinkIdRef.current;
                    }
                } catch { /* ignore */ }
            };

            let rafId = null;
            let pending = [];
            const schedule = () => {
                if (rafId) return;
                rafId = requestAnimationFrame(() => {
                    let batch = pending;
                    pending = [];
                    rafId = null;
                    for (let node of batch) {
                        if (node instanceof HTMLElement) {
                            node.querySelectorAll('audio').forEach(processAudio);
                        } else if (node instanceof HTMLMediaElement && node.tagName.toLowerCase() === 'audio') {
                            processAudio(node);
                        }
                    }
                });
            };

            sinkObserverRef.current = new MutationObserver((mutations) => {
                for (let m of mutations) {
                    m.addedNodes.forEach(node => {
                        pending.push(node);
                    });
                }
                schedule();
            });
            sinkObserverRef.current.observe(document.body, { childList: true, subtree: true });
            return () => {
                try { cancelAnimationFrame(rafId); } catch { }
                try { sinkObserverRef.current?.disconnect(); } catch { }
                sinkObserverRef.current = null;
            };
        } catch { /* ignore */ }
    }, []);

    /// Directional Audio
    let endUserDrag = useCallback((userId) => {
        setAudioPositions((prev) => {
            let next = { ...prev };
            let p = positions[userId];
            if (p) next[userId] = { x: p.x, y: p.y };
            return next;
        });
    }, [positions]);

    useEffect(() => {
        setAudioPositions((prev) => {
            let next = { ...prev };
            Object.keys(next).forEach((id) => {
                if (!connectedUsers.includes(id)) delete next[id];
            });
            connectedUsers.forEach((id) => {
                if (!next[id] && positions[id]) {
                    next[id] = { ...positions[id] };
                }
            });
            return next;
        });
    }, [connectedUsers, positions]);

    // mic switch
    let switchMicInput = useCallback(async (preferredId) => {
        try {
            let base = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }

            let constraints = preferredId && preferredId !== 'default'
                ? { audio: { deviceId: { exact: preferredId }, ...base } }
                : { audio: { ...base } };

            let rawStream = await navigator.mediaDevices.getUserMedia(constraints);
            try { micRawStreamRef.current?.getTracks().forEach(tr => tr.stop()); } catch { }
            micRawStreamRef.current = rawStream;

            rawStream.getAudioTracks().forEach(t => { t.enabled = !mute; });
            micStreamRef.current = rawStream;

            let newTrack = rawStream?.getAudioTracks?.()[0];
            if (newTrack) {
                for (let pc of micRefs.current.values()) {
                    try {
                        let sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                        if (sender) {
                            await sender.replaceTrack(newTrack);
                        } else {
                            pc.addTrack(newTrack, rawStream);
                        }
                    } catch { /* ignore per-peer errors */ }
                }
            }
        } catch (e) {
            logFunction(`Failed to switch mic input: ${e.message}`, 'error');
        }
    }, [mute]);

    useEffect(() => {
        if (inputDeviceId === null) {
            let input = ls.get("call_input");
            setInput(input || "default");
            return;
        }
        ls.set("call_input", inputDeviceId);
        if (connected) {
            switchMicInput(inputDeviceId);
        }
    }, [inputDeviceId, switchMicInput, connected]);

    // Reset all call-related state and close media/peer resources.
    function reset() {
        try { micStreamRef.current?.getTracks().forEach(track => track.stop()); } catch { }
        try { micRawStreamRef.current?.getTracks().forEach(track => track.stop()); } catch { }
        micRawStreamRef.current = null;
        try { clearInterval(micMeterTimerRef.current); } catch { }
        micMeterTimerRef.current = null;
        try { micCtxRef.current?.close(); } catch { }
        micCtxRef.current = null;
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        micRefs.current.clear();
        screenRefs.current.clear();
        watchingRefs.current.clear();
        audioRefs.current.clear();
        audioStreamsRefs.current.clear();
        setConnectedUsers([]);
        setStreamingUsers([]);
        setCreateCall(false);
        setCallId(null);
        setCallSecret(null);
        setIdentified(false);
        setClientPing("?");
        setConnected(false);
    }

    // Handle incoming call invitations.
    useEffect(() => {
        async function doStuff() {
            if (message.type === "new_call") {
                setInviteData({
                    callerId: message.data.sender_id,
                    callId: message.data.call_id,
                    callSecret: atob(await decrypt_base64_using_aes(
                        message.data.call_secret,
                        await get_shared_secret(
                            privateKey,
                            await get(message.data.sender_id)
                                .then(data => data.public_key)
                        )
                    )),
                })
                setInvitedToCall(true)
            }
        }
        doStuff();
    }, [message])

    // Mute
    let toggleMute = useCallback(() => {
        setMute((prevMute) => {
            let newMute = !prevMute;
            ls.set("call_mute", newMute);

            if (!newMute) {
                setDeaf(false);
                ls.set("call_deaf", false);
            }

            return newMute;
        });
    }, []);

    // Deaf
    let toggleDeaf = useCallback(() => {
        setDeaf((prevDeaf) => {
            let newDeaf = !prevDeaf;
            ls.set("call_deaf", newDeaf);

            if (newDeaf) {
                setMute(true);
                ls.set("call_mute", true);
            }

            return newDeaf;
        });
    }, []);

    // Get stream for id
    let getScreenStream = useCallback((id) => {
        if (!id) {
            return screenStreamRef.current;
        }
        return videoRefs.current.get(id);
    }, []);

    // Message Handling
    let handleWebSocketMessage = useCallback(async (event) => {
        let message = JSON.parse(event.data);

        if (message.type !== "pong") {
            logFunction(message, "debug", "Call WebSocket (Received):")
        }

        switch (message.type) {
            case "client_connected":
                createP2PConnection(message.data.user_id, true);
                break;

            case "client_closed":
                if (screenRefs.current.has(message.data.user_id)) {
                    let screenPc = screenRefs.current.get(message.data.user_id);
                    screenPc.close();
                    screenRefs.current.delete(message.data.user_id);
                }

                if (watchingRefs.current.has(message.data.user_id)) {
                    let screenPc = watchingRefs.current.get(message.data.user_id);
                    screenPc.close();
                    watchingRefs.current.delete(message.data.user_id);
                }

                if (micRefs.current.has(message.data.user_id)) {
                    let micPc = micRefs.current.get(message.data.user_id);
                    micPc.close();
                    micRefs.current.delete(message.data.user_id);
                }

                audioRefs.current.delete(message.data.user_id);
                audioStreamsRefs.current.delete(message.data.user_id);

                setConnectedUsers((prev) => prev.filter(userId => userId !== message.data.user_id));
                setStreamingUsers((prev) => prev.filter(userId => userId !== message.data.user_id));
                break;

            case "webrtc_sdp":
                let sdp_sender = message.data.sender_id;
                let sdp_isScreenShare = message.data.screen_share;
                let sdp_isWatcher = message.data.watcher;
                let sdp_payload;

                try {
                    sdp_payload = atob(await decrypt_base64_using_aes(message.data.payload, callSecret));
                } catch (err) {
                    log(
                        `${sdp_sender}: ${err.message}`,
                        "error",
                        "Voice WebSocket:",
                    );
                    return;
                }

                let sdp_pc;
                if (sdp_isScreenShare) {
                    if (sdp_isWatcher) {
                        sdp_pc = watchingRefs.current.get(sdp_sender)
                    } else {
                        sdp_pc = screenRefs.current.get(sdp_sender);
                    }
                } else {
                    sdp_pc = micRefs.current.get(sdp_sender);
                }

                if (!sdp_pc) {
                    sdp_pc = await createP2PConnection(sdp_sender, false, sdp_isScreenShare);
                }

                try {
                    let sdp_obj = new RTCSessionDescription(
                        JSON.parse(sdp_payload),
                    );
                    await sdp_pc.setRemoteDescription(sdp_obj);
                    if (sdp_obj.type === "offer") {
                        let answer = await sdp_pc.createAnswer({
                            offerToReceiveAudio: !sdp_isScreenShare,
                            offerToReceiveVideo: sdp_isScreenShare,
                        });

                        await sdp_pc.setLocalDescription(answer);

                        send("webrtc_sdp", {
                            message: "Sending SDP Answer",
                            log_level: 0,
                        }, {
                            payload: await encrypt_base64_using_aes(
                                btoa(JSON.stringify(answer)),
                                callSecret,
                            ),
                            screen_share: sdp_isScreenShare,
                            watcher: !sdp_isWatcher,
                            receiver_id: sdp_sender,
                        }, false)

                        log(
                            `Answer sent to ${sdp_sender}`,
                            "success",
                        );
                    }
                } catch (error) {
                    log(
                        `SDP Error (${sdp_sender}): ${error}`,
                        "error",
                        "Voice WebSocket:",
                    );
                }

                break;

            case "webrtc_ice":
                let ice_sender = message.data.sender_id;
                let ice_isScreenShare = message.data.screen_share;
                let ice_isWatcher = message.data.watcher;
                let ice_payload;

                try {
                    ice_payload = atob(await decrypt_base64_using_aes(message.data.payload, callSecret));
                } catch (err) {
                    logFunction(`${ice_sender}: ${err.message}`, "error", "Voice WebSocket:");
                    return;
                }

                let ice_pc;
                if (ice_isScreenShare) {
                    if (ice_isWatcher) {
                        ice_pc = watchingRefs.current.get(ice_sender);
                    } else {
                        ice_pc = screenRefs.current.get(ice_sender);
                    }
                } else {
                    ice_pc = micRefs.current.get(ice_sender);
                }

                if (ice_pc && ice_payload) {
                    try {
                        await ice_pc.addIceCandidate(
                            new RTCIceCandidate(JSON.parse(ice_payload)),
                        );
                    } catch (err) {
                        log(err.message, "error", "Voice WebSocket:");
                    }
                } else {
                    log(
                        `No peer connection found for ${ice_sender} or ICE payload is empty.`,
                        "warning",
                        "Voice WebSocket:",
                    );
                }

                break;

            case "start_stream":
                setStreamingUsers((prev) => {
                    if (!prev.includes(message.data.user_id)) {
                        return [...prev, message.data.user_id];
                    }
                    return prev;
                });
                break;

            case "end_stream":
                setStreamingUsers((prev) => prev.filter(userId => userId !== message.data.user_id));
                break;

            case "watch_stream":
                if (message.data.want_to_watch) {
                    logFunction("User wants to watch you", "info")
                    createP2PConnection(message.data.sender_id, true, true);
                } else {
                    logFunction("User allowed you to watch them", "info")
                    await createP2PConnection(message.data.sender_id, false, true);
                    setWatchingUsers((prev) => [...prev, message.data.sender_id])
                }
                break;

            default:
                break;
        }

        if (message.id && pendingRequests.current.has(message.id)) {
            let { resolve, reject, timeoutId } = pendingRequests.current.get(message.id);
            clearTimeout(timeoutId);
            pendingRequests.current.delete(message.id);

            if (message.type !== 'error' || !identified) {
                resolve(message);
            } else {
                reject(new Error(`Received unknown response type '${message.type}' for request ID '${message.id}'.`));
            }
        } else logFunction(message.log.message, "info");
    }, [callSecret, decrypt_base64_using_aes, encrypt_base64_using_aes, identified]);

    // Init WebSocket
    let { sendMessage, readyState } = useWebSocket(
        createCall && callId && callSecret ? endpoint.call_wss : null,
        {
            onOpen: async () => {
                logFunction("Call connected", "info");
                if (mute) toggleMute();
                try {
                    let preferredId = inputDeviceId ?? ls.get('call_input') ?? 'default';
                    await switchMicInput(preferredId);
                } catch { /* handled inside switchMicInput */ }
                setConnectedUsers([ownUuid]);
            },
            onClose: () => {
                logFunction("Call disconnected", "info");
                try { micStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
                micStreamRef.current = null;
                pendingRequests.current.forEach(({ reject, timeoutId }) => {
                    clearTimeout(timeoutId);
                    reject(
                        new Error('Call WebSocket connection closed before response was received.')
                    );
                });
                pendingRequests.current.clear();

                setConnected(false);
                setIdentified(false);
                micRefs.current.clear();
                screenRefs.current.clear();
                audioRefs.current.clear();
                audioStreamsRefs.current.clear();
            },
            onMessage: handleWebSocketMessage,
            shouldReconnect: () => createCall && callId && callSecret,
            share: true,
            reconnectAttempts: 5,
            reconnectInterval: 3000,
        }
    );

    // Send Function
    let send = useCallback(async (requestType, log, data = {}, awaitResponse = true) => {
        if (readyState !== ReadyState.CLOSED && readyState !== ReadyState.CLOSING) {
            if (awaitResponse) {
                return new Promise((resolve, reject) => {
                    let id = v7();

                    let messageToSend = {
                        id,
                        type: requestType,
                        log,
                        data,
                    };

                    if (messageToSend.type !== "ping") {
                        logFunction(messageToSend, "debug", "Call WebSocket (Sent):")
                    }

                    let timeoutId = setTimeout(() => {
                        pendingRequests.current.delete(id);
                        let timeoutError = new Error(`Call WebSocket request timed out for ID: ${id} (Type: ${requestType}) after ${responseTimeout}ms.`);
                        reject(timeoutError);
                    }, responseTimeout);

                    pendingRequests.current.set(id, { resolve, reject, timeoutId });

                    try {
                        sendMessage(JSON.stringify(messageToSend));
                    } catch (e) {
                        clearTimeout(timeoutId);
                        pendingRequests.current.delete(id);
                        let sendError = new Error(`Failed to send Call WebSocket message: ${e.message}`);
                        logFunction(sendError, 'error');
                        reject(sendError);
                    }
                });
            } else {
                let messageToSend = {
                    type: requestType,
                    log,
                    data,
                };

                if (messageToSend.type !== "ping") {
                    logFunction(messageToSend, "debug", "Call WebSocket (Sent):")
                }

                sendMessage(JSON.stringify(messageToSend));
            }
        } else {
            logFunction("Call WebSocket not connected", "warning", "Voice WebSocket:");
        }
    }, [sendMessage, readyState]);

    // Start stream
    let startScreenStream = useCallback(async () => {
        if (stream || screenStreamRef.current) return screenStreamRef.current;
        try {
            let [wStr, hStr] = String(streamResolution).split("x");
            let widthNum = parseInt(wStr, 10) || undefined;
            let heightNum = parseInt(hStr, 10) || undefined;
            let frameNum = parseInt(String(streamRefresh), 10) || undefined;
            let stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: frameNum ? { ideal: frameNum } : undefined,
                    width: widthNum ? { exact: widthNum } : undefined,
                    height: heightNum ? { exact: heightNum } : undefined,
                    displaySurface: "monitor",
                },
                audio: streamAudio
            });


            screenStreamRef.current = stream;
            setStream(true);

            setStreamingUsers((prev) => {
                if (!prev.includes(ownUuid)) {
                    return [...prev, ownUuid];
                }
                return prev;
            });

            send("start_stream", {
                message: "User started screen sharing",
                log_level: 0
            }, {
                user_id: ownUuid,
            }, false);

            async function addScreenShareToPeers() {
                let addPromises = Array.from(watchingRefs.current.entries()).map(async ([id, pc]) => {
                    try {
                        if (pc.connectionState !== 'connected' || pc.signalingState !== 'stable') {
                            return;
                        }

                        let videoTrack = stream.getVideoTracks()[0];
                        let audioTracks = stream.getAudioTracks();

                        let transceivers = pc.getTransceivers();
                        let videoTransceiver = transceivers.find(t =>
                            t.receiver && t.receiver.track && t.receiver.track.kind === 'video'
                        ) || transceivers.find(t => t.mid !== null && t.direction.includes('recv'));

                        if (videoTransceiver && videoTrack) {
                            await videoTransceiver.sender.replaceTrack(videoTrack);
                            videoTransceiver.direction = 'sendrecv';
                        }

                        audioTracks.forEach(track => {
                            pc.addTrack(track, stream);
                        });
                    } catch (err) {
                        logFunction(`Failed to add screen tracks to peer ${id}: ${err.message}`, "error", "Voice WebSocket:");
                    }
                });

                await Promise.allSettled(addPromises);
            }; await addScreenShareToPeers();

            stream.getVideoTracks()[0].addEventListener('ended', () => {
                stopScreenStream();
            });

            logFunction("Screen share started", "success");
            return stream;
        } catch (err) {
            setStream(false);
            log(err.message, "error");
        }
    }, [ownUuid, send]);

    // Stop stream
    let stopScreenStream = useCallback(() => {
        if (!screenStreamRef.current) {
            return;
        }

        setStreamingUsers((prev) => prev.filter(userId => userId !== ownUuid));

        send("end_stream", {
            message: "User stopped screen sharing",
            log_level: 0
        }, {
            user_id: ownUuid,
        }, false);

        let tracksToRemove = screenStreamRef.current.getTracks().map(track => ({
            id: track.id,
            kind: track.kind
        }));

        screenStreamRef.current.getTracks().forEach(track => {
            track.stop();
        });

        let removePromises = Array.from(watchingRefs.current.entries()).map(async ([id, pc]) => {
            try {
                if (pc.connectionState === 'closed') return;

                let transceivers = pc.getTransceivers();
                let trackRemoved = false;

                tracksToRemove.forEach(trackInfo => {
                    if (trackInfo.kind === 'video') {
                        let videoTransceiver = transceivers.find(t =>
                            t.sender.track && t.sender.track.id === trackInfo.id
                        );

                        if (videoTransceiver) {
                            try {
                                videoTransceiver.sender.replaceTrack(null);
                                videoTransceiver.direction = 'recvonly';
                                trackRemoved = true;
                            } catch (err) {
                                logFunction(`Error resetting video transceiver for peer ${id}: ${err.message}`, "error", "Voice WebSocket:");
                            }
                        }
                    } else {
                        let senders = pc.getSenders();
                        let sender = senders.find(s => s.track && s.track.id === trackInfo.id);
                        if (sender) {
                            try {
                                pc.removeTrack(sender);
                                trackRemoved = true;
                            } catch (err) {
                                logFunction(`Error removing ${trackInfo.kind} track from peer ${id}: ${err.message}`, "error", "Voice WebSocket:");
                            }
                        }
                    }
                });

                if (trackRemoved && pc.signalingState === 'stable' && pc.connectionState === 'connected') {
                    await pc.setLocalDescription(pc.localDescription);
                }
            } catch (err) {
                logFunction(`Error stopping screen stream for peer ${id}: ${err.message}`, "error", "Voice WebSocket:");
            }
        });

        Promise.allSettled(removePromises);
        screenStreamRef.current = null;
        setStream(false);
    }, [ownUuid, send])

    // Derived settings for screen stream constraints (width/height/fps).
    const parsedStreamSettings = useMemo(() => {
        let [wStr, hStr] = String(streamResolution).split("x");
        return {
            widthNum: parseInt(wStr, 10) || undefined,
            heightNum: parseInt(hStr, 10) || undefined,
            frameNum: parseInt(String(streamRefresh), 10) || undefined,
        };
    }, [streamResolution, streamRefresh]);

    // Apply updated constraints to an active screen video track.
    let updateStream = useCallback(() => {
        if (!stream) return;
        let track = screenStreamRef.current?.getVideoTracks?.()?.[0];
        if (!track) return;
        let { widthNum, heightNum, frameNum } = parsedStreamSettings;
        let constraints = {};
        if (frameNum) constraints.frameRate = { ideal: frameNum, max: frameNum };
        if (widthNum) constraints.width = { ideal: widthNum, max: widthNum };
        if (heightNum) constraints.height = { ideal: heightNum, max: heightNum };

        let handle = requestAnimationFrame(() => {
            Promise.resolve().then(async () => {
                try {
                    await track.applyConstraints(constraints);
                } catch (err) {
                    log(err.message, "showError");
                }
            });
        });
        return () => cancelAnimationFrame(handle);
    }, [stream, parsedStreamSettings]);

    // p2p connections
    let createP2PConnection = useCallback(async (id, isInitiator = false, isScreenShare = false) => {
        if (isScreenShare) {
            if (isInitiator) {
                if (watchingRefs.current.has(id)) {
                    logFunction("Reusing existing watching connection", "debug", "Voice WebSocket:");
                    return watchingRefs.current.get(id);
                }
            } else {
                if (screenRefs.current.has(id)) {
                    logFunction("Reusing existing screen connection", "debug", "Voice WebSocket:");
                    return screenRefs.current.get(id);
                }
            }
        } else {
            if (micRefs.current.has(id)) {
                logFunction("Reusing existing mic connection", "debug", "Voice WebSocket:");
                return micRefs.current.get(id);
            }
        }

        let pc = new RTCPeerConnection(webrtc_servers);

        if (isScreenShare) {
            if (isInitiator) {
                watchingRefs.current.set(id, pc);
            } else {
                screenRefs.current.set(id, pc);
            }
        } else {
            micRefs.current.set(id, pc);
        }

        if (micStreamRef.current && !isScreenShare) {
            micStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, micStreamRef.current);
            });
        }

        if (screenStreamRef.current && isScreenShare && isInitiator) {
            screenStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, screenStreamRef.current);
            });
        }

        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                send("webrtc_ice", {
                    message: "Sending ICE Candidate",
                    log_level: 0
                }, {
                    payload: await encrypt_base64_using_aes(
                        btoa(JSON.stringify(event.candidate)),
                        callSecret,
                    ),
                    screen_share: isScreenShare,
                    watcher: !isInitiator,
                    receiver_id: id,
                }, false);
            }
        };

        pc.ontrack = (event) => {
            event.track.onended = async () => {
                if (isScreenShare) {
                    if (isInitiator) {
                        let stream = watchingRefs.current.get(id);
                        if (stream) {
                            stream.removeTrack(event.track);
                        };
                    } else {
                        let stream = screenRefs.current.get(id);
                        if (stream) {
                            stream.removeTrack(event.track);
                        };
                    }
                } else {
                    let stream = audioStreamsRefs.current.get(id);
                    if (stream) {
                        stream.removeTrack(event.track);
                    };
                }
            }

            if (isScreenShare && !isInitiator) {
                let stream = videoRefs.current.get(id);
                if (!stream) {
                    stream = new MediaStream();
                    videoRefs.current.set(id, stream);
                }

                event.track.enabled = true;
                stream.addTrack(event.track);
            } else {
                let stream = audioStreamsRefs.current.get(id);
                if (!stream) {
                    stream = new MediaStream();
                    audioStreamsRefs.current.set(id, stream);
                }

                event.track.enabled = true;
                stream.addTrack(event.track);

                let audioElement = audioRefs.current.get(id);
                if (audioElement && stream instanceof MediaStream) {
                    audioElement.srcObject = stream;
                    logFunction(`Set audio stream for user ${id} (immediate)`, "debug");
                } else if (audioElement && stream) {
                    logFunction(`Invalid stream type for user ${id}: ${typeof stream}`, "warning");
                } else {
                    logFunction(`Audio element not yet available for user ${id}, will be set when element is created`, "debug");
                }

            }
        };

        if (isInitiator) {
            let negotiationInProgress = false;

            if (isScreenShare) {
                send("watch_stream", {
                    message: `${ownUuid} allowed ${id} to watch`,
                    log_level: 0,
                }, {
                    want_to_watch: false,
                    receiver_id: id,
                }, false)
            }

            pc.onnegotiationneeded = async () => {
                if (pc.signalingState !== "stable" || negotiationInProgress) {
                    return;
                }

                if (pc.remoteDescription) {
                    return;
                }

                negotiationInProgress = true;

                try {
                    let offer = await pc.createOffer({
                        offerToReceiveAudio: !isScreenShare,
                        offerToReceiveVideo: isScreenShare,
                    });

                    if (pc.signalingState !== "stable") {
                        return;
                    }

                    await pc.setLocalDescription(offer);

                    send("webrtc_sdp", {
                        message: "Sending SDP Offer",
                        log_level: 0
                    }, {
                        payload: await encrypt_base64_using_aes(
                            btoa(JSON.stringify(offer)),
                            callSecret,
                        ),
                        screen_share: isScreenShare,
                        watcher: false,
                        receiver_id: id,
                    }, false);
                } finally {
                    negotiationInProgress = false;
                }
            }
        }

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                if (isScreenShare) {
                    if (isInitiator) {
                        watchingRefs.current.delete(id);
                    } else {
                        screenRefs.current.delete(id);
                    }
                } else {
                    micRefs.current.delete(id);
                    audioRefs.current.delete(id);
                    audioStreamsRefs.current.delete(id);
                }
            } else if (pc.connectionState === "connected") {
                logFunction(`Connected to ${id}`, "success");
                setConnectedUsers((prev) => {
                    if (!prev.includes(id)) {
                        return [...prev, id];
                    }
                    return prev;
                });

                if (!isScreenShare) {
                    requestAnimationFrame(() => {
                        let audioElement = audioRefs.current.get(id);
                        let stream = audioStreamsRefs.current.get(id);
                        if (audioElement && stream && stream instanceof MediaStream) {
                            audioElement.srcObject = stream;
                            logFunction(`Set audio stream for user ${id}`, "debug");
                        } else if (audioElement && stream) {
                            logFunction(`Invalid stream type for user ${id}: ${typeof stream}`, "warning");
                        }
                    });
                }
            }
        };

        return pc;
    }, [send, webrtc_servers, encrypt_base64_using_aes, callSecret]);

    // Start call
    let startCall = useCallback(async (shouldInviteReceiver, id, secret) => {
        reset();
        setTimeout(() => {
            if (id && secret) {
                setCallId(id);
                setCallSecret(secret);
            }
            setCreateCall(true);
            setInviteOnNewCall(shouldInviteReceiver);
        }, 100)
    }, [])

    // Stop call
    let stopCall = useCallback(() => {
        reset();
    }, [])

    // Update connected boolean
    useEffect(() => {
        if (micStreamRef.current && readyState === ReadyState.OPEN) {
            setConnected(true);
        } else {
            setConnected(false);
        }
    }, [readyState, micStreamRef.current]);

    // Pings
    useEffect(() => {
        let interval;
        if (connected) {
            interval = setInterval(async () => {
                let time = Date.now()
                await send("ping",
                    {
                        message: "Ping from Client",
                        log_level: -1
                    },
                    {
                        last_ping: typeof (clientPing) === "string" ? 0 : clientPing,
                    }
                ).then(() => {
                    let newTime = Date.now()
                    setClientPing(newTime - time)
                })
                    .catch(err => {
                        logFunction(err.message, "info")
                    })
            }, 5000);
        } else {
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [connected, send]);

    // Identifications (Also call invite)
    useEffect(() => {
        async function sendIdentification() {
            if (connected) {
                send("identification",
                    {
                        message: "Client identifying",
                        log_level: 0
                    },
                    {
                        call_id: callId,
                        user_id: ownUuid,
                        private_key_hash: privateKeyHash,
                        call_secret_sha: await sha256(callSecret),
                    })
                    .then(async data => {
                        if (data.type === "identification_response") {
                            setIdentified(true);
                            let newStreamingUsers = [];
                            Object.keys(data.data.user_states).forEach((id) => {
                                if (data.data.user_states[id].streaming) {
                                    newStreamingUsers.push(id);
                                }
                            });
                            setStreamingUsers(newStreamingUsers);
                            if (inviteOnNewCall) {
                                let publicKey;
                                if (receiver !== "") {
                                    publicKey = await get(receiver).then(data => { return data.public_key })
                                    await wsSend(
                                        "call_invite",
                                        {
                                            message: `Invited ${receiver} to the call ${callId}`,
                                            log_level: 0,
                                        },
                                        {
                                            receiver_id: receiver,
                                            call_id: callId,
                                            call_secret: await encrypt_base64_using_aes(
                                                btoa(callSecret),
                                                await get_shared_secret(privateKey, publicKey),
                                            ),
                                            call_secret_sha: await sha256(callSecret),
                                        },
                                    ).then(data => {
                                        if (data.type !== "error") {
                                            log("Sent Invite", "success");
                                        } else {
                                            log(data.log.message, "showError");
                                        }
                                    })
                                }
                            };
                        } else {
                            setIdentified(false);
                        }
                    })
            } else {
                setIdentified(false);
            }
        }

        sendIdentification();
    }, [connected, send]);

    // Mute
    useEffect(() => {
        if (micStreamRef.current) {
            micStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !mute;
            });
        }
    }, [mute]);

    // Stream updates
    useEffect(() => {
        let cancel = updateStream();
        return () => { try { cancel?.(); } catch { } };
    }, [updateStream])

    // Cleanup
    useEffect(() => {
        return () => {
            try { sinkObserverRef.current?.disconnect(); } catch { }
            sinkObserverRef.current = null;
            pendingRequests.current.forEach(({ reject, timeoutId }) => {
                clearTimeout(timeoutId);
                let unmountError = new Error('WebSocket provider unmounted before response was received.');
                logFunction(unmountError.toString(), 'error');
                reject(unmountError);
            });
            pendingRequests.current.clear();

            reset();
        };
    }, []);

    return (
        <CallContext.Provider value={{
            callId,
            setCallId,
            callSecret,
            setCallSecret,
            voiceSend: send,

            clientPing,
            connected,
            startCall,
            stopCall,
            invitedToCall,
            setInvitedToCall,
            inviteData,
            setInviteData,

            mute,
            toggleMute,

            deaf,
            toggleDeaf,

            stream,
            streamResolution,
            setStreamResolution,
            streamRefresh,
            setStreamRefresh,
            streamAudio,
            setStreamAudio,
            startScreenStream,
            stopScreenStream,
            getScreenStream,
            watchingUsers,
            setWatchingUsers,

            createP2PConnection,

            connectedUsers,
            streamingUsers,

            inputDeviceId,
            setInput,
            outputDeviceId,
            setOutput,

            directionalAudio,
            setDirectionalAudio,
            inputSensitivity,
            setInputSensitivity,
            positions,
            setPositions,
            audioPositions,
            setAudioPositions,
            canvasSize,
            setCanvasSize,
            endUserDrag,
        }}>
            <div hidden>
                <audio
                    ref={(el) => {
                        spatialAudioElRef.current = el || null;
                        try {
                            if (el && destinationNodeRef.current) {
                                el.srcObject = destinationNodeRef.current.stream;
                                if (typeof el.setSinkId === 'function' && currentSinkIdRef.current) {
                                    el.setSinkId(currentSinkIdRef.current).catch(() => { });
                                }
                            }
                        } catch { }
                    }}
                    autoPlay
                    muted={deaf}
                />
                {connected ? connectedUsers.map((id) => (
                    <audio
                        key={id}
                        ref={(el) => {
                            if (el) {
                                audioRefs.current.set(id, el);
                                let stream = audioStreamsRefs.current.get(id);
                                if (stream && stream instanceof MediaStream) {
                                    el.srcObject = stream;
                                } else if (stream) {
                                    logFunction(`Invalid stream type for user ${id}: ${typeof stream}`, "warning");
                                }
                                try {
                                    if (typeof el.setSinkId === 'function' && currentSinkIdRef.current) {
                                        el.setSinkId(currentSinkIdRef.current).catch(() => { });
                                    }
                                } catch { }
                            } else {
                                audioRefs.current.delete(id);
                            }
                        }}
                        autoPlay
                        muted={deaf}
                    />
                )) : null}
            </div>
            {children}
        </CallContext.Provider>
    );
};
