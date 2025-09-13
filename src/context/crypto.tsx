"use client";
import {
  createContext,
  use,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Comlink from "comlink";
import {
  PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from "@simplewebauthn/browser";

import { BasicSuccessMessage } from "@/lib/types";
import { sha256, log, isElectron, RetryCount } from "@/lib/utils";
import { webauthn_login_verify, webauthn_login_options } from "@/lib/endpoints";
import { getDeviceFingerprint } from "@/lib/fingerprint";

import { Loading } from "@/components/loading";
import { usePageContext } from "@/app/page";

type CryptoContextType = {
  encrypt: (message: string, password: string) => Promise<BasicSuccessMessage>;
  decrypt: (
    encryptedMessage: string,
    password: string
  ) => Promise<BasicSuccessMessage>;
  get_shared_secret: (
    own_private_key: string,
    own_public_key: string,
    other_public_key: string
  ) => Promise<BasicSuccessMessage>;
  privateKey: string;
  privateKeyHash: string;
  isReady: boolean;
};

const CryptoContext = createContext<CryptoContextType | null>(null);
const apiNotInitializedError = new Error(
  "ERROR_CRYPTO_CONTEXT_API_NOT_INITIALIZED"
);

export function useCryptoContext() {
  const context = useContext(CryptoContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
  return context;
}

export function CryptoProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiRef = useRef<any>(null);
  const { setPage, page } = usePageContext();
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [privateKeyHash, setPrivateKeyHash] = useState("");

  async function encrypt(
    message: string,
    password: string
  ): Promise<BasicSuccessMessage> {
    if (!apiRef.current) throw apiNotInitializedError;
    return await apiRef.current.encrypt(message, password);
  }

  async function decrypt(
    encryptedMessage: string,
    password: string
  ): Promise<BasicSuccessMessage> {
    if (!apiRef.current) throw apiNotInitializedError;
    return await apiRef.current.decrypt(encryptedMessage, password);
  }

  async function get_shared_secret(
    own_private_key: string,
    own_public_key: string,
    other_public_key: string
  ): Promise<BasicSuccessMessage> {
    if (!apiRef.current) throw apiNotInitializedError;
    return await apiRef.current.get_shared_secret(
      own_private_key,
      own_public_key,
      other_public_key
    );
  }

  useEffect(() => {
    if (isWorkerReady) {
      try {
        // get Encrypted key
        const encryptedPrivateKey =
          localStorage.getItem("auth_private_key") || "";
        const uuid = localStorage.getItem("auth_uuid") || "";
        const cred_id = localStorage.getItem("auth_cred_id") || "";
        if (encryptedPrivateKey === "" || uuid === "") setPage("login");

        // get Lambda
        async function getLambda(retryCount = 0) {
          try {
            if (isElectron()) {
              return await window?.keyring?.get("net.methanium.tensamin", uuid);
            } else if (localStorage.getItem("auth_lambda")) {
              return await decrypt(
                localStorage.getItem("auth_lambda") || "",
                await getDeviceFingerprint()
              );
            } else {
              if (cred_id === "") {
                setPage("login", "ERROR_AUTH_NO_CRED_ID");
                return;
              }

              const options = await fetch(
                `${webauthn_login_options}${uuid}/${cred_id}`
              )
                .then((response) => response.json())
                .then((data) => {
                  if (data.type === "success") {
                    return JSON.parse(atob(data.data.options));
                  } else {
                    setPage("login", "ERROR_CRYPTO_CONTEXT_NO_PASSKEY_OPTIONS");
                  }
                })
                .catch((err) => {
                  log(
                    "error",
                    "CRYPTO_CONTEXT",
                    "ERROR_CRYPTO_CONTEXT_PASSKEY_OPTIONS_UNKOWN",
                    err.message
                  );
                  setPage(
                    "login",
                    "ERROR_CRYPTO_CONTEXT_PASSKEY_OPTIONS_UNKOWN"
                  );
                });

              const attestation = await startAuthentication(options);

              const lambda = await fetch(
                `${webauthn_login_verify}${uuid}/${cred_id}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ attestation }),
                }
              )
                .then((response) => response.json())
                .then((data) => {
                  if (data.type === "success") {
                    return data.data.lambda;
                  }
                })
                .catch((err) => {
                  log(
                    "error",
                    "CRYPTO_CONTEXT",
                    "ERROR_CRYPTO_CONTEXT_PASSKEY_VERIFY_UNKOWN",
                    err.message
                  );
                  setPage(
                    "login",
                    "ERROR_CRYPTO_CONTEXT_PASSKEY_VERIFY_UNKOWN"
                  );
                });

              return lambda;
            }
          } catch (err: any) {
            if (retryCount < RetryCount) {
              return await getLambda(retryCount + 1);
            } else {
              log(
                "error",
                "CRYPTO_CONTEXT",
                "ERROR_CRYPTO_CONTEXT_GET_LAMBDA_UNKOWN",
                err.message
              );
              setPage("error", "ERROR_CRYPTO_CONTEXT_GET_LAMBDA_UNKOWN");
            }
          }
        }
        if (page !== "login") {
          getLambda().then(async (lambda) => {
            if (!lambda || lambda === "") {
              setPage("login", "ERROR_AUTH_NO_LAMBDA");
              return;
            }
            const tmpPrivateKey = await decrypt(
              encryptedPrivateKey || "",
              lambda
            );
            if (!tmpPrivateKey.success) return;
            setPrivateKey(tmpPrivateKey.message);
            sha256(tmpPrivateKey.message).then(setPrivateKeyHash);
            setIsReady(true);
          });
        } else {
          setIsReady(true);
        }
      } catch (err: any) {
        log(
          "error",
          "CRYPTO_CONTEXT",
          "ERROR_CRYPTO_CONTEXT_UNKOWN",
          err.message
        );
        setPage("error", "ERROR_CRYPTO_CONTEXT_UNKOWN");
        return;
      }
    }
  }, [isWorkerReady]);

  useEffect(() => {
    const worker = new Worker(
      new URL("@/worker/encryption.ts", import.meta.url),
      {
        type: "module",
      }
    );
    apiRef.current = Comlink.wrap(worker);
    setIsWorkerReady(true);
    return () => {
      worker.terminate();
      setIsWorkerReady(false);
    };
  }, []);

  return isReady ? (
    <CryptoContext.Provider
      value={{
        encrypt,
        decrypt,
        get_shared_secret,
        privateKey,
        privateKeyHash,
        isReady,
      }}
    >
      {children}
    </CryptoContext.Provider>
  ) : (
    <Loading message="CRYPTO_CONTEXT_LOADING" />
  );
}
