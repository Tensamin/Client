"use client";

// Package Imports
import { createContext, useContext, useEffect, useRef, useState } from "react";
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
    password: string
  ) => Promise<BasicSuccessMessage>;
  get_shared_secret: (
    own_private_key: string,
    own_public_key: string,
    other_public_key: string
  ) => Promise<BasicSuccessMessage>;
  privateKey: string;
  privateKeyHash: string;
  ownUuid: string;
};

type ApiRef = {
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
  const apiRef = useRef<ApiRef | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [privateKeyHash, setPrivateKeyHash] = useState("");
  const [ownUuid, setOwnUuid] = useState("");

  const { setPage, page } = usePageContext();
  const { data } = useStorageContext();

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
    if (page === "login") {
      setIsReady(true);
      return;
    } else if (
      typeof data.privateKey !== "undefined" &&
      data.privateKey !== null &&
      data.privateKey !== ""
    ) {
      setPrivateKey(data.privateKey as string);
      setOwnUuid(data.uuid as string);
      sha256(data.privateKey as string)
        .then(setPrivateKeyHash)
        .then(() => setIsReady(true));
      return;
    } else {
      setPage("login", "ERROR_AUTH_NO_PRIVATE_KEY");
      return;
    }
  }, [data.uuid, data.privateKey, page, setPage]);

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

  return isReady && isWorkerReady ? (
    <CryptoContext.Provider
      value={{
        encrypt,
        decrypt,
        get_shared_secret,
        privateKey,
        privateKeyHash,
        ownUuid,
      }}
    >
      {children}
    </CryptoContext.Provider>
  ) : (
    <Loading message="CRYPTO_CONTEXT_LOADING" />
  );
}
