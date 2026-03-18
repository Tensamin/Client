import { describe, expect, test } from "bun:test";
import { socket } from "@tensamin/shared/data";
import {
  createTransportClient,
  decodeCommunicationMessage,
  encodeCommunicationMessage,
  type TypedMessage,
} from "./core";

/**
 * Creates a representative protocol message used for round-trip codec tests.
 * @returns Typed protocol message with mixed payload data kinds.
 */
function createRoundTripMessage(): TypedMessage<Record<string, unknown>> {
  return {
    id: 41,
    type: "message",
    data: {
      accepted: true,
      message: "hello",
      user_id: 77,
      iota_ids: [11, 12],
      ping_iota: 33,
      last_ping: 101,
      get_variant: null,
      user: {
        user_id: 1,
        username: "alice",
      },
      messages: [
        {
          user_id: 2,
          message: "payload",
        },
      ],
    },
  };
}

function installFakeWebTransport(frameBytes: Uint8Array) {
  const globalScope = globalThis as typeof globalThis & {
    WebTransport?: unknown;
  };
  const originalWebTransport = globalScope.WebTransport;

  class FakeWebTransport {
    readonly ready = Promise.resolve();

    readonly closed: Promise<void>;

    private resolveClosed!: () => void;

    readonly incomingUnidirectionalStreams: ReadableStream<ReadableStream<Uint8Array>>;

    constructor(_url: string) {
      this.closed = new Promise<void>((resolve) => {
        this.resolveClosed = resolve;
      });

      const incomingStream = new ReadableStream<ReadableStream<Uint8Array>>({
        start: (controller) => {
          controller.enqueue(
            new ReadableStream<Uint8Array>({
              start(innerController) {
                const splitIndex = 3;
                innerController.enqueue(frameBytes.subarray(0, splitIndex));
                setTimeout(() => {
                  innerController.enqueue(frameBytes.subarray(splitIndex));
                }, 10);
              },
            }),
          );
        },
      });

      this.incomingUnidirectionalStreams = incomingStream;
    }

    createUnidirectionalStream() {
      return new WritableStream<Uint8Array>({
        write() {
          return undefined;
        },
        close() {
          return undefined;
        },
      });
    }

    close() {
      this.resolveClosed();
    }
  }

  globalScope.WebTransport = FakeWebTransport as never;

  return () => {
    globalScope.WebTransport = originalWebTransport;
  };
}

function installFakeLocalStorage() {
  const globalScope = globalThis as typeof globalThis & {
    localStorage?: Storage;
  };
  const originalLocalStorage = globalScope.localStorage;
  const store = new Map<string, string>();

  globalScope.localStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    get length() {
      return store.size;
    },
  } as Storage;

  return () => {
    globalScope.localStorage = originalLocalStorage;
  };
}

describe("TTP communication codec", () => {
  test("encodes and decodes a mixed payload message", () => {
    const input = createRoundTripMessage();

    const encoded = encodeCommunicationMessage(input);
    const decoded = decodeCommunicationMessage(encoded);

    expect(decoded.id).toBe(41);
    expect(decoded.type).toBe("message");
    expect(decoded.data).toEqual({
      accepted: true,
      message: "hello",
      user_id: 77,
      iota_ids: [11, 12],
      ping_iota: 33,
      last_ping: 101,
      get_variant: null,
      user: {
        user_id: 1,
        username: "alice",
      },
      messages: [
        {
          user_id: 2,
          message: "payload",
        },
      ],
    });
  });

  test("throws for unknown communication type", () => {
    expect(() =>
      encodeCommunicationMessage({
        id: 1,
        type: "unknown_type",
        data: { user_id: 1 },
      }),
    ).toThrow("Unknown communication type");
  });

  test("throws for unknown data key", () => {
    expect(() =>
      encodeCommunicationMessage({
        id: 1,
        type: "message",
        data: { unknown_key: 1 },
      }),
    ).toThrow("Unknown data type");
  });

  test("skips unknown container keys without failing decode", () => {
    const encoded = encodeCommunicationMessage({
      id: 9,
      type: "error",
      data: {
        accepted: true,
      },
    });

    const corrupted = encoded.slice();
    corrupted[corrupted.length - 1] = 215;

    const decoded = decodeCommunicationMessage(corrupted);

    expect(decoded.id).toBe(9);
    expect(decoded.type).toBe("error");
    expect(decoded.data).toEqual({});
  });

  test("aligns live message schema with backend protocol name", () => {
    expect(socket.message_live !== undefined).toBe(true);
    expect((socket as Record<string, unknown>).live_message).toEqual(undefined);
  });

  test("resolves an identification response before the stream closes", async () => {
    const frame = encodeCommunicationMessage({
      id: 7,
      type: "identification",
      data: {
        challenge: "Zm9v",
        public_key: "Zm9v",
      },
    });

    const restoreWebTransport = installFakeWebTransport(frame);
    const restoreLocalStorage = installFakeLocalStorage();

    try {
      const client = createTransportClient(socket, { url: "https://example.test" });

      await client.connect("https://example.test");

      const response = client.send(
        "identification",
        { user_id: 1 },
        { id: 7 },
      );

      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("identification response timed out"));
        }, 250);
      });

      const result = await Promise.race([response, timeout]);

      expect(result).toEqual({
        id: 7,
        type: "identification",
        data: {
          challenge: "Zm9v",
          public_key: "Zm9v",
        },
      });

      await client.close("test-complete");
    } finally {
      restoreLocalStorage();
      restoreWebTransport();
    }
  });
});
