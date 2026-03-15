import { describe, expect, test } from "bun:test";
import {
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
});
