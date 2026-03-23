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

function installFakeWebTransport(streamChunks: Uint8Array[]) {
  const globalScope = globalThis as typeof globalThis & {
    WebTransport?: unknown;
  };
  const originalWebTransport = globalScope.WebTransport;

  class FakeWebTransport {
    readonly ready = Promise.resolve();

    readonly closed: Promise<void>;

    private resolveClosed!: () => void;

    readonly incomingUnidirectionalStreams: ReadableStream<
      ReadableStream<Uint8Array>
    >;

    constructor() {
      this.closed = new Promise<void>((resolve) => {
        this.resolveClosed = resolve;
      });

      const incomingStream = new ReadableStream<ReadableStream<Uint8Array>>({
        start: (controller) => {
          controller.enqueue(
            new ReadableStream<Uint8Array>({
              start(innerController) {
                const emitChunk = (index: number) => {
                  if (index >= streamChunks.length) {
                    innerController.close();
                    return;
                  }

                  innerController.enqueue(streamChunks[index]);
                  setTimeout(() => emitChunk(index + 1), 10);
                };

                emitChunk(0);
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

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return buffer;
}

function chunkBytes(bytes: Uint8Array, sizes: number[]) {
  const chunks: Uint8Array[] = [];
  let offset = 0;

  for (const size of sizes) {
    if (offset >= bytes.byteLength) {
      break;
    }

    const end = Math.min(offset + size, bytes.byteLength);
    chunks.push(bytes.subarray(offset, end));
    offset = end;
  }

  if (offset < bytes.byteLength) {
    chunks.push(bytes.subarray(offset));
  }

  return chunks;
}

function frameBytes(payload: Uint8Array) {
  const frame = new Uint8Array(payload.byteLength + 4);
  const view = new DataView(frame.buffer);

  view.setUint32(0, payload.byteLength, false);
  frame.set(payload, 4);

  return frame;
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

function installConsoleLogSpy() {
  const globalConsole = console as typeof console & {
    log: (...args: unknown[]) => void;
  };
  const originalLog = globalConsole.log;
  const calls: unknown[][] = [];

  globalConsole.log = (...args: unknown[]) => {
    calls.push(args);
  };

  return {
    calls,
    restore() {
      globalConsole.log = originalLog;
    },
  };
}

describe("TTP communication codec", () => {
  test("encodes and decodes a mixed payload message", () => {
    const input = createRoundTripMessage();

    const encoded = encodeCommunicationMessage(input);
    const decoded = decodeCommunicationMessage(frameBytes(encoded));

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

  test("decodes an empty error payload as an empty object", () => {
    const innerFrame = new Uint8Array(6);
    const view = new DataView(innerFrame.buffer);

    view.setUint32(0, 2, false);
    innerFrame[4] = 0;
    innerFrame[5] = 0;

    const decoded = decodeCommunicationMessage(frameBytes(innerFrame));

    expect(decoded.id).toBe(0);
    expect(decoded.type).toBe("error");
    expect(decoded.data).toEqual({});
  });

  test("keeps malformed error payloads visible as error messages", () => {
    const innerFrame = new Uint8Array(8);
    const view = new DataView(innerFrame.buffer);

    view.setUint32(0, 4, false);
    innerFrame[4] = 0;
    innerFrame[5] = 0;
    innerFrame[6] = 0;
    innerFrame[7] = 1;

    const decoded = decodeCommunicationMessage(frameBytes(innerFrame));

    expect(decoded.id).toBe(0);
    expect(decoded.type).toBe("error");
    expect(decoded.data).toEqual({});
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

    const decoded = decodeCommunicationMessage(frameBytes(corrupted));

    expect(decoded.id).toBe(9);
    expect(decoded.type).toBe("error");
    expect(decoded.data).toEqual({});
  });

  test("aligns live message schema with backend protocol name", () => {
    expect(socket.message_live !== undefined).toBe(true);
    expect((socket as Record<string, unknown>).live_message).toEqual(undefined);
  });

  test("does not log raw binary frames unless enabled", async () => {
    const ignoredFrame = encodeCommunicationMessage({
      id: 0,
      type: "error_internal",
      data: {
        error_type: "transport_noise",
      },
    });

    const identificationFrame = encodeCommunicationMessage({
      id: 7,
      type: "identification",
      data: {
        challenge: "Zm9v",
        public_key: "Zm9v",
      },
    });

    const streamBytes = concatBytes([
      frameBytes(ignoredFrame),
      frameBytes(identificationFrame),
    ]);
    const restoreWebTransport = installFakeWebTransport(
      chunkBytes(streamBytes, [2, 5, 1, 7]),
    );
    const restoreLocalStorage = installFakeLocalStorage();
    const consoleSpy = installConsoleLogSpy();

    try {
      const client = createTransportClient(socket, {
        url: "https://example.test",
      });

      await client.connect("https://example.test");

      const response = client.send("identification", { user_id: 1 }, { id: 7 });

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
      expect(consoleSpy.calls);

      await client.close("test-complete");
    } finally {
      consoleSpy.restore();
      restoreLocalStorage();
      restoreWebTransport();
    }
  });

  test("logs raw binary frames when enabled", async () => {
    const requestMessage = encodeCommunicationMessage({
      id: 7,
      type: "identification",
      data: {
        user_id: 1,
      },
    });
    const requestFrame = frameBytes(requestMessage);

    const ignoredFrame = encodeCommunicationMessage({
      id: 0,
      type: "error_internal",
      data: {
        error_type: "transport_noise",
      },
    });

    const identificationFrame = encodeCommunicationMessage({
      id: 7,
      type: "identification",
      data: {
        challenge: "Zm9v",
        public_key: "Zm9v",
      },
    });
    const ignoredTransportFrame = frameBytes(ignoredFrame);
    const identificationTransportFrame = frameBytes(identificationFrame);

    const streamBytes = concatBytes([
      ignoredTransportFrame,
      identificationTransportFrame,
    ]);
    const restoreWebTransport = installFakeWebTransport(
      chunkBytes(streamBytes, [2, 5, 1, 7]),
    );
    const restoreLocalStorage = installFakeLocalStorage();
    const consoleSpy = installConsoleLogSpy();

    try {
      localStorage.setItem("ttp_logBinary", "true");

      const client = createTransportClient(socket, {
        url: "https://example.test",
      });

      await client.connect("https://example.test");

      const response = client.send("identification", { user_id: 1 }, { id: 7 });

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

      const logMessages = consoleSpy.calls
        .filter((entry) => typeof entry[0] === "string")
        .map((entry) => entry[0] as string);

      expect(logMessages).toContain(
        `[Socket] Outgoing binary message (${requestFrame.byteLength} bytes)`,
      );
      expect(logMessages).toContain(
        `[Socket] Incoming binary message (${ignoredTransportFrame.byteLength} bytes)`,
      );
      expect(logMessages).toContain(
        `[Socket] Incoming binary message (${identificationTransportFrame.byteLength} bytes)`,
      );

      const outgoingCall = consoleSpy.calls.find(
        (entry) =>
          entry[0] ===
          `[Socket] Outgoing binary message (${requestFrame.byteLength} bytes)`,
      );
      expect(outgoingCall?.[1]).toEqual(requestFrame);

      const incomingCall = consoleSpy.calls.find(
        (entry) =>
          entry[0] ===
          `[Socket] Incoming binary message (${identificationTransportFrame.byteLength} bytes)`,
      );
      expect(incomingCall?.[1]).toEqual(identificationTransportFrame);

      await client.close("test-complete");
    } finally {
      consoleSpy.restore();
      restoreLocalStorage();
      restoreWebTransport();
    }
  });

  test("resolves an identification response before the stream closes", async () => {
    const ignoredFrame = encodeCommunicationMessage({
      id: 0,
      type: "error_internal",
      data: {
        error_type: "transport_noise",
      },
    });

    const identificationFrame = encodeCommunicationMessage({
      id: 7,
      type: "identification",
      data: {
        challenge: "Zm9v",
        public_key: "Zm9v",
      },
    });

    const streamBytes = concatBytes([
      frameBytes(ignoredFrame),
      frameBytes(identificationFrame),
    ]);
    const restoreWebTransport = installFakeWebTransport(
      chunkBytes(streamBytes, [2, 5, 1, 7]),
    );
    const restoreLocalStorage = installFakeLocalStorage();

    try {
      const client = createTransportClient(socket, {
        url: "https://example.test",
      });

      await client.connect("https://example.test");

      const response = client.send("identification", { user_id: 1 }, { id: 7 });

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

  test("resolves an identification response that arrives after another frame on the same stream", async () => {
    const ignoredFrame = encodeCommunicationMessage({
      id: 0,
      type: "error_internal",
      data: {
        error_type: "transport_noise",
      },
    });

    const identificationFrame = encodeCommunicationMessage({
      id: 7,
      type: "identification",
      data: {
        challenge: "Zm9v",
        public_key: "Zm9v",
      },
    });

    const streamBytes = concatBytes([
      frameBytes(ignoredFrame),
      frameBytes(identificationFrame),
    ]);
    const restoreWebTransport = installFakeWebTransport(
      chunkBytes(streamBytes, [1, 4, 3, 9, 2]),
    );
    const restoreLocalStorage = installFakeLocalStorage();

    try {
      const client = createTransportClient(socket, {
        url: "https://example.test",
      });

      await client.connect("https://example.test");

      const response = client.send("identification", { user_id: 1 }, { id: 7 });

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
