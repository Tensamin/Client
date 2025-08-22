"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

const publicKey = "MEIwBQYDK2VvAzkASD+5uTRymJDqLT7Ozut0FrPuv5Wtj22u7ZaEtbjf9/qo9ndi+yqZ4AMBXXwUGDQnQMG59YaBQ44=";

const myJWK = {
  kty: 'OKP',
  d: 'MEYCAQAwBQYDK2VvBDoEOIeOc33kgfDvkkGwnSGW9BgX8QhUTuD8cxKjONWeNx65-zW0PEpufcsuTKrKeGVHh0WkzlAz94Fl',
  use: 'enc',
  crv: 'X448',
  kid: 'feaedf96-e024-47b0-b2fb-5d70d2505d71',
  x: 'MEIwBQYDK2VvAzkAEUE8wAS6wOdzeSVNe2X_fa3QrksOT4GUqlqmHlKIxwyP2go3wHuQaYRzzFmjJP7DpoF3PFmIhog',
  alg: 'ECDH-ES'
};

const peerJWK = {
  kty: "OKP",
  crv: "X448",
  x: publicKey
};

function bytesToHex(u8) {
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveSharedSecretAeadX448(myJwk, peerPublicJwk) {
  const assertX448 = (jwk, label) => {
    if (!jwk || jwk.kty !== "OKP" || typeof jwk.crv !== "string") {
      throw new Error(`${label}: expected an OKP JWK with a "crv" field`);
    }
    if (jwk.crv !== "X448") {
      throw new Error(`${label}: expected crv "X448" (got "${jwk.crv}")`);
    }
  };

  assertX448(myJwk, "myJwk");
  if (!myJwk.d || !myJwk.x) {
    throw new Error(`myJwk must contain both "d" (private) and "x" (public)`);
  }
  assertX448(peerPublicJwk, "peerPublicJwk");
  if (!peerPublicJwk.x) {
    throw new Error(`peerPublicJwk must contain "x" (public)`);
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto subtle not available in this environment");
  }

  const myPrivateKey = await subtle.importKey(
    "jwk",
    myJwk,
    { name: "X448" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const peerPublicKey = await subtle.importKey(
    "jwk",
    peerPublicJwk,
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

  const info = new TextEncoder().encode(
    `ECDH-X448-AES-GCM-v1|my=${myJwk.x}|peer=${peerPublicJwk.x}`
  );

  const baseKey = await subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

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

  return {
    aeadKey,
    sharedSecret,
    sharedSecretHex: bytesToHex(sharedSecret),
  };
}

export default function Page() {
  const [sharedSecret, setSharedSecret] = useState("None");

  return (
    <div className="p-6 space-y-4">
      <Button
        onClick={async () => {
          try {
            const { sharedSecretHex } = await deriveSharedSecretAeadX448(
              myJWK,
              peerJWK
            );
            setSharedSecret(sharedSecretHex);
          } catch (e) {
            setSharedSecret(`Error: ${e.message}`);
          }
        }}
      >
        Get Key
      </Button>
      <div className="font-mono break-all">{sharedSecret}</div>
    </div>
  );
}