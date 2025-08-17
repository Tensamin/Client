// Package Imports
import { clsx } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

// Main
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export let statusColors = {
  IOTA_OFFLINE: "bg-gray-400",
  USER_OFFLINE: "bg-gray-400",
  ONLINE: "bg-green-500",
  DND: "bg-red-600",
  IDLE: "bg-yellow-500",
  WC: "bg-white"
}

export function downloadString(filename, content) {
  let blob = new Blob([content], { type: 'text/plain' });
  let link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function convertDisplayNameToInitials(displayName) {
  if (!displayName || typeof displayName !== "string") {
    return "";
  }

  let words = displayName.split(" ").filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  } else {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
}

export function capitalizeFirstLetter(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function log(msg, type, title) {
  if (msg !== "") {
    let debug = localStorage.getItem('debug') === 'true';
    switch (type) {
      case 'error':
        console.error(msg)
        if (debug) toast.error(msg.toString())
        break;

      case 'showError':
        console.error(msg)
        toast.error(msg.toString())
        break;

      case 'warning':
        if (debug) console.warn(title || "Debug:", msg)
        toast.warning(msg)
        break;

      case 'success':
        if (debug) console.log(title || "Debug:", msg)
        toast.success(msg)
        break;

      case 'info':
        if (debug) console.log(title || "Debug:", msg)
        if (debug) toast.info(msg)
        break;

      case 'debug':
        if (debug) console.log(title || "Debug:", msg)
        break;

      default:
        break;
    }
  }
}

export function isUuid(str) {
  let uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  return uuidRegex.test(str);
}

export function isHexColor(str) {
  if (typeof str !== "string" || str.length === 0) {
    return false;
  }

  let hexColorRegex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

  return hexColorRegex.test(str);
}

export function getDisplayFromUsername(username, display_name) {
  if (display_name === "") {
    return capitalizeFirstLetter(username)
  } else {
    return display_name
  }
}

export async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!")
  } catch (err) {
    log(err.message, "showError")
  }
}

export function adjustAvatar(base64Input, bypass = false, quality = 80) {
  if (bypass || !base64Input) {
    return Promise.resolve(base64Input);
  }

  return new Promise((resolve, reject) => {
    let img = new Image();
    img.src = base64Input;

    img.onload = () => {
      let canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      let ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get 2D canvas context.'));
      }

      ctx.drawImage(img, 0, 0);

      let compressedBase64 = canvas.toDataURL('image/webp', quality / 100);
      resolve(compressedBase64);
    };

    img.onerror = (error) => {
      reject(new Error('Failed to load the input image. ' + error));
    };
  });
}

export function formatUserStatus(statusString) {
  if (typeof statusString !== 'string' || statusString.length === 0) {
    return '';
  }

  let parts = statusString.split('_');

  let formattedParts = parts.map((part) =>
    capitalizeFirstLetter(part.toLowerCase()),
  );

  return formattedParts.join(' ');
}

export async function sha256(message) {
  let encoder = new TextEncoder();
  let data = encoder.encode(message);
  let hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createPasskey(userId) {
  let creds = await navigator.credentials.create({
    publicKey: {
      challenge: btoa("alar"),
      rp: { name: "Tensamin" },
      user: {
        id: userId,
        name: userId,
        displayName: "Tensamin",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: true,
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  });

  localStorage.setItem(
    "passkey_id",
    creds.id,
  );

  return creds.id;
}

export async function getDerivedKey(passkey_id) {
  try {
    let creds = await navigator.credentials.get({
      publicKey: {
        challenge: btoa("alar"),
        allowCredentials: [
          {
            type: "public-key",
            id: passkey_id,
          },
        ],
        userVerification: "required",
      },
    });

    let signature = creds.response.signature;

    let derivedKey = await sha256(signature);
    return derivedKey;
  } catch (err) {
    throw new Error(`Could not get signature: ${err.message}`);
  }
}

export async function getDeviceFingerprint() {
  let data = {};

  try {
    data.userAgent = navigator.userAgent || "";
  } catch (e) { }
  try {
    data.hardwareConcurrency = navigator.hardwareConcurrency || -1;
  } catch (e) { }
  try {
    data.deviceMemory = navigator.deviceMemory || -1;
  } catch (e) { }
  try {
    data.language = navigator.language || "";
  } catch (e) { }
  try {
    data.languages =
      (navigator.languages && navigator.languages.join(",")) || "";
  } catch (e) { }
  try {
    data.cookieEnabled = navigator.cookieEnabled || false;
  } catch (e) { }
  try {
    data.screenWidth = screen.width || -1;
  } catch (e) { }
  try {
    data.screenHeight = screen.height || -1;
  } catch (e) { }
  try {
    data.screenAvailWidth = screen.availWidth || -1;
  } catch (e) { }
  try {
    data.screenAvailHeight = screen.availHeight || -1;
  } catch (e) { }
  try {
    data.screenColorDepth = screen.colorDepth || -1;
  } catch (e) { }
  try {
    data.screenPixelDepth = screen.pixelDepth || -1;
  } catch (e) { }
  try {
    data.windowInnerWidth = window.innerWidth || -1;
  } catch (e) { }
  try {
    data.windowInnerHeight = window.innerHeight || -1;
  } catch (e) { }
  try {
    data.windowDevicePixelRatio = window.devicePixelRatio || -1;
  } catch (e) { }
  try {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = 250;
      canvas.height = 80;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.font = '11pt "Arial"';
      ctx.fillText("https://tensamin.methanium.net", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.2)";
      ctx.font = '18pt "Times New Roman"';
      ctx.fillText("https://methanium.net", 4, 45);
      data.canvasImage = canvas.toDataURL();
    }
  } catch (e) {
    data.canvasImage = "error";
  }
  try {
    let canvas = document.createElement("canvas");
    let gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      let debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      data.webglVendor =
        (debugInfo && gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)) ||
        "";
      data.webglRenderer =
        (debugInfo && gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) ||
        "";
      data.webglVersion = gl.getParameter(gl.VERSION) || "";
      data.webglShadingLanguageVersion =
        gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "";
      data.webglExtensions = gl.getSupportedExtensions().sort().join(";") || "";
    }
  } catch (e) {
    data.webglVendor = "error";
    data.webglRenderer = "error";
  }
  try {
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      let audioCtx = new AudioContext();
      let oscillator = audioCtx.createOscillator();
      let analyser = audioCtx.createAnalyser();
      let gain = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);

      oscillator.connect(analyser);
      analyser.connect(gain);
      gain.connect(audioCtx.destination);

      oscillator.start(0);
      oscillator.stop(0.1);

      let buffer = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(buffer);

      data.audioFingerprint = Array.from(buffer)
        .map((v) => (v === -Infinity ? "I" : v.toFixed(3)))
        .join(",");
      audioCtx.close();
    }
  } catch (e) {
    data.audioFingerprint = "error";
  }
  let fontsToCheck = [
    "Arial",
    "Verdana",
    "Times New Roman",
    "Georgia",
    "Courier New",
    "Impact",
    "Lucida Console",
    "Tahoma",
    "Comic Sans MS",
    "Open Sans",
    "Roboto",
    "Ubuntu",
    "Fira Code",
    "Anonymous Pro",
    "Monaco",
    "Consolas",
    "DejaVu Sans Mono",
  ];
  let detectedFonts = [];
  let body = document.body;
  let originalBodyStyle = body.style.fontFamily;
  let defaultFont = "monospace";
  let isFontAvailable = (fontName) => {
    let testText = "mmmmmmmmmmlli";
    let span = document.createElement("span");
    span.style.cssText = `
      position:absolute;
      left:-9999px;
      line-height:normal;
      font-size:72px;
      font-family:${defaultFont};
    `;
    span.innerText = testText;
    document.body.appendChild(span);
    let defaultWidth = span.offsetWidth;
    let defaultHeight = span.offsetHeight;
    span.style.fontFamily = `'${fontName}', ${defaultFont}`;
    let newWidth = span.offsetWidth;
    let newHeight = span.offsetHeight;
    document.body.removeChild(span);
    return defaultWidth !== newWidth || defaultHeight !== newHeight;
  };
  try {
    for (let font of fontsToCheck) {
      if (isFontAvailable(font)) {
        detectedFonts.push(font);
      }
    }
    data.detectedFonts = detectedFonts.sort().join(",");
  } catch (e) {
    data.detectedFonts = "error";
  } finally {
    body.style.fontFamily = originalBodyStyle;
  }
  let jsonString = JSON.stringify(data);
  let textEncoder = new TextEncoder();
  let dataBytes = textEncoder.encode(jsonString);
  try {
    let hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes);
    let hashArray = Array.from(new Uint8Array(hashBuffer));
    let hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  } catch (e) {
    console.error("Failed to generate fingerprint hash:", e);
    return "hash_error";
  }
}

export function signWithBase64PrivateKey(privateKeyBase64, message) {
  if (typeof privateKeyBase64 !== 'string' || !privateKeyBase64.trim()) {
    throw new TypeError('privateKeyBase64 must be a non-empty string');
  }
  if (typeof message !== 'string') {
    throw new TypeError('message must be a string');
  }

  if (!crypto || typeof crypto.createPrivateKey !== 'function') {
    throw new Error(
      'Node crypto.createPrivateKey is required. Use Node.js runtime ' +
      '(not Edge).',
    );
  }

  let keyObj;

  if (privateKeyBase64.includes('-----BEGIN ')) {
    keyObj = crypto.createPrivateKey({ key: privateKeyBase64, format: 'pem' });
  } else {
    let maybePem = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
    if (maybePem.includes('-----BEGIN ')) {
      keyObj = crypto.createPrivateKey({ key: maybePem, format: 'pem' });
    } else {
      let der = Buffer.from(privateKeyBase64, 'base64');
      try {
        keyObj = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
      } catch (_) {
        try {
          keyObj = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs1' });
        } catch (_) {
          let body = privateKeyBase64.replace(/\s+/g, '');
          let lines = body.match(/.{1,64}/g) || [body];
          let pem = [
            '-----BEGIN PRIVATE KEY-----',
            ...lines,
            '-----END PRIVATE KEY-----',
            '',
          ].join('\n');
          keyObj = crypto.createPrivateKey({ key: pem, format: 'pem' });
        }
      }
    }
  }

  let signer = crypto.createSign('sha256');
  signer.update(message, 'utf8');
  signer.end();
  return signer.sign(keyObj, 'base64');
}

export function isElectron() {
  if (typeof navigator !== 'undefined' &&
    navigator.userAgent.includes('Electron')) {
    return true;
  }

  if (typeof process !== 'undefined' &&
    process.versions && process.versions.electron) {
    return true;
  }

  try {
    if (typeof window !== 'undefined' && window.require) {
      const electron = window.require('electron');
      if (electron) return true;
    }
  } catch (e) { }

  return false;
}

export let clippy = "data:image/webp;base64,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";