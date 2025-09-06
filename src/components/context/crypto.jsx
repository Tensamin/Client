"use client";

// Package Imports
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { v7 as uuidv7 } from "uuid";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";

// Lib Imports
import { endpoint } from "@/lib/endpoints";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { log, isElectron, sha256, RETRIES } from "@/lib/utils";
import ls from "@/lib/local_storage";

// Components
import { Loading } from "@/components/loading";

// Main
let CryptoContext = createContext();

// Use Context Function
export function useCryptoContext() {
  let context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error("useCryptoContext must be used within a CryptoProvider");
  }
  return context;
}

// Provider
export function CryptoProvider({ children }) {
  let [privateKey, setPrivateKey] = useState("pending");
  let [privateKeyHash, setPrivateKeyHash] = useState("pending");
  let [worker, setWorker] = useState(null);
  let [unsupported, setUnsupported] = useState(false);
  let [isInitialized, setIsInitialized] = useState(false);
  let requestResolvers = useRef(new Map());
  let retryCountRef = useRef(0);
  let router = useRouter();

  useEffect(() => {
    if (window.Worker) {
      let encryptionWorker = new Worker("/encryption.js");

      encryptionWorker.onmessage = (event) => {
        let { result, error, id } = event.data;

        if (requestResolvers.current.has(id)) {
          let { resolve, reject } = requestResolvers.current.get(id);

          if (error) {
            reject(new Error(error));
          } else {
            resolve(result);
          }

          requestResolvers.current.delete(id);
        }
      };

      setWorker(encryptionWorker);
      log(
        "Encryption worker initialized and started.",
        "debug",
        "Encryption Provider:"
      );

      return () => {
        requestResolvers.current.forEach(({ reject }) => {
          reject(new Error("EncryptionProvider unmounted."));
        });
        encryptionWorker.terminate();
        log("Encryption worker terminated.", "debug", "Encryption Provider:");
      };
    } else {
      setUnsupported(true);
    }
  }, []);

  let sendToWorker = useCallback(
    (data) => {
      if (!worker) {
        return Promise.reject(new Error("Worker is not initialized."));
      }

      return new Promise((resolve, reject) => {
        let id = uuidv7();

        let timeoutId = setTimeout(() => {
          if (requestResolvers.current.has(id)) {
            reject(new Error("Request to encryption worker timed out."));
            requestResolvers.current.delete(id);
          }
        }, 10000); // 10-second timeout

        requestResolvers.current.set(id, {
          resolve: (value) => {
            clearTimeout(timeoutId);
            resolve(value);
          },
          reject: (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
        });

        worker.postMessage({
          ...data,
          id: id,
        });
      });
    },
    [worker]
  );

  let encrypt_base64_using_aes = useCallback(
    async (data, key) => {
      return await sendToWorker({
        type: "encrypt_base64_using_aes",
        data,
        key,
      });
    },
    [sendToWorker]
  );

  let decrypt_base64_using_aes = useCallback(
    async (data, key) => {
      return await sendToWorker({
        type: "decrypt_base64_using_aes",
        data,
        key,
      });
    },
    [sendToWorker]
  );

  async function get_shared_secret(own_jwk, other_jwk_raw) {
    let other_jwk = { kty: "OKP", crv: "X448", x: other_jwk_raw };

    // --- utils ---
    function bytesToHex(u8) {
      return Array.from(u8)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    function haveAtobBtoa() {
      return typeof atob === "function" && typeof btoa === "function";
    }

    function b64ToBytes(s) {
      if (haveAtobBtoa()) {
        let bin = atob(s);
        let out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      // Node fallback
      return new Uint8Array(Buffer.from(s, "base64"));
    }

    function b64uToBytes(s) {
      let b64 =
        s.replace(/-/g, "+").replace(/_/g, "/") +
        "===".slice((s.length + 3) % 4);
      return b64ToBytes(b64);
    }

    function bytesToB64u(u8) {
      let b64;
      if (haveAtobBtoa()) {
        let s = "";
        for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        b64 = btoa(s);
      } else {
        b64 = Buffer.from(u8).toString("base64");
      }
      return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodeBase64Auto(s) {
      // Detect base64url vs base64, try url-safe first if it contains '-'/'_'
      if (/[-_]/.test(s)) return b64uToBytes(s);
      return b64ToBytes(s);
    }

    // --- tiny DER helpers (only what's needed for X448 SPKI/PKCS#8) ---
    function readTLV(view, off) {
      let tag = view[off++];
      if (off >= view.length) throw new Error("DER: truncated");
      let len = view[off++];
      if (len & 0x80) {
        let n = len & 0x7f;
        if (n === 0) throw new Error("DER: indefinite length not supported");
        if (off + n > view.length) throw new Error("DER: truncated length");
        len = 0;
        for (let i = 0; i < n; i++) len = (len << 8) | view[off++];
      }
      let start = off;
      let end = off + len;
      if (end > view.length) throw new Error("DER: content truncated");
      return { tag, len, start, end };
    }

    function ensureOidX448(view, start) {
      // AlgorithmIdentifier ::= SEQUENCE { algorithm OBJECT IDENTIFIER, ... }
      let oid = readTLV(view, start);
      if (oid.tag !== 0x06) return false;
      let len = oid.end - oid.start;
      if (len !== 3) return false;
      // 1.3.101.111 => 06 03 2B 65 6F
      return (
        view[oid.start] === 0x2b &&
        view[oid.start + 1] === 0x65 &&
        view[oid.start + 2] === 0x6f
      );
    }

    function extractRawX448FromSPKI(spkiBytes) {
      let view = spkiBytes;
      let outer = readTLV(view, 0);
      if (outer.tag !== 0x30) throw new Error("SPKI: expected SEQUENCE");
      let alg = readTLV(view, outer.start);
      if (alg.tag !== 0x30)
        throw new Error("SPKI: expected AlgorithmIdentifier");
      if (!ensureOidX448(view, alg.start)) throw new Error("SPKI: not X448");
      let bitstr = readTLV(view, alg.end);
      if (bitstr.tag !== 0x03) throw new Error("SPKI: expected BIT STRING");
      let unusedBits = view[bitstr.start];
      if (unusedBits !== 0x00) throw new Error("SPKI: unexpected unused bits");
      let raw = view.subarray(bitstr.start + 1, bitstr.end);
      if (raw.length !== 56)
        throw new Error("SPKI: X448 public key must be 56 bytes");
      return raw;
    }

    function extractRawX448FromPKCS8(pkcs8Bytes) {
      let view = pkcs8Bytes;
      let outer = readTLV(view, 0);
      if (outer.tag !== 0x30) throw new Error("PKCS8: expected SEQUENCE");
      let off = outer.start;

      let version = readTLV(view, off);
      if (version.tag !== 0x02)
        throw new Error("PKCS8: expected version INTEGER");
      off = version.end;

      let alg = readTLV(view, off);
      if (alg.tag !== 0x30)
        throw new Error("PKCS8: expected AlgorithmIdentifier");
      if (!ensureOidX448(view, alg.start)) throw new Error("PKCS8: not X448");
      off = alg.end;

      let priv = readTLV(view, off);
      if (priv.tag !== 0x04)
        throw new Error("PKCS8: expected privateKey OCTET STRING");
      let raw = view.subarray(priv.start, priv.end);

      // Some encoders nest another OCTET STRING inside
      if (raw[0] === 0x04) {
        let inner = readTLV(raw, 0);
        if (inner.tag === 0x04) {
          raw = raw.subarray(inner.start, inner.end);
        }
      }
      if (raw.length !== 56)
        throw new Error("PKCS8: X448 private key must be 56 bytes");
      return raw;
    }

    function normalizeOkpX448Jwk(jwk, label) {
      if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "X448") {
        throw new Error(`${label}: expected OKP JWK with crv "X448"`);
      }
      let out = { ...jwk };

      if (out.x) {
        let xBytes = decodeBase64Auto(out.x);
        let rawX;
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
        let dBytes = decodeBase64Auto(out.d);
        let rawD;
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
    }

    function getSubtle() {
      if (globalThis.crypto && globalThis.crypto.subtle) {
        return globalThis.crypto.subtle;
      }
      try {
        // Node.js fallback
        // eslint-disable-next-line no-undef
        let nodeCrypto = require("crypto");
        if (nodeCrypto?.webcrypto?.subtle) return nodeCrypto.webcrypto.subtle;
      } catch {}
      return undefined;
    }

    async function hkdfAesGcmFromShared(sharedSecret, infoStr) {
      let subtle = getSubtle();
      if (!subtle) throw new Error("WebCrypto subtle not available");
      let info = new TextEncoder().encode(infoStr);
      let baseKey = await subtle.importKey("raw", sharedSecret, "HKDF", false, [
        "deriveKey",
      ]);
      let aeadKey = await subtle.deriveKey(
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

    // --- normalize inputs ---
    let myJwk = normalizeOkpX448Jwk(own_jwk, "own_jwk");
    let peerJwk = normalizeOkpX448Jwk(other_jwk, "other_jwk");

    if (!myJwk.d || !myJwk.x) {
      throw new Error(
        'own_jwk must contain both "d" (private) and "x" (public)'
      );
    }
    if (!peerJwk.x) {
      throw new Error('other_jwk must contain "x" (public)');
    }

    let subtle = getSubtle();
    let infoStr = `ECDH-X448-AES-GCM-v1|my=${myJwk.x}|peer=${peerJwk.x}`;

    // --- try native WebCrypto first (best-case) ---
    if (subtle) {
      // Try ECDH with namedCurve first (spec way)
      try {
        let myPriv = await subtle.importKey(
          "jwk",
          myJwk,
          { name: "ECDH", namedCurve: "X448" },
          false,
          ["deriveBits"]
        );
        let peerPub = await subtle.importKey(
          "jwk",
          peerJwk,
          { name: "ECDH", namedCurve: "X448" },
          false,
          []
        );
        let sharedBits = await subtle.deriveBits(
          { name: "ECDH", public: peerPub },
          myPriv,
          448
        );
        let sharedSecret = new Uint8Array(sharedBits);
        let aeadKey = await hkdfAesGcmFromShared(sharedSecret, infoStr);
        return {
          aeadKey,
          sharedSecret,
          sharedSecretHex: bytesToHex(sharedSecret),
          backend: "webcrypto-ecdh",
        };
      } catch (e) {
        // Ignore and try alternative or fallback
      }

      // Some engines might expose "X448" as the algorithm name directly
      try {
        let myPriv = await subtle.importKey(
          "jwk",
          myJwk,
          { name: "X448" },
          false,
          ["deriveBits"]
        );
        let peerPub = await subtle.importKey(
          "jwk",
          peerJwk,
          { name: "X448" },
          false,
          []
        );
        let sharedBits = await subtle.deriveBits(
          { name: "X448", public: peerPub },
          myPriv,
          448
        );
        let sharedSecret = new Uint8Array(sharedBits);
        let aeadKey = await hkdfAesGcmFromShared(sharedSecret, infoStr);
        return {
          aeadKey,
          sharedSecret,
          sharedSecretHex: bytesToHex(sharedSecret),
          backend: "webcrypto-x448",
        };
      } catch (e) {
        // If it's some other error (bad JWK), we still try noble fallback below.
      }
    }

    // --- fallback: pure JS x448 via @noble/curves ---
    let { x: xMyB64u, d: dMyB64u } = myJwk;
    let { x: xPeerB64u } = peerJwk;

    let dRaw = b64uToBytes(dMyB64u);
    let xRawPeer = b64uToBytes(xPeerB64u);
    if (dRaw.length !== 56 || xRawPeer.length !== 56) {
      throw new Error("Invalid X448 key lengths after normalization");
    }

    let { x448 } = await import("@noble/curves/ed448");
    let sharedSecret = x448.getSharedSecret(dRaw, xRawPeer);

    // We still use WebCrypto HKDF + AES-GCM to produce a usable AEAD key.
    let aeadKey = await hkdfAesGcmFromShared(sharedSecret, infoStr);

    return {
      aeadKey,
      sharedSecret,
      sharedSecretHex: bytesToHex(sharedSecret),
      backend: "noble-x448",
    };
  }

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    let fetchAndDecryptPrivateKey = async () => {
      if (!isMounted) return;

      if (typeof window === "undefined" || !window.localStorage) {
        if (isMounted) {
          router.push("/login");
          setIsInitialized(true);
        }
        return;
      }

      let encrypted_private_key = ls.get("auth_private_key");
      let uuid = ls.get("auth_uuid");
      let cred_id = ls.get("auth_cred_id");

      if (!encrypted_private_key || !uuid) {
        if (window.location.pathname !== "/login" && isMounted) {
          router.push("/login");
        }
        if (isMounted) setIsInitialized(true);
        return;
      }

      try {
        let lambda;

        if (isElectron()) {
          lambda = await window?.keyring?.get("net.methanium.tensamin", uuid);
        } else if (ls.get("auth_lambda")) {
          lambda = await decrypt_base64_using_aes(
            ls.get("auth_lambda"),
            await getDeviceFingerprint()
          );
        } else {
          let resp = await fetch(
            `${endpoint.webauthn_login_options}${uuid}/${cred_id}`
          );
          let data = await resp.json();
          if (data?.type === "error") {
            throw new Error(data.log?.message || "Failed to get options");
          }
          let options = JSON.parse(atob(data.data.options));

          let attestation = await startAuthentication(options);

          let verifyResp = await fetch(
            `${endpoint.webauthn_login_verify}${uuid}/${cred_id}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ attestation }),
            }
          );

          let verifyData = await verifyResp.json();
          if (verifyData?.type === "error") {
            throw new Error(verifyData.log?.message || "Passkey verify failed");
          }
          lambda = verifyData.data.lambda;
        }

        let rawDecryptedKey = await decrypt_base64_using_aes(
          encrypted_private_key,
          lambda
        );
        let decryptedKey = JSON.parse(atob(rawDecryptedKey));

        let newPrivateKeyHash = await sha256(decryptedKey.d);

        if (isMounted) {
          setPrivateKeyHash(newPrivateKeyHash);
          setPrivateKey(decryptedKey);
          setIsInitialized(true);
        }

        retryCountRef.current = 0;
      } catch (err) {
        if (!isMounted) return;

        retryCountRef.current += 1;

        if (retryCountRef.current >= RETRIES) {
          if (isMounted) {
            router.push("/login");
            setIsInitialized(true);
          }
          return;
        }

        timeoutId = setTimeout(() => {
          fetchAndDecryptPrivateKey();
        }, 500);
      }
    };

    fetchAndDecryptPrivateKey();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, decrypt_base64_using_aes]);

  if (unsupported) {
    return <Loading message="This Browser is unsupported" error={true} />;
  }
  if (!worker) {
    return <Loading message="Initializing encryption worker..." />;
  }
  if (!isInitialized) {
    return <Loading message={"Authenticating..."} />;
  }
  return (
    <CryptoContext.Provider
      value={{
        encrypt_base64_using_aes,
        decrypt_base64_using_aes,
        get_shared_secret,
        privateKey,
        privateKeyHash,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}
