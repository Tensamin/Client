import * as Comlink from "comlink";
import { JWK, BasicSuccessMessage } from "@/lib/types";

type Base64URLString = string;

const textEncoder = new TextEncoder();
const crypto = globalThis.crypto;

export async function encrypt(
  input: string,
  password: string
): Promise<BasicSuccessMessage> {
  try {
    const decodedData = Uint8Array.from(input, (c) => c.charCodeAt(0));

    const passwordHash = await crypto.subtle.digest(
      "SHA-256",
      textEncoder.encode(password)
    );

    const derivedKey = await crypto.subtle.importKey(
      "raw",
      passwordHash,
      { name: "AES-CBC", length: 256 },
      false,
      ["encrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(16));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      derivedKey,
      decodedData
    );

    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return { success: true, message: btoa(String.fromCharCode(...combined)) };
  } catch {
    return { success: false, message: "ERROR_ENCRYPTION_WORKER_ENCRYPT" };
  }
}

export async function decrypt(
  input: Base64URLString,
  password: string
): Promise<BasicSuccessMessage> {
  try {
    const combinedDecoded = Uint8Array.from(atob(input), (c) =>
      c.charCodeAt(0)
    );

    const iv = combinedDecoded.subarray(0, 16);
    const ciphertext = combinedDecoded.subarray(16);

    const passwordHash = await crypto.subtle.digest(
      "SHA-256",
      textEncoder.encode(password)
    );

    const derivedKey = await crypto.subtle.importKey(
      "raw",
      passwordHash,
      { name: "AES-CBC", length: 256 },
      false,
      ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      derivedKey,
      ciphertext
    );

    const decryptedData = new Uint8Array(decryptedBuffer);
    return {
      success: true,
      message: String.fromCharCode(...decryptedData),
    };
  } catch {
    return { success: false, message: "ERROR_ENCRYPTION_WORKER_DECRYPT" };
  }
}

export async function get_shared_secret(
  own_private_key: string,
  own_public_key: string,
  other_public_key: string
): Promise<BasicSuccessMessage> {
  try {
    const other_jwk: JWK = { kty: "OKP", crv: "X448", x: other_public_key };
    const own_jwk: JWK = {
      kty: "OKP",
      crv: "X448",
      x: own_public_key,
      d: own_private_key,
    };

    const bytesToHex = (u8: Uint8Array): string =>
      Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");

    const haveAtobBtoa = (): boolean =>
      typeof atob === "function" && typeof btoa === "function";

    const b64ToBytes = (s: Base64URLString): Uint8Array => {
      if (haveAtobBtoa()) {
        const bin = atob(s);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      // Node fallback
      return new Uint8Array(Buffer.from(s, "base64"));
    };

    const b64uToBytes = (s: Base64URLString): Uint8Array => {
      const b64 =
        s.replace(/-/g, "+").replace(/_/g, "/") +
        "===".slice((s.length + 3) % 4);
      return b64ToBytes(b64);
    };

    const bytesToB64u = (u8: Uint8Array): string => {
      let b64: string;
      if (haveAtobBtoa()) {
        b64 = btoa(String.fromCharCode(...u8));
      } else {
        b64 = Buffer.from(u8).toString("base64");
      }
      return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    };

    const decodeBase64Auto = (s: string): Uint8Array =>
      /[-_]/.test(s) ? b64uToBytes(s) : b64ToBytes(s);

    const readTLV = (view: Uint8Array, off: number) => {
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
    };

    const ensureOidX448 = (view: Uint8Array, start: number): boolean => {
      const oid = readTLV(view, start);
      if (oid.tag !== 0x06) return false;
      const len = oid.end - oid.start;
      if (len !== 3) return false;
      return (
        view[oid.start] === 0x2b &&
        view[oid.start + 1] === 0x65 &&
        view[oid.start + 2] === 0x6f
      );
    };

    const extractRawX448FromSPKI = (spkiBytes: Uint8Array): Uint8Array => {
      const view = spkiBytes;
      const outer = readTLV(view, 0);
      if (outer.tag !== 0x30) throw new Error("SPKI: expected SEQUENCE");
      const alg = readTLV(view, outer.start);
      if (alg.tag !== 0x30)
        throw new Error("SPKI: expected AlgorithmIdentifier");
      if (!ensureOidX448(view, alg.start)) throw new Error("SPKI: not X448");
      const bitstr = readTLV(view, alg.end);
      if (bitstr.tag !== 0x03) throw new Error("SPKI: expected BIT STRING");
      const unusedBits = view[bitstr.start];
      if (unusedBits !== 0x00) throw new Error("SPKI: unexpected unused bits");
      const raw = view.subarray(bitstr.start + 1, bitstr.end);
      if (raw.length !== 56)
        throw new Error("SPKI: X448 public key must be 56 bytes");
      return raw;
    };

    const extractRawX448FromPKCS8 = (pkcs8Bytes: Uint8Array): Uint8Array => {
      const view = pkcs8Bytes;
      const outer = readTLV(view, 0);
      if (outer.tag !== 0x30) throw new Error("PKCS8: expected SEQUENCE");
      let off = outer.start;

      const version = readTLV(view, off);
      if (version.tag !== 0x02)
        throw new Error("PKCS8: expected version INTEGER");
      off = version.end;

      const alg = readTLV(view, off);
      if (alg.tag !== 0x30)
        throw new Error("PKCS8: expected AlgorithmIdentifier");
      if (!ensureOidX448(view, alg.start)) throw new Error("PKCS8: not X448");
      off = alg.end;

      const priv = readTLV(view, off);
      if (priv.tag !== 0x04)
        throw new Error("PKCS8: expected privateKey OCTET STRING");
      let raw = view.subarray(priv.start, priv.end);

      // Some encoders nest another OCTET STRING inside
      if (raw[0] === 0x04) {
        const inner = readTLV(raw, 0);
        if (inner.tag === 0x04) {
          raw = raw.subarray(inner.start, inner.end);
        }
      }
      if (raw.length !== 56)
        throw new Error("PKCS8: X448 private key must be 56 bytes");
      return raw;
    };

    const normalizeOkpX448Jwk = (jwk: JWK, label: string): JWK => {
      if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "X448") {
        throw new Error(`${label}: expected OKP JWK with crv "X448"`);
      }
      const out = { ...jwk };

      if (out.x) {
        const xBytes = decodeBase64Auto(out.x);
        let rawX: Uint8Array;
        try {
          rawX = extractRawX448FromSPKI(xBytes);
        } catch {
          if (xBytes.length !== 56) {
            throw new Error(
              `${label}: "x" is not a valid X448 SPKI or raw 56-byte key`
            );
          }
          rawX = xBytes;
        }
        out.x = bytesToB64u(rawX);
      }

      if (out.d) {
        const dBytes = decodeBase64Auto(out.d);
        let rawD: Uint8Array;
        try {
          rawD = extractRawX448FromPKCS8(dBytes);
        } catch {
          if (dBytes.length !== 56) {
            throw new Error(
              `${label}: "d" is not a valid X448 PKCS#8 or raw 56-byte key`
            );
          }
          rawD = dBytes;
        }
        out.d = bytesToB64u(rawD);
      }

      return out;
    };

    const getSubtle = () => globalThis.crypto?.subtle;

    {
      /*
    const hkdfAesGcmFromShared = async (
      sharedSecret: BufferSource,
      infoStr: string
    ): Promise<CryptoKey> => {
      const subtle = getSubtle();
      if (!subtle) throw new Error("WebCrypto subtle not available");
      const info = textEncoder.encode(infoStr);
      const baseKey = await subtle.importKey(
        "raw",
        sharedSecret,
        "HKDF",
        false,
        ["deriveKey"]
      );
      return await subtle.deriveKey(
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
    };
    */
    }

    const myJwk: JWK = normalizeOkpX448Jwk(own_jwk, "own_jwk");
    const peerJwk: JWK = normalizeOkpX448Jwk(other_jwk, "other_jwk");

    const subtle = getSubtle();
    //const infoStr = `ECDH-X448-AES-GCM-v1|my=${myJwk.x}|peer=${peerJwk.x}`;

    if (subtle) {
      const algorithms = [
        { name: "ECDH", namedCurve: "X448" },
        { name: "X448" },
      ];

      for (const algorithm of algorithms) {
        try {
          const [myPriv, peerPub] = await Promise.all([
            subtle.importKey("jwk", myJwk, algorithm, false, ["deriveBits"]),
            subtle.importKey("jwk", peerJwk, algorithm, false, []),
          ]);

          const sharedBits = await subtle.deriveBits(
            { name: algorithm.name, public: peerPub },
            myPriv,
            448
          );

          const sharedSecret = new Uint8Array(sharedBits);
          //const aeadKey = await hkdfAesGcmFromShared(sharedSecret, infoStr);

          return { success: true, message: bytesToHex(sharedSecret) };
        } catch {}
      }
    }

    const { d: dMyB64u } = myJwk;
    //const { x: xMyB64u, d: dMyB64u } = myJwk;
    const { x: xPeerB64u } = peerJwk;

    if (!dMyB64u || !xPeerB64u) {
      return {
        success: false,
        message: "ERROR_ENCRYPTION_WORKER_GET_SHARED_SECRET_MISSING_KEY",
      };
    }

    const [dRaw, xRawPeer] = [b64uToBytes(dMyB64u), b64uToBytes(xPeerB64u)];
    if (dRaw.length !== 56 || xRawPeer.length !== 56) {
      return {
        success: false,
        message:
          "ERROR_ENCRYPTION_WORKER_GET_SHARED_SECRET_INVALID_KEY_LENGTHS",
      };
    }

    const { x448 } = await import("@noble/curves/ed448");
    const sharedSecret = new Uint8Array(x448.getSharedSecret(dRaw, xRawPeer));
    //const aeadKey = await hkdfAesGcmFromShared(sharedSecret, infoStr);

    return { success: true, message: bytesToHex(sharedSecret) };
  } catch {
    return {
      success: false,
      message: "ERROR_ENCRYPTION_WORKER_GET_SHARED_SECRET_GENERIC",
    };
  }
}

Comlink.expose({
  encrypt,
  decrypt,
  get_shared_secret,
});
