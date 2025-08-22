"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { x448 } from "@noble/curves/ed448";

const publicKey =
  "MEIwBQYDK2VvAzkASD+5uTRymJDqLT7Ozut0FrPuv5Wtj22u7ZaEtbjf9/qo9ndi+yqZ4AMBXXwUGDQnQMG59YaBQ44=";

const myJWK = {
  kty: "OKP",
  d: "MEYCAQAwBQYDK2VvBDoEOIeOc33kgfDvkkGwnSGW9BgX8QhUTuD8cxKjONWeNx65-zW0PEpufcsuTKrKeGVHh0WkzlAz94Fl",
  use: "enc",
  crv: "X448",
  kid: "feaedf96-e024-47b0-b2fb-5d70d2505d71",
  x: "MEIwBQYDK2VvAzkAEUE8wAS6wOdzeSVNe2X_fa3QrksOT4GUqlqmHlKIxwyP2go3wHuQaYRzzFmjJP7DpoF3PFmIhog",
  alg: "ECDH-ES",
};

const peerJWK = {
  kty: "OKP",
  crv: "X448",
  x: publicKey,
};

function bytesToHex(u8) {
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function b64uToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64ToBytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64u(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Auto(s) {
  // Detect base64url vs base64, try url-safe first if it contains '-'/'_'
  if (/[-_]/.test(s)) return b64uToBytes(s);
  return b64ToBytes(s);
}

// Very small DER reader (enough for X448 SPKI/PKCS#8)
function readTLV(view, off) {
  const tag = view[off++];
  if (off >= view.length) throw new Error("DER: truncated");
  let len = view[off++];
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0) throw new Error("DER: indefinite length not supported");
    if (off + n > view.length) throw new Error("DER: truncated length");
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | view[off++];
  }
  const start = off;
  const end = off + len;
  if (end > view.length) throw new Error("DER: content truncated");
  return { tag, len, start, end };
}

function ensureOidX448(view, start, end) {
  // Parse AlgorithmIdentifier ::= SEQUENCE { algorithm OBJECT IDENTIFIER, ... }
  const oid = readTLV(view, start);
  if (oid.tag !== 0x06) return false;
  const len = oid.end - oid.start;
  if (len !== 3) return false;
  return (
    view[oid.start] === 0x2b &&
    view[oid.start + 1] === 0x65 &&
    view[oid.start + 2] === 0x6f
  );
}

// Extract raw 56-byte public key from SPKI
function extractRawX448FromSPKI(spkiBytes) {
  const view = spkiBytes;
  const outer = readTLV(view, 0);
  if (outer.tag !== 0x30) throw new Error("SPKI: expected SEQUENCE");
  // algorithm
  const alg = readTLV(view, outer.start);
  if (alg.tag !== 0x30) throw new Error("SPKI: expected AlgorithmIdentifier");
  if (!ensureOidX448(view, alg.start, alg.end)) {
    throw new Error("SPKI: not X448");
  }
  // subjectPublicKey BIT STRING
  const bitstr = readTLV(view, alg.end);
  if (bitstr.tag !== 0x03) throw new Error("SPKI: expected BIT STRING");
  const unusedBits = view[bitstr.start];
  if (unusedBits !== 0x00) throw new Error("SPKI: unexpected unused bits");
  const raw = view.subarray(bitstr.start + 1, bitstr.end);
  if (raw.length !== 56) throw new Error("SPKI: X448 public key must be 56 bytes");
  return raw;
}

// Extract raw 56-byte private key from PKCS#8
function extractRawX448FromPKCS8(pkcs8Bytes) {
  const view = pkcs8Bytes;
  const outer = readTLV(view, 0);
  if (outer.tag !== 0x30) throw new Error("PKCS8: expected SEQUENCE");
  let off = outer.start;
  const version = readTLV(view, off);
  if (version.tag !== 0x02) throw new Error("PKCS8: expected version INTEGER");
  off = version.end;

  const alg = readTLV(view, off);
  if (alg.tag !== 0x30) throw new Error("PKCS8: expected AlgorithmIdentifier");
  if (!ensureOidX448(view, alg.start, alg.end)) {
    throw new Error("PKCS8: not X448");
  }
  off = alg.end;

  const priv = readTLV(view, off);
  if (priv.tag !== 0x04) throw new Error("PKCS8: expected privateKey OCTET STRING");
  let raw = view.subarray(priv.start, priv.end);

  // Some encoders nest another OCTET STRING inside
  if (raw[0] === 0x04) {
    const inner = readTLV(raw, 0);
    if (inner.tag === 0x04) {
      raw = raw.subarray(inner.start, inner.end);
    }
  }
  if (raw.length !== 56) throw new Error("PKCS8: X448 private key must be 56 bytes");
  return raw;
}

// Your JWKs have DER/SPKI in x/d. Convert to proper OKP JWK raw values.
function normalizeOkpX448Jwk(jwk, label) {
  if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "X448") {
    throw new Error(`${label}: expected OKP JWK with crv "X448"`);
  }
  const out = { ...jwk };

  if (out.x) {
    const xBytes = decodeBase64Auto(out.x);
    // Try SPKI first; if it fails, assume it's already raw
    let rawX;
    try {
      rawX = extractRawX448FromSPKI(xBytes);
    } catch {
      if (xBytes.length !== 56) {
        throw new Error(`${label}: "x" is not a valid X448 SPKI or raw 56-byte key`);
      }
      rawX = xBytes;
    }
    out.x = bytesToB64u(rawX);
  }

  if (out.d) {
    const dBytes = decodeBase64Auto(out.d);
    let rawD;
    try {
      rawD = extractRawX448FromPKCS8(dBytes);
    } catch {
      if (dBytes.length !== 56) {
        throw new Error(`${label}: "d" is not a valid X448 PKCS#8 or raw 56-byte key`);
      }
      rawD = dBytes;
    }
    out.d = bytesToB64u(rawD);
  }

  return out;
}

async function hkdfAesGcmFromShared(sharedSecret, infoStr) {
  const subtle = globalThis.crypto.subtle;
  const info = new TextEncoder().encode(infoStr);
  const baseKey = await subtle.importKey("raw", sharedSecret, "HKDF", false, [
    "deriveKey",
  ]);
  const aeadKey = await subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return aeadKey;
}

async function deriveSharedSecretAeadX448(myJwkIn, peerPublicJwkIn) {
  const myJwk = normalizeOkpX448Jwk(myJwkIn, "myJwk");
  const peerJwk = normalizeOkpX448Jwk(peerPublicJwkIn, "peerPublicJwk");

  if (!myJwk.d || !myJwk.x) {
    throw new Error('myJwk must contain both "d" and "x"');
  }
  if (!peerJwk.x) {
    throw new Error('peerPublicJwk must contain "x"');
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto subtle not available");

  const infoStr = `ECDH-X448-AES-GCM-v1|my=${myJwk.x}|peer=${peerJwk.x}`;

  // Try native WebCrypto X448 first
  try {
    const myPrivateKey = await subtle.importKey(
      "jwk",
      myJwk,
      { name: "X448" },
      false,
      ["deriveBits", "deriveKey"]
    );
    const peerPublicKey = await subtle.importKey(
      "jwk",
      peerJwk,
      { name: "X448" },
      false,
      []
    );

    const sharedBits = await subtle.deriveBits(
      { name: "X448", public: peerPublicKey },
      myPrivateKey,
      448
    );
    const sharedSecret = new Uint8Array(sharedBits);
    const aeadKey = await hkdfAesGcmFromShared(sharedSecret, infoStr);

    return {
      aeadKey,
      sharedSecret,
      sharedSecretHex: bytesToHex(sharedSecret),
      backend: "webcrypto",
    };
  } catch (e) {
    // Fallback to pure JS x448 if the algorithm is missing
    if (!/NotSupportedError|Unrecognized name/i.test(String(e))) {
      // If it's some other error (e.g., bad JWK), surface it
      throw e;
    }
  }

  // Fallback: derive with @noble/curves x448, still using the JWK values
  const dRaw = b64uToBytes(myJwk.d);
  const xRawPeer = b64uToBytes(peerJwk.x);
  if (dRaw.length !== 56 || xRawPeer.length !== 56) {
    throw new Error("Invalid X448 key lengths after normalization");
  }

  const sharedSecret = x448.getSharedSecret(dRaw, xRawPeer);
  const aeadKey = await hkdfAesGcmFromShared(sharedSecret, infoStr);

  return {
    aeadKey,
    sharedSecret,
    sharedSecretHex: bytesToHex(sharedSecret),
    backend: "noble-x448",
  };
}

export default function Page() {
  const [sharedSecret, setSharedSecret] = useState("None");

  const fixedMyJwk = myJWK;
  const fixedPeerJwk = peerJWK;

  return (
    <div className="p-6 space-y-4">
      <Button
        onClick={async () => {
          try {
            const { sharedSecretHex, backend } =
              await deriveSharedSecretAeadX448(fixedMyJwk, fixedPeerJwk);
            setSharedSecret(`${sharedSecretHex} (via ${backend})`);
          } catch (e) {
            setSharedSecret(`Error: ${e?.message || e}`);
          }
        }}
      >
        Get Key
      </Button>
      <div className="font-mono break-all">{sharedSecret}</div>
    </div>
  );
}