"use client";

// Package Imports
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";

// Lib Imports
import { endpoint } from "@/lib/endpoints";
import { log, sha256 } from "@/lib/utils";
import ls from "@/lib/localStorageManager";

// Context Imports
import { useEncryptionContext } from "@/components/context/encryption";

// Components
import { Loading } from "@/components/loading/content";

// Main
let CryptoContext = createContext();

export function useCryptoContext() {
  let context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error(
      "useCryptoContext must be used within a CryptoProvider",
    );
  }
  return context;
}

export function CryptoProvider({ children }) {
  let [privateKey, setPrivateKey] = useState("pending");
  let [privateKeyHash, setPrivateKeyHash] = useState("pending");
  let [isInitialized, setIsInitialized] = useState(false);
  let { decrypt_base64_using_aes } = useEncryptionContext();
  let retryCountRef = useRef(0);
  let MAX_PASSKEY_RETRIES = 5;

  let router = useRouter();

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
      let cred_id = ls.get("auth_cred_id")

      if (!encrypted_private_key || !uuid) {
        if (window.location.pathname !== "/login" && isMounted) {
          router.push("/login");
        }
        if (isMounted) setIsInitialized(true);
        return;
      }

      try {
        let options;

        let resp = await fetch(`${endpoint.webauthn_login_options}${uuid}/${cred_id}`);
        let data = await resp.json();
        if (data?.type === "error") {
          throw new Error(data.log?.message || "Failed to get options");
        }
        options = JSON.parse(atob(data.data.options));

        let attestation = await startAuthentication(options);

        let verifyResp = await fetch(`${endpoint.webauthn_login_verify}${uuid}/${cred_id}`, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ attestation }),
        },
        );
        let verifyData = await verifyResp.json();
        if (verifyData?.type === "error") {
          throw new Error(verifyData.log?.message || "Passkey verify failed");
        }
        let lambda = verifyData.data.lambda;

        retryCountRef.current = 0;

        let decryptedKey = await decrypt_base64_using_aes(
          encrypted_private_key,
          lambda,
        );

        let newPrivateKeyHash = await sha256(decryptedKey);

        if (isMounted) {
          setPrivateKeyHash(newPrivateKeyHash);
          setPrivateKey(decryptedKey);
          setIsInitialized(true);
        }
      } catch (err) {
        log(
          err?.message || String(err),
          "error",
          "Crypto Provider:",
        );

        if (!isMounted) return;

        retryCountRef.current += 1;

        if (retryCountRef.current >= MAX_PASSKEY_RETRIES) {
          ls.remove("auth_private_key");
          ls.remove("auth_uuid");
          ls.remove("auth_cred_id");
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

  if (!isInitialized) {
    return <Loading message={"Authenticating..."} />;
  }

  return (
    <CryptoContext.Provider value={{ privateKey, privateKeyHash }}>
      {children}
    </CryptoContext.Provider>
  );
}