"use client";

// Package Imports
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { v7 } from "uuid"

// Lib Imports
import { log, log as logFunction, sha256 } from "@/lib/utils";
import { endpoint } from "@/lib/endpoints";
import ls from "@/lib/localStorageManager";

// Context Imports
import { useCryptoContext } from "@/components/context/crypto";
import { useUsersContext } from "@/components/context/users";
import { useEncryptionContext } from "@/components/context/encryption";
import { useWebSocketContext } from "@/components/context/websocket";
import { useMessageContext } from "@/components/context/message";

// Config
let webrtc_servers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.l.google.com:5349" },
        { urls: "stun:stun1.l.google.com:3478" },
        { urls: "stun:stun1.l.google.com:5349" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:5349" },
        { urls: "stun:stun3.l.google.com:3478" },
        { urls: "stun:stun3.l.google.com:5349" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:5349" }
    ],
    iceCandidatePoolSize: 10,
};

// Main
let CallContext = createContext(null);

// Use Context Function
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
    // WebSocket Send Function
    let pendingRequests = useRef(new Map());
    let responseTimeout = 10000;

    // Basic Functions
    let { encrypt_base64_using_aes, decrypt_base64_using_aes, decrypt_base64_using_privkey, encrypt_base64_using_pubkey } = useEncryptionContext();
    let { privateKeyHash, privateKey } = useCryptoContext();
    let { ownUuid, get } = useUsersContext();
    let { receiver } = useMessageContext();
    let { message, wsSend } = useWebSocketContext();

    // Calling Stuff
    let [createCall, setCreateCall] = useState(false);
    let [invitedToCall, setInvitedToCall] = useState(false);
    let [inviteData, setInviteData] = useState({});
    let [inviteOnNewCall, setInviteOnNewCall] = useState(false);

    let [clientPing, setClientPing] = useState("?");
    let [connected, setConnected] = useState(false);

    let [callId, setCallId] = useState(null);
    let [callSecret, setCallSecret] = useState(null);
    let [identified, setIdentified] = useState(false);

    let [mute, setMute] = useState(ls.get("call_mute") === "true" || false);
    let [deaf, setDeaf] = useState(ls.get("call_deaf") === "true" || false);
    let [stream, setStream] = useState(false);
    let [streamResolution, setStreamResolution] = useState("1280x720");
    let [streamRefresh, setStreamRefresh] = useState("30");
    let [streamAudio, setStreamAudio] = useState(false);

    let [positions, setPositions] = useState({});
    let [directionalAudio, setDirectionalAudio] = useState(false);
    // Canvas size for spatial orientation
    let [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // WebRTC
    let [outputDeviceId, setOutput] = useState(null);
    let [inputDeviceId, setInput] = useState(null);

    let micStreamRef = useRef(null);
    // Keep original mic stream separate from processed stream
    let micRawStreamRef = useRef(null);
    let screenStreamRef = useRef(null);

    // Keep a persistent observer to apply output device to all audio elements
    let sinkObserverRef = useRef(null);
    let currentSinkIdRef = useRef(null);

    let micRefs = useRef(new Map());
    let screenRefs = useRef(new Map());
    let watchingRefs = useRef(new Map());
    let videoRefs = useRef(new Map());
    let audioRefs = useRef(new Map());
    let audioStreamsRefs = useRef(new Map());

    // Users state (must be declared before spatial hooks reference it)
    let [connectedUsers, setConnectedUsers] = useState([]);
    let [streamingUsers, setStreamingUsers] = useState([]);
    let [watchingUsers, setWatchingUsers] = useState([]);

    // Spatial/directional audio (Web Audio API)
    let audioContextRef = useRef(null);
    let masterGainRef = useRef(null);
    let destinationNodeRef = useRef(null); // MediaStreamAudioDestinationNode
    let spatialAudioElRef = useRef(null); // <audio> that plays the mixed stream (for setSinkId)
    let spatialNodesRef = useRef(new Map()); // id -> { source, panner, gain }
    let spatialEnabledRef = useRef(false);

    // Mic processing (input sensitivity gating)
    let [inputSensitivity, setInputSensitivity] = useState(() => {
        let v = ls.get("call_input_sensitivity");
        let n = Number.isFinite(Number(v)) ? Number(v) : 60; // default more sensitive
        return Math.min(100, Math.max(0, n));
    });
    let micCtxRef = useRef(null);
    let micSourceRef = useRef(null);
    let micAnalyserRef = useRef(null);
    let micGateGainRef = useRef(null);
    let micDestRef = useRef(null);
    let micMeterTimerRef = useRef(null);
    let micGateOpenRef = useRef(false);
    let micLastBelowRef = useRef(0);
    let micThresholdRef = useRef(0.02); // RMS threshold; updated from sensitivity

    let computeThresholdFromSensitivity = useCallback((s) => {
        // Map 0..100 (low..high sensitivity) to RMS 0.1..0.003 (high..low threshold)
        // Higher sensitivity => lower threshold
        let minTh = 0.003; // most sensitive
        let maxTh = 0.1;   // least sensitive
        let t = (100 - Math.min(100, Math.max(0, s))) / 100; // 1..0 as sensitivity grows
        // Exponential interpolate for perceptual smoothness
        let th = Math.exp(Math.log(maxTh) * t + Math.log(minTh) * (1 - t));
        return th;
    }, []);

    // Update threshold whenever sensitivity changes
    useEffect(() => {
        micThresholdRef.current = computeThresholdFromSensitivity(inputSensitivity);
        ls.set("call_input_sensitivity", String(inputSensitivity));
    }, [inputSensitivity, computeThresholdFromSensitivity]);

    // Build or rebuild mic processing graph for a raw getUserMedia() stream
    let setupMicProcessing = useCallback(async (rawStream) => {
        // Cleanup old graph
        try { clearInterval(micMeterTimerRef.current); } catch { }
        micMeterTimerRef.current = null;
        try { micCtxRef.current?.close(); } catch { }
        micCtxRef.current = null;
        micSourceRef.current = null;
        micAnalyserRef.current = null;
        micGateGainRef.current = null;
        micDestRef.current = null;

        // Create new graph
        let AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
            // Fallback: no processing, use raw stream
            micStreamRef.current = rawStream;
            return rawStream;
        }

        let ctx = new AC();
        micCtxRef.current = ctx;

        let src = ctx.createMediaStreamSource(rawStream);
        let gateGain = ctx.createGain();
        gateGain.gain.value = 1.0;
        let analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.2;
        let dest = ctx.createMediaStreamDestination();

        // Connect: source -> gate -> dest
        src.connect(gateGain).connect(dest);
        // Branch for analysis (doesn't affect signal)
        src.connect(analyser);

        micSourceRef.current = src;
        micGateGainRef.current = gateGain;
        micAnalyserRef.current = analyser;
        micDestRef.current = dest;

        // Start meter + gate loop
        let buffer = new Float32Array(analyser.fftSize);
        micGateOpenRef.current = false;
        micLastBelowRef.current = performance.now();
        let holdMs = 200; // keep gate open this long after dropping below threshold
        let closeGain = 0.0001;

        micMeterTimerRef.current = setInterval(() => {
            try {
                analyser.getFloatTimeDomainData(buffer);
                let sumSq = 0;
                for (let i = 0; i < buffer.length; i++) {
                    let v = buffer[i];
                    sumSq += v * v;
                }
                let rms = Math.sqrt(sumSq / buffer.length);
                let threshold = micThresholdRef.current;

                let now = performance.now();
                if (!micGateOpenRef.current) {
                    if (rms >= threshold) {
                        micGateOpenRef.current = true;
                        micGateGainRef.current.gain.setTargetAtTime(1.0, ctx.currentTime, 0.02);
                    }
                } else {
                    if (rms < threshold * 0.7) { // close with a bit of hysteresis
                        if ((now - micLastBelowRef.current) >= holdMs) {
                            micGateOpenRef.current = false;
                            micGateGainRef.current.gain.setTargetAtTime(closeGain, ctx.currentTime, 0.05);
                        }
                    } else {
                        micLastBelowRef.current = now;
                    }
                }
            } catch { /* ignore meter errors */ }
        }, 50);

        // Use processed stream for sending
        let processed = dest.stream;
        // Respect current mute state
        processed.getAudioTracks().forEach(t => { t.enabled = !mute; });
        micStreamRef.current = processed;
        return processed;
    }, [mute]);

    // Create or ensure the Web Audio graph exists
    let ensureSpatialAudioGraph = useCallback(() => {
        if (!audioContextRef.current) {
            let AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            audioContextRef.current = new AC();
        }
        if (!masterGainRef.current && audioContextRef.current) {
            masterGainRef.current = audioContextRef.current.createGain();
            masterGainRef.current.gain.value = 1.0;
        }
        if (!destinationNodeRef.current && audioContextRef.current) {
            destinationNodeRef.current = audioContextRef.current.createMediaStreamDestination();
        }
        if (audioContextRef.current && masterGainRef.current && destinationNodeRef.current) {
            try { masterGainRef.current.disconnect(); } catch { }
            try { masterGainRef.current.connect(destinationNodeRef.current); } catch { }
        }
        // Attach destination stream to hidden audio element for device routing
        if (spatialAudioElRef.current && destinationNodeRef.current) {
            try {
                if (spatialAudioElRef.current.srcObject !== destinationNodeRef.current.stream) {
                    spatialAudioElRef.current.srcObject = destinationNodeRef.current.stream;
                }
                if (typeof spatialAudioElRef.current.setSinkId === 'function' && currentSinkIdRef.current) {
                    spatialAudioElRef.current.setSinkId(currentSinkIdRef.current).catch(() => { });
                }
            } catch { /* ignore */ }
        }
        // Listener orientation defaults: facing -Z
        try {
            let ctx = audioContextRef.current;
            let now = ctx.currentTime;
            if (ctx.listener.forwardX) {
                ctx.listener.forwardX.setValueAtTime(0, now);
                ctx.listener.forwardY.setValueAtTime(0, now);
                ctx.listener.forwardZ.setValueAtTime(-1, now);
                ctx.listener.upX.setValueAtTime(0, now);
                ctx.listener.upY.setValueAtTime(1, now);
                ctx.listener.upZ.setValueAtTime(0, now);
            } else if (ctx.listener.setOrientation) {
                ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);
            }
        } catch { /* ignore */ }
    }, []);

    // Build spatial nodes for a specific user stream
    let buildSpatialNodesForUser = useCallback((userId) => {
        if (!audioContextRef.current || !masterGainRef.current) return;
        let stream = audioStreamsRefs.current.get(userId);
        if (!stream || !(stream instanceof MediaStream)) return;

        // If already built and same stream object, skip
        let existing = spatialNodesRef.current.get(userId);
        if (existing && existing.stream === stream) return existing;

        // Clean previous if any
        if (existing) {
            try { existing.source.disconnect(); } catch { }
            try { existing.panner.disconnect(); } catch { }
            try { existing.gain.disconnect(); } catch { }
            spatialNodesRef.current.delete(userId);
        }

        let ctx = audioContextRef.current;
        let source = ctx.createMediaStreamSource(stream);
        let panner = new PannerNode(ctx, {
            panningModel: 'HRTF',
            distanceModel: 'inverse',
            refDistance: 1,
            maxDistance: 10000,
            rolloffFactor: 1,
            coneInnerAngle: 360,
            coneOuterAngle: 0,
            coneOuterGain: 0,
        });
        let gain = ctx.createGain();
        gain.gain.value = 1.0;

        source.connect(panner).connect(gain).connect(masterGainRef.current);

        let node = { source, panner, gain, stream };
        spatialNodesRef.current.set(userId, node);
        return node;
    }, []);

    // Map 2D positions -> WebAudio 3D and apply to panners
    let updatePannerPositions = useCallback(() => {
        if (!audioContextRef.current) return;
        if (!spatialEnabledRef.current) return;
        let ids = connectedUsers.filter(Boolean);
        if (ids.length === 0) return;
        // Prefer page/canvas center if available
        let useCanvas = canvasSize && canvasSize.width > 0 && canvasSize.height > 0;
        let centerX = useCanvas ? canvasSize.width / 2 : 0;
        let minY = 0;
        let height = useCanvas ? canvasSize.height : 1;
        let widthHalf = useCanvas ? canvasSize.width / 2 : 1; // for x normalization

        // Fallback: if canvas size unknown, derive from bounding box
        if (!useCanvas) {
            let xs = [], ys = [];
            ids.forEach((id) => {
                let pos = positions[id];
                if (pos) { xs.push(pos.x); ys.push(pos.y); }
            });
            if (xs.length === 0) return;
            let minX = Math.min(...xs), maxX = Math.max(...xs);
            minY = Math.min(...ys);
            let maxY = Math.max(...ys);
            let width = Math.max(1, maxX - minX);
            height = Math.max(1, maxY - minY);
            centerX = (minX + maxX) / 2;
            widthHalf = width / 2;
        }

        ids.forEach((id) => {
            let nodes = spatialNodesRef.current.get(id);
            if (!nodes) return;
            let pos = positions[id] || { x: centerX, y: minY };
            // Normalize x to [-1,1] around page center (or fallback center)
            let xNorm = (pos.x - centerX) / (widthHalf);
            if (!isFinite(xNorm)) xNorm = 0;
            xNorm = Math.max(-1, Math.min(1, xNorm));
            // Map to range [-5, 5]
            let x = xNorm * 5;
            // Map y to distance: near at top, far at bottom; listener faces -Z
            let yNorm = (pos.y - minY) / height; // 0..1
            if (!isFinite(yNorm)) yNorm = 0.5;
            // z negative (in front). Between -1 and -5
            let z = - (1 + yNorm * 4);
            try {
                if ('positionX' in nodes.panner) {
                    let t = audioContextRef.current.currentTime;
                    nodes.panner.positionX.setValueAtTime(x, t);
                    nodes.panner.positionY.setValueAtTime(0, t);
                    nodes.panner.positionZ.setValueAtTime(z, t);
                } else if (nodes.panner.setPosition) {
                    nodes.panner.setPosition(x, 0, z);
                }
            } catch { /* ignore */ }
        });
    }, [connectedUsers, positions, canvasSize]);

    // Tear down all spatial nodes/graph
    let teardownSpatialGraph = useCallback(async () => {
        spatialEnabledRef.current = false;
        spatialNodesRef.current.forEach((nodes, id) => {
            try { nodes.source.disconnect(); } catch { }
            try { nodes.panner.disconnect(); } catch { }
            try { nodes.gain.disconnect(); } catch { }
        });
        spatialNodesRef.current.clear();
        try { masterGainRef.current?.disconnect(); } catch { }
        try {
            // Detach mixed stream from element
            if (spatialAudioElRef.current) {
                spatialAudioElRef.current.srcObject = null;
            }
            destinationNodeRef.current = null;
        } catch { }
        try { await audioContextRef.current?.close(); } catch { }
        audioContextRef.current = null;
        masterGainRef.current = null;
    }, []);

    // When output device changes, reflect on spatial audio element
    useEffect(() => {
        try {
            if (spatialAudioElRef.current && typeof spatialAudioElRef.current.setSinkId === 'function' && currentSinkIdRef.current) {
                spatialAudioElRef.current.setSinkId(currentSinkIdRef.current).catch(() => { });
            }
        } catch { /* ignore */ }
    }, [outputDeviceId]);

    // Enable/disable directional audio
    useEffect(() => {
        if (!connected) return;
        if (directionalAudio) {
            ensureSpatialAudioGraph();
            spatialEnabledRef.current = true;
            // Build nodes for current users
            connectedUsers.forEach((id) => {
                if (id) buildSpatialNodesForUser(id);
            });
            updatePannerPositions();
        } else {
            teardownSpatialGraph();
        }
        // Also mute/unmute the per-user elements via volume prop handled in JSX.
    }, [directionalAudio, connected, connectedUsers, ensureSpatialAudioGraph, buildSpatialNodesForUser, updatePannerPositions, teardownSpatialGraph]);

    // Update panner positions when the layout changes
    useEffect(() => {
        if (!directionalAudio) return;
        updatePannerPositions();
    }, [positions, directionalAudio, updatePannerPositions]);

    // Teardown spatial audio when disconnected
    useEffect(() => {
        if (!connected) {
            try { teardownSpatialGraph(); } catch { }
        }
    }, [connected, teardownSpatialGraph]);

    let applySinkToAllAudios = useCallback(async (sinkId) => {
        try {
            let audios = Array.from(document.querySelectorAll('audio'));
            await Promise.all(audios.map(async (el) => {
                if (typeof el.setSinkId === 'function' && sinkId) {
                    try { await el.setSinkId(sinkId); } catch { /* ignore */ }
                }
            }));
        } catch { /* ignore */ }
    }, []);

    // Output device: initialize, persist, and enforce globally with a persistent observer
    useEffect(() => {
        // Initialize from storage
        if (outputDeviceId === null) {
            let output = ls.get("call_output");
            setOutput(output || "default");
            return;
        }

        // Persist selection
        ls.set("call_output", outputDeviceId);
        currentSinkIdRef.current = outputDeviceId;

        // Apply to all existing audio tags
        applySinkToAllAudios(outputDeviceId);

        // Start or update a persistent MutationObserver
        if (!sinkObserverRef.current) {
            sinkObserverRef.current = new MutationObserver((mutations) => {
                for (let m of mutations) {
                    m.addedNodes.forEach(node => {
                        try {
                            if (node instanceof HTMLElement) {
                                node.querySelectorAll('audio').forEach(el => {
                                    if (typeof el.setSinkId === 'function' && currentSinkIdRef.current) {
                                        el.setSinkId(currentSinkIdRef.current).catch(() => { });
                                    }
                                });
                            } else if (node instanceof HTMLMediaElement) {
                                if (node.tagName.toLowerCase() === 'audio' && typeof node.setSinkId === 'function' && currentSinkIdRef.current) {
                                    node.setSinkId(currentSinkIdRef.current).catch(() => { });
                                }
                            }
                        } catch { /* ignore */ }
                    });
                }
            });
            try {
                sinkObserverRef.current.observe(document.body, { childList: true, subtree: true });
            } catch { /* ignore */ }
        }
    }, [outputDeviceId, applySinkToAllAudios]);

    // Input device: initialize from storage and live-switch mic stream across PCs
    let switchMicInput = useCallback(async (preferredId) => {
        try {
            let base = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }

            // Build constraints
            let constraints = preferredId && preferredId !== 'default'
                ? { audio: { deviceId: { exact: preferredId }, ...base } }
                : { audio: { ...base } };

            // Acquire raw mic
            let rawStream = await navigator.mediaDevices.getUserMedia(constraints);
            // Store and stop old raw
            try { micRawStreamRef.current?.getTracks().forEach(tr => tr.stop()); } catch { }
            micRawStreamRef.current = rawStream;

            // Build processing graph and get processed stream
            let processedStream = await setupMicProcessing(rawStream);

            // Swap tracks in existing PCs to processed track
            let newTrack = processedStream?.getAudioTracks?.()[0];
            if (newTrack) {
                for (let pc of micRefs.current.values()) {
                    try {
                        let sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                        if (sender) {
                            await sender.replaceTrack(newTrack);
                        } else {
                            pc.addTrack(newTrack, processedStream);
                        }
                    } catch { /* ignore per-peer errors */ }
                }
            }
        } catch (e) {
            logFunction(`Failed to switch mic input: ${e.message}`, 'error');
        }
    }, [mute, setupMicProcessing]);

    useEffect(() => {
        if (inputDeviceId === null) {
            let input = ls.get("call_input");
            setInput(input || "default");
            return;
        }
        // Persist selection always
        ls.set("call_input", inputDeviceId);
        // Only switch mic while in a call/connected
        if (connected) {
            switchMicInput(inputDeviceId);
        }
    }, [inputDeviceId, switchMicInput, connected]);

    // Reset Function
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

    // Call Invites
    useEffect(() => {
        async function doStuff() {
            if (message.type === "new_call") {
                setInviteData({
                    callerId: message.data.sender_id,
                    callId: message.data.call_id,
                    callSecret: await decrypt_base64_using_privkey(message.data.call_secret, privateKey),
                })
                setInvitedToCall(true)
            }
        }
        doStuff();
    }, [message])

    // Toggle Mute
    let toggleMute = useCallback(() => {
        setMute((prevMute) => {
            let newMute = !prevMute;
            ls.set("call_mute", newMute);

            // When unmuting, also undeafen
            if (!newMute) {
                setDeaf(false);
                ls.set("call_deaf", false);
            }

            return newMute;
        });
    }, []);

    // Toggle Deaf
    let toggleDeaf = useCallback(() => {
        setDeaf((prevDeaf) => {
            let newDeaf = !prevDeaf;
            ls.set("call_deaf", newDeaf);

            // When deafening, also mute
            if (newDeaf) {
                setMute(true);
                ls.set("call_mute", true);
            }

            return newDeaf;
        });
    }, []);

    // Get Screen Stream
    let getScreenStream = useCallback((id) => {
        if (!id) {
            return screenStreamRef.current;
        }
        return videoRefs.current.get(id);
    }, []);

    // Handle WebSocket Messages
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
                // Clean up spatial nodes for this user if present
                try {
                    let nodes = spatialNodesRef.current.get(message.data.user_id);
                    if (nodes) {
                        try { nodes.source.disconnect(); } catch { }
                        try { nodes.panner.disconnect(); } catch { }
                        try { nodes.gain.disconnect(); } catch { }
                        spatialNodesRef.current.delete(message.data.user_id);
                    }
                } catch { /* ignore */ }
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

                // Clean up audio references
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
                // Acquire mic using current or stored input device
                try {
                    let preferredId = inputDeviceId ?? ls.get('call_input') ?? 'default';
                    await switchMicInput(preferredId);
                } catch { /* handled inside switchMicInput */ }
                setConnectedUsers([ownUuid]);
            },
            onClose: () => {
                logFunction("Call disconnected", "info");
                // Stop using the microphone when leaving the call
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
    }, [sendMessage, connected]);

    // Start Screen Stream
    let startScreenStream = useCallback(async () => {
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

            console.log(stream)

            screenStreamRef.current = stream;
            setStream(true);

            // Add own user to streaming users when starting screen share
            setStreamingUsers((prev) => {
                if (!prev.includes(ownUuid)) {
                    return [...prev, ownUuid];
                }
                return prev;
            });

            // Notify other users that we started streaming
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

    // Stop Screen Stream
    let stopScreenStream = useCallback(() => {
        if (!screenStreamRef.current) {
            return;
        }

        // Remove own user from streaming users when stopping screen share
        setStreamingUsers((prev) => prev.filter(userId => userId !== ownUuid));

        // Notify other users that we stopped streaming
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

    // Update Stream
    let updateStream = useCallback(async () => {
        if (!stream) return;
        let videoTracks = screenStreamRef.current?.getVideoTracks?.() || [];
        if (videoTracks.length === 0) return;
        let track = videoTracks[0];
        let [wStr, hStr] = String(streamResolution).split("x");
        let widthNum = parseInt(wStr, 10) || undefined;
        let heightNum = parseInt(hStr, 10) || undefined;
        let frameNum = parseInt(String(streamRefresh), 10) || undefined;
        // Apply constraints to the video track only
        let constraints = {};
        if (frameNum) constraints.frameRate = { ideal: frameNum, max: frameNum };
        if (widthNum) constraints.width = { ideal: widthNum, max: widthNum };
        if (heightNum) constraints.height = { ideal: heightNum, max: heightNum };
        try {
            await track.applyConstraints(constraints);
        } catch (err) {
            log(err.message, "showError");
        }
    }, [stream, streamResolution, streamRefresh])

    // Create P2P Connection
    let createP2PConnection = useCallback(async (id, isInitiator = false, isScreenShare = false) => {
        // Handle Existing Connections
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

        // Create New Peer Connection
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

        // Add Own Mic Stream
        if (micStreamRef.current && !isScreenShare) {
            micStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, micStreamRef.current);
            });
        }

        // Add Own Screen Stream
        if (screenStreamRef.current && isScreenShare && isInitiator) {
            screenStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, screenStreamRef.current);
            });
        }

        // ICE Candidates
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

        // Track Events
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

            // Handle Tracks
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

                // If spatial audio is enabled, make sure this user's stream is spatialized
                if (spatialEnabledRef.current) {
                    try { ensureSpatialAudioGraph(); } catch { }
                    try { buildSpatialNodesForUser(id); } catch { }
                    try { updatePannerPositions(); } catch { }
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
                    setTimeout(() => {
                        let audioElement = audioRefs.current.get(id);
                        let stream = audioStreamsRefs.current.get(id);
                        if (audioElement && stream && stream instanceof MediaStream) {
                            audioElement.srcObject = stream;
                            logFunction(`Set audio stream for user ${id}`, "debug");
                        } else if (audioElement && stream) {
                            logFunction(`Invalid stream type for user ${id}: ${typeof stream}`, "warning");
                        }

                        // Also wire spatial node if enabled
                        if (spatialEnabledRef.current) {
                            try { ensureSpatialAudioGraph(); } catch { }
                            try { buildSpatialNodesForUser(id); } catch { }
                            try { updatePannerPositions(); } catch { }
                        }
                    }, 100);
                }
            }
        };

        return pc;
    }, [send, webrtc_servers, encrypt_base64_using_aes, callSecret]);

    // Start Call
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

    // End Call
    let stopCall = useCallback(() => {
        reset();
    }, [])

    // Update Connected State
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

    // Identification
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
                                            call_secret: await encrypt_base64_using_pubkey(
                                                btoa(callSecret),
                                                publicKey,
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

    // Update Stream when Refresh or Resolution changes (video)
    useEffect(() => {
        updateStream();
    }, [updateStream, streamRefresh, streamResolution])

    // Unmount Cleanup
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
            canvasSize,
            setCanvasSize,
        }}>
            <div hidden>
                {/* Spatial mix output element (used when directionalAudio is enabled) */}
                <audio
                    ref={(el) => {
                        spatialAudioElRef.current = el || null;
                        // When element appears, attach stream if graph exists
                        try {
                            if (el && destinationNodeRef.current) {
                                el.srcObject = destinationNodeRef.current.stream;
                                // Apply current sink
                                if (typeof el.setSinkId === 'function' && currentSinkIdRef.current) {
                                    el.setSinkId(currentSinkIdRef.current).catch(() => { });
                                }
                            }
                        } catch { /* ignore */ }
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
                                // Set the stream if it already exists
                                let stream = audioStreamsRefs.current.get(id);
                                if (stream && stream instanceof MediaStream) {
                                    el.srcObject = stream;
                                } else if (stream) {
                                    logFunction(`Invalid stream type for user ${id}: ${typeof stream}`, "warning");
                                }
                                // Apply current output device to this element
                                try {
                                    if (typeof el.setSinkId === 'function' && currentSinkIdRef.current) {
                                        el.setSinkId(currentSinkIdRef.current).catch(() => { });
                                    }
                                } catch { /* ignore */ }
                            } else {
                                audioRefs.current.delete(id);
                            }
                        }}
                        autoPlay
                        muted={deaf || directionalAudio}
                    />
                )) : null}
            </div>
            {children}
        </CallContext.Provider>
    );
};
