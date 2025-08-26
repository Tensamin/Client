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

  const fp = {
    version: "v2",
    ts: Date.now(),
  };

  const [
    ua,
    display,
    intl,
    memCpu,
    canvas2D,
    webgl,
    webgpu,
    audio,
    fonts,
  ] = await Promise.all([
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

  fp.ua = ua; // os/platform architecture
  fp.display = display; // coarse and stable, avoids window inner sizes
  fp.intl = intl; // OS-level locale/timezone traits
  fp.memCpu = memCpu; // bucketed to resist minor tweaks
  fp.canvas2D = canvas2D; // hashed image, small and stable
  fp.webgl = webgl; // vendor/renderer/limits/precision + small render hash
  fp.webgpu = webgpu; // adapter name/features/limits if available
  fp.audio = audio; // offline + device sample rate
  fp.fonts = fonts; // sorted list + hash; mostly OS-driven

  const stableJson = stableStringify({
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

  const hash = await sha256(stableJson);

  if (debug) {
    return { hash, components: fp };
  }
  return hash;
}

function stableStringify(value) {
  const seen = new WeakSet();
  const stringify = (v) => {
    if (v === null || typeof v !== "object") {
      return JSON.stringify(v);
    }
    if (seen.has(v)) return '"[Circular]"';
    seen.add(v);
    if (Array.isArray(v)) {
      return `[${v.map((x) => stringify(x)).join(",")}]`;
    }
    const keys = Object.keys(v).sort();
    const entries = keys.map((k) => `${JSON.stringify(k)}:${stringify(v[k])}`);
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

async function collectUA() {
  const out = {};
  try {
    const uaData = navigator.userAgentData;
    if (uaData && uaData.getHighEntropyValues) {
      const hints = [
        "architecture",
        "bitness",
        "model",
        "platform",
        "platformVersion",
      ];
      const res = await uaData.getHighEntropyValues(hints).catch(() => null);
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
  } catch (e) { }
  try {
    out.platform = navigator.platform || "";
    out.vendor = navigator.vendor || "";
    out.maxTouchPoints = navigator.maxTouchPoints || 0;
  } catch (e) { }
  return out;
}

async function collectDisplay() {
  const out = {};
  try {
    const sw = (screen && screen.width) || -1;
    const sh = (screen && screen.height) || -1;

    const gcd = (a, b) => {
      a = Math.abs(a);
      b = Math.abs(b);
      while (b) {
        const t = b;
        b = a % b;
        a = t;
      }
      return a || 1;
    };
    const g = sw > 0 && sh > 0 ? gcd(sw, sh) : 1;
    const aspect = sw > 0 && sh > 0 ? `${sw / g}:${sh / g}` : "";

    out.screen = {
      width: sw,
      height: sh,
      aspect,
      colorDepth: screen.colorDepth || -1,
      pixelDepth: screen.pixelDepth || -1,
      dpr: window.devicePixelRatio || -1,
      colorGamut: matchMediaQueryColorGamut(),
    };
  } catch (e) {
    out.screen = { error: true };
  }
  return out;
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
  const out = {};
  try {
    const dt = Intl.DateTimeFormat().resolvedOptions();
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
  const out = {};
  try {
    const dm = navigator.deviceMemory;
    const hc = navigator.hardwareConcurrency;
    out.deviceMemoryBucket = bucketDeviceMemory(Number(dm) || -1);
    out.hardwareConcurrencyBucket = bucketCores(Number(hc) || -1);
  } catch (e) {
    out.deviceMemoryBucket = -1;
    out.hardwareConcurrencyBucket = -1;
  }
  return out;
}

async function collectCanvas2DHash() {
  const out = {};
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    canvas.width = 300;
    canvas.height = 120;

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

    const dataUrl = canvas.toDataURL();
    out.hash = await sha256(dataUrl);
  } catch (e) {
    out.hash = "error";
  }
  return out;
}

async function collectWebGLInfoAndHash() {
  const out = {};
  try {
    const canvas = document.createElement("canvas");
    let gl =
      canvas.getContext("webgl2", { antialias: true }) ||
      canvas.getContext("webgl", { antialias: true }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) throw new Error("WebGL unavailable");

    let vendor = "";
    let renderer = "";
    try {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
      }
    } catch (_) { }

    const version = gl.getParameter(gl.VERSION) || "";
    const shadingLang =
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "";

    const limits = {
      MAX_TEXTURE_SIZE: gl.getParameter(gl.MAX_TEXTURE_SIZE) || -1,
      MAX_CUBE_MAP_TEXTURE_SIZE:
        gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) || -1,
      MAX_RENDERBUFFER_SIZE:
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || -1,
      MAX_VERTEX_ATTRIBS: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) || -1,
      MAX_VARYING_VECTORS:
        gl.getParameter(gl.MAX_VARYING_VECTORS) ?? -1,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS:
        gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || -1,
      ALIASED_LINE_WIDTH_RANGE:
        (gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE) || []).join(","),
      ALIASED_POINT_SIZE_RANGE:
        (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) || []).join(","),
      RED_BITS: gl.getParameter(gl.RED_BITS) || -1,
      GREEN_BITS: gl.getParameter(gl.GREEN_BITS) || -1,
      BLUE_BITS: gl.getParameter(gl.BLUE_BITS) || -1,
      ALPHA_BITS: gl.getParameter(gl.ALPHA_BITS) || -1,
      DEPTH_BITS: gl.getParameter(gl.DEPTH_BITS) || -1,
      STENCIL_BITS: gl.getParameter(gl.STENCIL_BITS) || -1,
      MAX_VIEWPORT_DIMS:
        (gl.getParameter(gl.MAX_VIEWPORT_DIMS) || []).join("x"),
    };

    const spf = (shaderType, precisionType) => {
      try {
        const fmt = gl.getShaderPrecisionFormat(shaderType, precisionType);
        return fmt
          ? `${fmt.rangeMin},${fmt.rangeMax},${fmt.precision}`
          : "n/a";
      } catch {
        return "err";
      }
    };
    const precision = {
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

    let extensions = [];
    try {
      const exts = gl.getSupportedExtensions() || [];
      extensions = exts.slice().sort();
    } catch (e) { }

    const renderHash = await webglRenderHash(gl);

    out.vendor = vendor;
    out.renderer = renderer;
    out.version = version;
    out.shadingLanguage = shadingLang;
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

async function webglRenderHash(gl) {
  try {
    const vsSrc =
      "attribute vec2 aPos;varying vec2 vUv;" +
      "void main(){vUv=(aPos+1.0)*0.5;gl_Position=vec4(aPos,0.0,1.0);}";

    const fsSrc =
      "precision highp float;varying vec2 vUv;" +
      "float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))" +
      "*43758.5453);}" +
      "void main(){vec2 p=vUv;" +
      "float v=sin(40.0*p.x)*cos(40.0*p.y);" +
      "float n=hash(p*vec2(128.0,96.0));" +
      "gl_FragColor=vec4(fract(v*0.75+n*0.25),p,1.0);}";

    const prog = createProgram(gl, vsSrc, fsSrc);
    if (!prog) throw new Error("Program compile failed");
    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, "aPos");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Big triangle to cover viewport
    const verts = new Float32Array([-1, -1, 3, -1, -1, 3]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, 64, 64);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const pixels = new Uint8Array(64 * 64 * 4);
    gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return await sha256(pixels);
  } catch (e) {
    return "render_error";
  }
}

function createProgram(gl, vsSrc, fsSrc) {
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  return prog;
}

async function collectWebGPUInfo() {
  const out = {};
  try {
    const navGpu = navigator.gpu;
    if (!navGpu) return { unavailable: true };
    const adapter =
      (await navGpu
        .requestAdapter({ powerPreference: "high-performance" })
        .catch(() => null)) ||
      (await navGpu.requestAdapter().catch(() => null));

    if (!adapter) return { unavailable: true };

    const features = Array.from(adapter.features || []).sort();
    const limits = {};
    if (adapter.limits) {
      Object.keys(adapter.limits).forEach((k) => {
        limits[k] = adapter.limits[k];
      });
    }

    out.name = adapter.name || "";
    out.isFallbackAdapter = !!adapter.isFallbackAdapter;
    out.featuresHash = await sha256(features.join(","));
    const limitKeys = Object.keys(limits).sort();
    const limited = {};
    for (const k of limitKeys) {
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
  const out = {};
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      out.deviceSampleRate = ctx.sampleRate || -1;
      await ctx.close().catch(() => {});
    } else {
      out.deviceSampleRate = -1;
    }
  } catch (_) {
    out.deviceSampleRate = -1;
  }

  try {
    const sampleRate = 44100;
    const frames = 44100;
    const ctx = new OfflineAudioContext(1, frames, sampleRate);

    const osc = new OscillatorNode(ctx, {
      type: "triangle",
      frequency: 997,
    });
    const comp = new DynamicsCompressorNode(ctx, {
      threshold: -50,
      knee: 15,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
    });
    const biquad = new BiquadFilterNode(ctx, {
      type: "peaking",
      frequency: 1200,
      Q: 1.2,
      gain: 6,
    });
    const gain = new GainNode(ctx, { gain: 0.7 });

    osc.connect(comp).connect(biquad).connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(frames / sampleRate);

    const buffer = await ctx.startRendering();
    const ch0 = buffer.getChannelData(0);

    const stride = 256;
    const sig = [];
    for (let i = 0; i < ch0.length; i += stride) {
      let acc = 0;
      let sgn = 0;
      const end = Math.min(i + stride, ch0.length);
      for (let j = i; j < end; j++) {
        const v = ch0[j];
        acc += v * v;
        sgn += v > 0 ? 1 : v < 0 ? -1 : 0;
      }
      const rms = Math.sqrt(acc / (end - i));
      sig.push(rms.toFixed(6), sgn);
    }

    out.offlineHash = await sha256(sig.join(","));
  } catch (e) {
    out.offlineHash = "error";
  }
  return out;
}

async function collectFontsFingerprint() {
  const out = {};
  try {
    if (!document || !document.body) {
      return { hash: "no_body", list: [] };
    }

    const fontsToCheck = [
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

    const detected = detectFonts(fontsToCheck);
    out.list = detected;
    out.hash = await sha256(detected.join(","));
  } catch (e) {
    out.hash = "error";
    out.list = [];
  }
  return out;
}

function detectFonts(fontsToCheck) {
  const testStr = "mmmmmmmmmlliWWw@#字漢한";
  const size = "72px";
  const bases = ["monospace", "serif", "sans-serif"];
  const defaultDims = {};

  const span = document.createElement("span");
  span.style.cssText =
    "position:absolute;left:-9999px;visibility:hidden;line-height:normal;" +
    `font-size:${size};`;
  span.textContent = testStr;
  document.body.appendChild(span);

  for (const base of bases) {
    span.style.fontFamily = base;
    defaultDims[base] = { w: span.offsetWidth, h: span.offsetHeight };
  }

  const available = [];
  for (const font of fontsToCheck) {
    let detected = false;
    for (const base of bases) {
      span.style.fontFamily = `'${font}', ${base}`;
      const w = span.offsetWidth;
      const h = span.offsetHeight;
      const d = defaultDims[base];
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