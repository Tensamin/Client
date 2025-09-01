// Package Imports
import { clsx } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export let RETRIES = 3;

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
  WC: "bg-white",
};

export function downloadString(filename, content) {
  let blob = new Blob([content], { type: "text/plain" });
  let link = document.createElement("a");
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
  if (typeof str !== "string" || str.length === 0) {
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function log(msg, type, title) {
  if (msg !== "") {
    let debug = localStorage.getItem("debug") === "true";
    switch (type) {
      case "error":
        console.error(msg);
        if (debug) toast.error(msg.toString());
        break;

      case "showError":
        console.error(msg);
        toast.error(msg.toString());
        break;

      case "warning":
        if (debug) console.warn(title || "Debug:", msg);
        toast.warning(msg);
        break;

      case "success":
        if (debug) console.log(title || "Debug:", msg);
        toast.success(msg);
        break;

      case "info":
        if (debug) console.log(title || "Debug:", msg);
        if (debug) toast.info(msg);
        break;

      case "debug":
        if (debug) console.log(title || "Debug:", msg);
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
    return capitalizeFirstLetter(username);
  } else {
    return display_name;
  }
}

export async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  } catch (err) {
    log(err.message, "showError");
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
      let canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      let ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Could not get 2D canvas context."));
      }

      ctx.drawImage(img, 0, 0);

      let compressedBase64 = canvas.toDataURL("image/webp", quality / 100);
      resolve(compressedBase64);
    };

    img.onerror = (error) => {
      reject(new Error("Failed to load the input image. " + error));
    };
  });
}

export function formatUserStatus(statusString) {
  if (typeof statusString !== "string" || statusString.length === 0) {
    return "";
  }

  let parts = statusString.split("_");

  let formattedParts = parts.map((part) =>
    capitalizeFirstLetter(part.toLowerCase()),
  );

  return formattedParts.join(" ");
}

export async function sha256(message) {
  let encoder = new TextEncoder();
  let data = encoder.encode(message);
  let hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
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

  localStorage.setItem("passkey_id", creds.id);

  return creds.id;
}

export function isElectron() {
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes("Electron")
  ) {
    return true;
  }

  if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.electron
  ) {
    return true;
  }

  try {
    if (typeof window !== "undefined" && window.require) {
      let electron = window.require("electron");
      if (electron) return true;
    }
  } catch (e) { }

  return false;
}

export let clippy =
  "data:image/webp;base64,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";

// Deprecated
async function getDerivedKey(passkey_id) {
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

// Fingerprint Stuff
export async function getDeviceFingerprint({ debug = false } = {}) {
  if (typeof window === "undefined") {
    return "hash_error_ssr";
  }

  let fp = {
    version: "v3",
    ts: Date.now(),
  };

  let [ua, display, intl, memCpu, canvas2D, webgl, webgpu, audio, fonts] =
    await Promise.all([
      collectUA(),
      collectDisplay(),
      collectIntl(),
      collectMemoryCpu(),
      collectCanvas2DHash(),
      collectWebGLInfoAndHash(),
      collectWebGPUInfo(),
      collectAudioFingerprint(),
      collectFontsFingerprint(),
    ]);

  fp.ua = ua;
  fp.display = display;
  fp.intl = intl;
  fp.memCpu = memCpu;
  fp.canvas2D = canvas2D;
  fp.webgl = webgl;
  fp.webgpu = webgpu;
  fp.audio = audio;
  fp.fonts = fonts;

  let stableJson = stableStringify({
    version: fp.version,
    ua: fp.ua,
    display: fp.display,
    intl: fp.intl,
    memCpu: fp.memCpu,
    canvas2D: fp.canvas2D,
    webgl: fp.webgl,
    webgpu: fp.webgpu,
    audio: fp.audio,
    fonts: { hash: fp.fonts.hash },
  });

  let hash = await sha256(stableJson);

  if (debug) {
    return { hash, components: fp };
  }
  return hash;
}

function stableStringify(value) {
  let seen = new WeakSet();
  let stringify = (v) => {
    if (v === null || typeof v !== "object") {
      // normalize undefined to null for stability
      return v === undefined ? "null" : JSON.stringify(v);
    }
    if (seen.has(v)) return '"[Circular]"';
    seen.add(v);
    if (Array.isArray(v)) {
      return `[${v.map((x) => stringify(x)).join(",")}]`;
    }
    let keys = Object.keys(v).sort();
    let entries = keys.map((k) => `${JSON.stringify(k)}:${stringify(v[k])}`);
    return `{${entries.join(",")}}`;
  };
  return stringify(value);
}

function bucketDeviceMemory(dm) {
  if (!dm || dm <= 0) return -1;
  if (dm <= 2) return 2;
  if (dm <= 4) return 4;
  if (dm <= 6) return 6;
  if (dm <= 8) return 8;
  if (dm <= 12) return 12;
  if (dm <= 16) return 16;
  if (dm <= 24) return 24;
  if (dm <= 32) return 32;
  if (dm <= 48) return 48;
  return 64;
}

function bucketCores(hc) {
  if (!hc || hc <= 0) return -1;
  if (hc <= 2) return 2;
  if (hc <= 4) return 4;
  if (hc <= 6) return 6;
  if (hc <= 8) return 8;
  if (hc <= 12) return 12;
  if (hc <= 16) return 16;
  if (hc <= 24) return 24;
  return 32;
}

function normalizeArchBits({ architecture, bitness, oscpu, ua }) {
  let s = `${architecture || ""} ${bitness || ""} ${oscpu || ""} ${ua || ""}`
    .toLowerCase()
    .trim();

  let arch = "";
  if (/aarch64|arm64/.test(s)) arch = "arm64";
  else if (/\bx86_64|\bx64|\bwin64|\bamd64/.test(s)) arch = "x64";
  else if (/\bx86|\bwin32|\bi[3-6]86\b/.test(s)) arch = "x86";
  else if (/\barmv7|armv8|arm\b/.test(s)) arch = "arm";
  else arch = "";

  let bits = "";
  if (/\b64\b|x64|aarch64|amd64|win64/.test(s)) bits = "64";
  else if (/\b32\b|x86|win32|i[3-6]86/.test(s)) bits = "32";

  return { architecture: arch, bitness: bits };
}

function normalizePlatform({ platform, oscpu, ua }) {
  let s = `${platform || ""} ${oscpu || ""} ${ua || ""}`.toLowerCase().trim();

  if (/android/.test(s)) return "Android";
  if (/iphone|ipad|ipod|ios/.test(s)) return "iOS";
  if (/mac|darwin/.test(s)) return "macOS";
  if (/win/.test(s)) return "Windows";
  if (/linux/.test(s)) return "Linux";
  if (/cros/.test(s)) return "ChromeOS";
  return platform || "";
}

async function collectUA() {
  let out = {};
  try {
    let uaData = navigator.userAgentData;
    if (uaData && uaData.getHighEntropyValues) {
      let hints = [
        "architecture",
        "bitness",
        "model",
        "platform",
        "platformVersion",
      ];
      let res = await uaData.getHighEntropyValues(hints).catch(() => null);
      if (res) {
        out.uaCH = {
          architecture: res.architecture || "",
          bitness: res.bitness || "",
          model: res.model || "",
          platform: res.platform || "",
          platformVersion: res.platformVersion || "",
          mobile: !!uaData.mobile,
        };
      }
    }
  } catch (e) {
    // ignore
  }

  // Legacy and Firefox-centric fallbacks
  let oscpu = "";
  let ua = "";
  try {
    oscpu = navigator.oscpu || "";
  } catch (e) { }
  try {
    ua = navigator.userAgent || "";
  } catch (e) { }

  try {
    out.platform = navigator.platform || "";
    out.vendor = navigator.vendor || "";
    out.maxTouchPoints = navigator.maxTouchPoints || 0;
  } catch (e) {
    out.platform = out.platform || "";
    out.vendor = out.vendor || "";
    out.maxTouchPoints = out.maxTouchPoints || 0;
  }

  // Provide coarse normalized fields for non-UA-CH browsers (Firefox/Safari)
  let coarseArch = normalizeArchBits({
    architecture: out.uaCH && out.uaCH.architecture,
    bitness: out.uaCH && out.uaCH.bitness,
    oscpu,
    ua,
  });
  let coarsePlatform = normalizePlatform({
    platform: (out.uaCH && out.uaCH.platform) || out.platform,
    oscpu,
    ua,
  });

  out.legacy = {
    oscpu: oscpu || "",
    uaShort: ua.slice(0, 128), // limit length for stability
    coarseArchitecture: coarseArch.architecture,
    coarseBitness: coarseArch.bitness,
    coarsePlatform,
    isMobile:
      /android|iphone|ipad|ipod|mobile/i.test(ua) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 1),
  };

  return out;
}

async function collectDisplay() {
  let out = {};
  try {
    let sw = (screen && screen.width) || -1;
    let sh = (screen && screen.height) || -1;

    let gcd = (a, b) => {
      a = Math.abs(a);
      b = Math.abs(b);
      while (b) {
        let t = b;
        b = a % b;
        a = t;
      }
      return a || 1;
    };
    let g = sw > 0 && sh > 0 ? gcd(sw, sh) : 1;
    let aspect = sw > 0 && sh > 0 ? `${sw / g}:${sh / g}` : "";

    out.screen = {
      width: sw,
      height: sh,
      aspect,
      colorDepth: screen.colorDepth || -1,
      pixelDepth: screen.pixelDepth || -1,
      dpr: getSafeDPR(),
      colorGamut: matchMediaQueryColorGamut(),
    };
  } catch (e) {
    out.screen = { error: true };
  }
  return out;
}

function getSafeDPR() {
  try {
    let dpr = Number(window.devicePixelRatio);
    return Number.isFinite(dpr) ? dpr : -1;
  } catch {
    return -1;
  }
}

function matchMediaQueryColorGamut() {
  try {
    if (window.matchMedia("(color-gamut: rec2020)").matches) return "rec2020";
    if (window.matchMedia("(color-gamut: p3)").matches) return "p3";
    if (window.matchMedia("(color-gamut: srgb)").matches) return "srgb";
  } catch (e) {
    // ignore
  }
  return "unknown";
}

async function collectIntl() {
  let out = {};
  try {
    let dt = Intl.DateTimeFormat().resolvedOptions();
    out.timeZone = dt.timeZone || "";
    out.calendar = dt.calendar || "";
    out.numberingSystem = dt.numberingSystem || "";
    out.hourCycle = dt.hourCycle || "";
    out.locale = dt.locale || "";
  } catch (e) {
    out.error = true;
  }
  return out;
}

async function collectMemoryCpu() {
  let out = {};
  try {
    let dm = navigator.deviceMemory;
    let hc = navigator.hardwareConcurrency;
    out.deviceMemoryBucket = bucketDeviceMemory(Number(dm) || -1);
    out.hardwareConcurrencyBucket = bucketCores(Number(hc) || -1);
  } catch (e) {
    out.deviceMemoryBucket = -1;
    out.hardwareConcurrencyBucket = -1;
  }
  return out;
}

function get2DCanvas(width = 300, height = 120) {
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      let c = new OffscreenCanvas(width, height);
      let ctx = c.getContext("2d");
      if (ctx) return { canvas: c, ctx, offscreen: true };
    }
  } catch { }
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext("2d");
  return { canvas, ctx, offscreen: false };
}

async function canvasToBytes(canvas) {
  try {
    if (
      typeof OffscreenCanvas !== "undefined" &&
      canvas instanceof OffscreenCanvas
    ) {
      if (canvas.convertToBlob) {
        let blob = await canvas.convertToBlob({
          type: "image/png",
          quality: 0.92,
        });
        let buf = await blob.arrayBuffer();
        return new Uint8Array(buf);
      }
    }
  } catch (e) {
    // fall through
  }
  try {
    if ("toDataURL" in canvas) {
      let dataUrl = canvas.toDataURL("image/png");
      return new TextEncoder().encode(dataUrl);
    }
  } catch (e) {
    if (
      e &&
      (e.name === "SecurityError" || /insecure|blocked/i.test(String(e)))
    ) {
      return { blocked: true };
    }
    throw e;
  }
  try {
    if (canvas.convertToBlob) {
      let blob = await canvas.convertToBlob({
        type: "image/png",
        quality: 0.92,
      });
      let buf = await blob.arrayBuffer();
      return new Uint8Array(buf);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function collectCanvas2DHash() {
  let out = {};
  try {
    let { canvas, ctx } = get2DCanvas(300, 120);
    if (!ctx) throw new Error("2D context unavailable");

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(130, 1, 62, 20);

    ctx.fillStyle = "#069";
    ctx.font = '11pt "Arial"';
    ctx.fillText("https://tensamin.methanium.net", 2, 20);

    ctx.fillStyle = "rgba(102, 204, 0, 0.2)";
    ctx.font = '18pt "Times New Roman"';
    ctx.rotate(0.03);
    ctx.fillText("https://methanium.net", 4, 60);
    ctx.rotate(-0.03);

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(255, 0, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(200, 40, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
    ctx.fillRect(190, 30, 40, 40);

    let bytes = await canvasToBytes(canvas);
    if (bytes && bytes.blocked) {
      out.hash = "blocked_canvas";
      out.blocked = true;
    } else if (bytes) {
      out.hash = await sha256(bytes);
    } else {
      out.hash = "error";
    }
  } catch (e) {
    if (
      e &&
      (e.name === "SecurityError" || /insecure|blocked/i.test(String(e)))
    ) {
      out.hash = "blocked_canvas";
      out.blocked = true;
    } else {
      out.hash = "error";
    }
  }
  return out;
}

function getWebGLContext() {
  try {
    let opts = { antialias: true, preserveDrawingBuffer: false };
    if (typeof OffscreenCanvas !== "undefined") {
      let c = new OffscreenCanvas(1, 1);
      let gl2 = c.getContext("webgl2", opts);
      if (gl2) return { gl: gl2, canvas: c };
      let gl1 =
        c.getContext("webgl", opts) || c.getContext("experimental-webgl", opts);
      if (gl1) return { gl: gl1, canvas: c };
    }
  } catch { }
  let canvas = document.createElement("canvas");
  let gl =
    canvas.getContext("webgl2", { antialias: true }) ||
    canvas.getContext("webgl", { antialias: true }) ||
    canvas.getContext("experimental-webgl");
  return gl ? { gl, canvas } : { gl: null, canvas: null };
}

async function collectWebGLInfoAndHash() {
  let out = {};
  try {
    let { gl } = getWebGLContext();
    if (!gl) throw new Error("WebGL unavailable");

    let vendor = "";
    let renderer = "";
    try {
      let debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
      } else {
        // Fallback when extension is blocked (Firefox, privacy modes)
        vendor = gl.getParameter(gl.VENDOR) || "";
        renderer = gl.getParameter(gl.RENDERER) || "";
      }
    } catch (_) {
      try {
        vendor = gl.getParameter(gl.VENDOR) || "";
        renderer = gl.getParameter(gl.RENDERER) || "";
      } catch { }
    }

    let version = safeGLGet(gl, gl.VERSION);
    let shadingLang = safeGLGet(gl, gl.SHADING_LANGUAGE_VERSION);

    let limits = {
      MAX_TEXTURE_SIZE: numGLGet(gl, gl.MAX_TEXTURE_SIZE),
      MAX_CUBE_MAP_TEXTURE_SIZE: numGLGet(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      MAX_RENDERBUFFER_SIZE: numGLGet(gl, gl.MAX_RENDERBUFFER_SIZE),
      MAX_VERTEX_ATTRIBS: numGLGet(gl, gl.MAX_VERTEX_ATTRIBS),
      MAX_VARYING_VECTORS: safeGLGet(gl, gl.MAX_VARYING_VECTORS) ?? -1,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: numGLGet(
        gl,
        gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS,
      ),
      ALIASED_LINE_WIDTH_RANGE: listGLGet(gl, gl.ALIASED_LINE_WIDTH_RANGE),
      ALIASED_POINT_SIZE_RANGE: listGLGet(gl, gl.ALIASED_POINT_SIZE_RANGE),
      RED_BITS: numGLGet(gl, gl.RED_BITS),
      GREEN_BITS: numGLGet(gl, gl.GREEN_BITS),
      BLUE_BITS: numGLGet(gl, gl.BLUE_BITS),
      ALPHA_BITS: numGLGet(gl, gl.ALPHA_BITS),
      DEPTH_BITS: numGLGet(gl, gl.DEPTH_BITS),
      STENCIL_BITS: numGLGet(gl, gl.STENCIL_BITS),
      MAX_VIEWPORT_DIMS: listGLGet(gl, gl.MAX_VIEWPORT_DIMS, "x"),
    };

    let precision = getGLPrecisions(gl);

    let extensions = [];
    try {
      let exts = gl.getSupportedExtensions() || [];
      extensions = exts.slice().sort();
    } catch (e) {
      // ignore
    }

    let renderHash = await webglRenderHash(gl);

    out.vendor = vendor || "";
    out.renderer = renderer || "";
    out.version = version || "";
    out.shadingLanguage = shadingLang || "";
    out.limits = limits;
    out.precision = precision;
    out.extensionsHash = await sha256(extensions.join(";"));
    out.renderHash = renderHash;
  } catch (e) {
    out.vendor = "error";
    out.renderer = "error";
  }
  return out;
}

function safeGLGet(gl, pname) {
  try {
    return gl.getParameter(pname) || "";
  } catch {
    return "";
  }
}
function numGLGet(gl, pname) {
  let v = safeGLGet(gl, pname);
  return typeof v === "number" && Number.isFinite(v) ? v : -1;
}
function listGLGet(gl, pname, joiner = ",") {
  try {
    let v = gl.getParameter(pname);
    if (Array.isArray(v) || ArrayBuffer.isView(v)) {
      return Array.from(v).join(joiner);
    }
    return "";
  } catch {
    return "";
  }
}

function getGLPrecisions(gl) {
  let spf = (shaderType, precisionType) => {
    try {
      let fmt = gl.getShaderPrecisionFormat(shaderType, precisionType);
      return fmt ? `${fmt.rangeMin},${fmt.rangeMax},${fmt.precision}` : "n/a";
    } catch {
      return "err";
    }
  };
  return {
    VS_LOW_FLOAT: spf(gl.VERTEX_SHADER, gl.LOW_FLOAT),
    VS_MED_FLOAT: spf(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
    VS_HIGH_FLOAT: spf(gl.VERTEX_SHADER, gl.HIGH_FLOAT),
    FS_LOW_FLOAT: spf(gl.FRAGMENT_SHADER, gl.LOW_FLOAT),
    FS_MED_FLOAT: spf(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
    FS_HIGH_FLOAT: spf(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
    VS_LOW_INT: spf(gl.VERTEX_SHADER, gl.LOW_INT),
    VS_MED_INT: spf(gl.VERTEX_SHADER, gl.MEDIUM_INT),
    VS_HIGH_INT: spf(gl.VERTEX_SHADER, gl.HIGH_INT),
    FS_LOW_INT: spf(gl.FRAGMENT_SHADER, gl.LOW_INT),
    FS_MED_INT: spf(gl.FRAGMENT_SHADER, gl.MEDIUM_INT),
    FS_HIGH_INT: spf(gl.FRAGMENT_SHADER, gl.HIGH_INT),
  };
}

async function webglRenderHash(gl) {
  try {
    let isWebGL2 =
      typeof WebGL2RenderingContext !== "undefined" &&
      gl instanceof WebGL2RenderingContext;

    let vsSrc = isWebGL2
      ? `#version 300 es
         in vec2 aPos; out vec2 vUv;
         void main(){ vUv=(aPos+1.0)*0.5; gl_Position=vec4(aPos,0.0,1.0); }`
      : `attribute vec2 aPos; varying vec2 vUv;
         void main(){ vUv=(aPos+1.0)*0.5; gl_Position=vec4(aPos,0.0,1.0); }`;

    let fsSrc = isWebGL2
      ? `#version 300 es
         precision highp float; in vec2 vUv; out vec4 outColor;
         float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
         void main(){
           vec2 p = vUv;
           float v = sin(40.0*p.x)*cos(40.0*p.y);
           float n = hash(p*vec2(128.0,96.0));
           outColor = vec4(fract(v*0.75+n*0.25), p, 1.0);
         }`
      : `precision highp float; varying vec2 vUv;
         float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
         void main(){
           vec2 p = vUv;
           float v = sin(40.0*p.x)*cos(40.0*p.y);
           float n = hash(p*vec2(128.0,96.0));
           gl_FragColor = vec4(fract(v*0.75+n*0.25), p, 1.0);
         }`;

    let prog = createProgram(gl, vsSrc, fsSrc, isWebGL2);
    if (!prog) throw new Error("Program compile failed");
    gl.useProgram(prog);

    let posLoc = gl.getAttribLocation(prog, "aPos");
    let buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Big triangle to cover viewport
    let verts = new Float32Array([-1, -1, 3, -1, -1, 3]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, 64, 64);
    gl.disable(gl.DITHER);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    try {
      gl.finish();
    } catch { }

    let pixels = new Uint8Array(64 * 64 * 4);
    gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return await sha256(pixels);
  } catch (e) {
    return "render_error";
  }
}

function createProgram(gl, vsSrc, fsSrc, isWebGL2) {
  let compile = (type, src) => {
    let sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      return null;
    }
    return sh;
  };
  let vs = compile(gl.VERTEX_SHADER, vsSrc);
  let fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  let prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  if (isWebGL2) {
    try {
      // Explicitly bind attribute location for WebGL2 consistency
      gl.bindAttribLocation(prog, 0, "aPos");
    } catch { }
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  return prog;
}

async function collectWebGPUInfo() {
  let out = {};
  try {
    let navGpu = navigator.gpu;
    if (!navGpu) return { unavailable: true, reason: "no_navigator_gpu" };

    let adapter =
      (await navGpu
        .requestAdapter({ powerPreference: "high-performance" })
        .catch(() => null)) ||
      (await navGpu
        .requestAdapter({ powerPreference: "low-power" })
        .catch(() => null)) ||
      (await navGpu.requestAdapter().catch(() => null));

    if (!adapter) return { unavailable: true, reason: "no_adapter" };

    let features = [];
    try {
      for (let f of adapter.features || []) features.push(f);
      features.sort();
    } catch { }
    let limits = {};
    try {
      if (adapter.limits) {
        for (let [k, v] of Object.entries(adapter.limits)) {
          // Only include numeric-ish limits; avoid giant structures
          if (
            typeof v === "number" ||
            (typeof v === "bigint" && v <= Number.MAX_SAFE_INTEGER)
          ) {
            limits[k] = Number(v);
          }
        }
      }
    } catch { }

    out.name = adapter.name || "";
    out.isFallbackAdapter = !!adapter.isFallbackAdapter;
    out.featuresHash = await sha256(features.join(","));

    // Optional: adapterInfo (Chromium implements requestAdapterInfo; other
    // browsers may not). Guard it carefully.
    try {
      if (typeof adapter.requestAdapterInfo === "function") {
        let info = await adapter.requestAdapterInfo().catch(() => null);
        if (info) {
          let { vendor, architecture, device, description } = info;
          out.adapterInfo = {
            vendor: vendor || "",
            architecture: architecture || "",
            device: device || "",
            description: description || "",
          };
        }
      }
    } catch {
      // ignore
    }

    // Restrict to "limit-like" keys for stability
    let limitKeys = Object.keys(limits).sort();
    let limited = {};
    for (let k of limitKeys) {
      if (
        /^(max.*?|min.*?|limits?|buffer|storage|uniform|textures?)$/i.test(k)
      ) {
        limited[k] = limits[k];
      }
    }
    out.limits = limited;
  } catch (e) {
    out.error = true;
  }
  return out;
}

async function collectAudioFingerprint() {
  let out = {};
  try {
    let AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      // Creating an AudioContext in Firefox/Safari is fine, but be ready to
      // fall back if blocked by policies.
      let ctx = new AC();
      out.deviceSampleRate = Number(ctx.sampleRate) || -1;
      await (ctx.close ? ctx.close() : Promise.resolve()).catch(() => { });
    } else {
      out.deviceSampleRate = -1;
    }
  } catch (_) {
    out.deviceSampleRate = -1;
  }

  // Offline rendering is typically allowed even with autoplay policies.
  try {
    let sampleRate = 44100;
    let frames = 44100;
    let ctx = new OfflineAudioContext(1, frames, sampleRate);

    let osc = new OscillatorNode(ctx, {
      type: "triangle",
      frequency: 997,
    });
    let comp = new DynamicsCompressorNode(ctx, {
      threshold: -50,
      knee: 15,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
    });
    let biquad = new BiquadFilterNode(ctx, {
      type: "peaking",
      frequency: 1200,
      Q: 1.2,
      gain: 6,
    });
    let gain = new GainNode(ctx, { gain: 0.7 });

    osc.connect(comp).connect(biquad).connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(frames / sampleRate);

    let buffer = await ctx.startRendering();
    let ch0 = buffer.getChannelData(0);

    let stride = 256;
    let sig = [];
    for (let i = 0; i < ch0.length; i += stride) {
      let acc = 0;
      let sgn = 0;
      let end = Math.min(i + stride, ch0.length);
      for (let j = i; j < end; j++) {
        let v = ch0[j];
        acc += v * v;
        sgn += v > 0 ? 1 : v < 0 ? -1 : 0;
      }
      let rms = Math.sqrt(acc / (end - i));
      sig.push(rms.toFixed(6), sgn);
    }

    out.offlineHash = await sha256(sig.join(","));
  } catch (e) {
    // Firefox RFP may perturb/limit audio; just mark as error gracefully.
    out.offlineHash = "error";
  }
  return out;
}

async function collectFontsFingerprint() {
  let out = {};
  try {
    if (!document || !document.body) {
      return { hash: "no_body", list: [] };
    }

    // Wait for font loading where supported (Firefox/Safari/Chromium)
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready.catch(() => { });
      }
    } catch { }

    let fontsToCheck = [
      "Noto Sans",
      "Noto Serif",
      "Noto Mono",
      "Noto Sans CJK JP",
      "Noto Sans CJK SC",
      "Noto Color Emoji",
      "DejaVu Sans",
      "DejaVu Serif",
      "DejaVu Sans Mono",
      "Liberation Sans",
      "Liberation Serif",
      "Liberation Mono",
      "Cantarell",
      "Ubuntu",
      "Ubuntu Mono",
      "Fira Sans",
      "Fira Code",
      "Fira Mono",
      "JetBrains Mono",
      "Source Code Pro",
      "Source Sans 3",
      "Inter",
      "Cascadia Code",
      "Inconsolata",
      "Iosevka",
      "Overpass Mono",
      "Open Sans",
      "Roboto",
      "Anonymous Pro",
      "Monaco",
      "Consolas",
      "Georgia",
      "Arial",
      "Verdana",
      "Times New Roman",
      "SF Pro Text",
      "SF Mono",
      "Segoe UI",
      "Apple Color Emoji",
      "Symbola",
    ];

    let detected = detectFonts(fontsToCheck);
    out.list = detected;
    out.hash = await sha256(detected.join(","));
  } catch (e) {
    out.hash = "error";
    out.list = [];
  }
  return out;
}

function detectFonts(fontsToCheck) {
  let testStr = "mmmmmmmmmlliWWw@#字漢한";
  let size = "72px";
  let bases = ["monospace", "serif", "sans-serif"];
  let defaultDims = {};

  let span = document.createElement("span");
  span.style.cssText =
    "position:absolute;left:-9999px;visibility:hidden;line-height:normal;" +
    "white-space:pre;letter-spacing:0;word-spacing:0;-webkit-font-smoothing:auto;" +
    `font-size:${size};`;
  span.textContent = testStr;
  document.body.appendChild(span);

  for (let base of bases) {
    span.style.fontFamily = base;
    defaultDims[base] = { w: span.offsetWidth, h: span.offsetHeight };
  }

  let available = [];
  for (let font of fontsToCheck) {
    let detected = false;
    for (let base of bases) {
      span.style.fontFamily = `'${font}', ${base}`;
      let w = span.offsetWidth;
      let h = span.offsetHeight;
      let d = defaultDims[base];
      if (w !== d.w || h !== d.h) {
        detected = true;
        break;
      }
    }
    if (detected) available.push(font);
  }

  document.body.removeChild(span);
  return available.sort();
}
