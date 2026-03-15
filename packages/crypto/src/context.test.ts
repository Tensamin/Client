import { describe, expect, test } from "bun:test";
import { createCryptoActions } from "./context";

/**
 * Creates a rejected API getter used to verify initialization guards.
 * @returns Null API reference.
 */
function getUninitializedApi(): null {
  return null;
}

describe("createCryptoActions", () => {
  test("throws when API is not initialized", async () => {
    const actions = createCryptoActions(getUninitializedApi);

    let failed = false;
    try {
      await actions.encrypt("ab", "plain");
    } catch (error) {
      failed = (error as Error).message.includes("API not initialized");
    }

    expect(failed).toBe(true);
  });

  test("delegates encrypt/decrypt/getSharedSecret to API reference", async () => {
    const api = {
      encrypt: async (secret: string, plaintext: string): Promise<string> =>
        `${secret}:${plaintext}`,
      decrypt: async (secret: string, ciphertext: string): Promise<string> =>
        `${secret}|${ciphertext}`,
      getSharedSecret: async (
        ownPrivateKey: string,
        ownPublicKey: string,
        otherPublicKey: string,
      ): Promise<string> =>
        `${ownPrivateKey}.${ownPublicKey}.${otherPublicKey}`,
    };

    const actions = createCryptoActions(() => api);

    expect(await actions.encrypt("s", "p")).toBe("s:p");
    expect(await actions.decrypt("s", "c")).toBe("s|c");
    expect(await actions.getSharedSecret("a", "b", "c")).toBe("a.b.c");
  });
});
