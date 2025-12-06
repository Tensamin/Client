"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Comlink from "comlink";

// Lib Imports
import { sha256 } from "@/lib/utils";

// Context Imports
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Types
import { BasicSuccessMessage } from "@/lib/types";

// Components
import { Loading } from "@/components/loading";

type CryptoContextType = {
  encrypt: (message: string, password: string) => Promise<BasicSuccessMessage>;
  decrypt: (
    encryptedMessage: string,
    password: string,
  ) => Promise<BasicSuccessMessage>;
  get_shared_secret: (
    own_private_key: string,
    own_public_key: string,
    other_public_key: string,
  ) => Promise<BasicSuccessMessage>;
  privateKey: string;
  privateKeyHash: string;
  ownId: number;
};

type ApiRef = {
  encrypt: (message: string, password: string) => Promise<BasicSuccessMessage>;
  decrypt: (
    encryptedMessage: string,
    password: string,
  ) => Promise<BasicSuccessMessage>;
  get_shared_secret: (
    own_private_key: string,
    own_public_key: string,
    other_public_key: string,
  ) => Promise<BasicSuccessMessage>;
};

const CryptoContext = createContext<CryptoContextType | null>(null);
const apiNotInitializedError = new Error("Crypto Context API not initialized");

export function useCryptoContext() {
  const context = useContext(CryptoContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function CryptoProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiRef = useRef<ApiRef | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [privateKeyHash, setPrivateKeyHash] = useState("");
  const [ownId, setOwnId] = useState(0);

  const { setPage, page } = usePageContext();
  const { data, bypass } = useStorageContext();

  const encrypt = useCallback(
    async (message: string, password: string): Promise<BasicSuccessMessage> => {
      if (!apiRef.current) throw apiNotInitializedError;
      return await apiRef.current.encrypt(message, password);
    },
    [],
  );

  const decrypt = useCallback(
    async (
      encryptedMessage: string,
      password: string,
    ): Promise<BasicSuccessMessage> => {
      if (!apiRef.current) throw apiNotInitializedError;
      return await apiRef.current.decrypt(encryptedMessage, password);
    },
    [],
  );

  const get_shared_secret = useCallback(
    async (
      own_private_key: string,
      own_public_key: string,
      other_public_key: string,
    ): Promise<BasicSuccessMessage> => {
      if (!apiRef.current) throw apiNotInitializedError;
      return await apiRef.current.get_shared_secret(
        own_private_key,
        own_public_key,
        other_public_key,
      );
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    if (page === "login" || page === "signup") {
      Promise.resolve().then(() => {
        if (!cancelled) setIsReady(true);
      });
      return () => {
        cancelled = true;
      };
    }

    if (
      typeof data.privateKey !== "undefined" &&
      data.privateKey !== null &&
      data.privateKey !== ""
    ) {
      const privateKeyValue = String(data.privateKey);
      const ownIdValue = typeof data.id === "number" ? data.id : 0;

      Promise.resolve().then(() => {
        if (cancelled) return;
        setPrivateKey(privateKeyValue);
        setOwnId(ownIdValue);
      });

      sha256(privateKeyValue)
        .then((hash) => {
          if (cancelled) return;
          setPrivateKeyHash(hash);
          setIsReady(true);
        })
        .catch(() => {
          if (!cancelled) setIsReady(false);
        });

      return () => {
        cancelled = true;
      };
    }

    Promise.resolve().then(() => {
      if (!cancelled) setPage("login", "ERROR_AUTH_NO_PRIVATE_KEY");
    });

    return () => {
      cancelled = true;
    };
  }, [data.privateKey, data.id, page, setPage]);

  useEffect(() => {
    let cancelled = false;
    const worker = new Worker(
      new URL("../worker/encryption.ts", import.meta.url),
      {
        type: "module",
      },
    );
    apiRef.current = Comlink.wrap(worker);

    Promise.resolve().then(() => {
      if (!cancelled) setIsWorkerReady(true);
    });

    return () => {
      cancelled = true;
      apiRef.current = null;
      worker.terminate();
    };
  }, []);

  return isReady && isWorkerReady ? (
    <CryptoContext.Provider
      value={{
        encrypt,
        decrypt,
        get_shared_secret,
        privateKey,
        privateKeyHash,
        ownId,
      }}
    >
      {children}
    </CryptoContext.Provider>
  ) : bypass ? (
    <CryptoContext.Provider
      value={{
        encrypt: () =>
          Promise.resolve({
            success: false,
            message: "BYPASS_CRYPTO_CONTEXT_ENCRYPT",
          }),
        decrypt: () =>
          Promise.resolve({
            success: false,
            message: "BYPASS_CRYPTO_CONTEXT_DECRYPT",
          }),
        get_shared_secret: () =>
          Promise.resolve({
            success: false,
            message: "BYPASS_CRYPTO_CONTEXT_GET_SHARED_SECRET",
          }),
        privateKey: "",
        privateKeyHash: "",
        ownId: 0,
      }}
    >
      {children}
    </CryptoContext.Provider>
  ) : (
    <Loading message="CRYPTO_CONTEXT_LOADING" progress={20} />
  );
}
