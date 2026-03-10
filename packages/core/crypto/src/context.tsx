import {
  createContext,
  onMount,
  onCleanup,
  createSignal,
  Show,
  useContext,
} from "solid-js";
import type { ParentProps } from "solid-js";

import * as Comlink from "comlink";
import Loading from "@tensamin/ui/screens/loading";

export const context = createContext<contextType>();

export default function Provider(props: ParentProps) {
  let apiRef: ApiRef | null = null;
  const [isWorkerReady, setIsWorkerReady] = createSignal(false);

  const { encrypt, decrypt, get_shared_secret } = createCryptoActions(
    () => apiRef,
  );

  onMount(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    apiRef = Comlink.wrap(worker);
    setIsWorkerReady(true);

    onCleanup(() => {
      apiRef = null;
      worker.terminate();
    });
  });

  return (
    <Show when={isWorkerReady()} fallback={<Loading progress={10} />}>
      <context.Provider value={{ encrypt, decrypt, get_shared_secret }}>
        {props.children}
      </context.Provider>
    </Show>
  );
}

type contextType = {
  decrypt: (secret: string, data: string) => Promise<string>;
  encrypt: (secret: string, data: string) => Promise<string>;
  get_shared_secret: (
    ownPrivateKey: string,
    ownPublicKey: string,
    otherPublicKey: string,
  ) => Promise<string>;
};

type ApiRef = {
  encrypt: (secret: string, message: string) => Promise<string>;
  decrypt: (secret: string, encryptedMessage: string) => Promise<string>;
  get_shared_secret: (
    own_private_key: string,
    own_public_key: string,
    other_public_key: string,
  ) => Promise<string>;
};

export function createCryptoActions(
  getApiRef: () => ApiRef | null,
): contextType {
  const encrypt = async (secret: string, message: string): Promise<string> => {
    const apiRef = getApiRef();
    if (!apiRef) throw "API not initialized";
    return await apiRef.encrypt(secret, message);
  };

  const decrypt = async (
    secret: string,
    encryptedMessage: string,
  ): Promise<string> => {
    const apiRef = getApiRef();
    if (!apiRef) throw "API not initialized";
    return await apiRef.decrypt(secret, encryptedMessage);
  };

  const get_shared_secret = async (
    own_private_key: string,
    own_public_key: string,
    other_public_key: string,
  ): Promise<string> => {
    const apiRef = getApiRef();
    if (!apiRef) throw "API not initialized";
    return await apiRef.get_shared_secret(
      own_private_key,
      own_public_key,
      other_public_key,
    );
  };

  return { encrypt, decrypt, get_shared_secret };
}

export function useCrypto(): contextType {
  const ctx = useContext(context);
  if (!ctx) {
    throw new Error("useCrypto must be used within a CryptoProvider");
  }
  return ctx;
}
