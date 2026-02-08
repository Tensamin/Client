/**
 * Call ID display utility
 * Converts UUIDs to short, readable codes
 *
 * Extracted from lib/utils.tsx
 */

import { mono } from "@/lib/fonts";

/**
 * Convert a UUID to a short, readable display code
 * Uses base85 encoding for compact representation
 */
export function displayCallId(callId: string): React.ReactNode {
  try {
    const hex = callId.replace(/-/g, "");

    const int = BigInt(`0x${hex}`);
    const chars =
      "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~";
    let result = "";
    let n = int;

    while (n > BigInt(0)) {
      result = chars[Number(n % BigInt(85))] + result;
      n = n / BigInt(85);
    }

    return (
      <p className={mono.className}>
        {result
          .replaceAll(/[^a-zA-Z0-9]/g, "")
          .slice(4, 12)
          .toUpperCase() || "0"}
      </p>
    );
  } catch {
    return "0";
  }
}

/**
 * Get a simple alphanumeric call code from a UUID
 * Returns just the string without JSX
 */
export function getCallCode(callId: string): string {
  try {
    const hex = callId.replace(/-/g, "");
    const int = BigInt(`0x${hex}`);
    const chars =
      "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~";
    let result = "";
    let n = int;

    while (n > BigInt(0)) {
      result = chars[Number(n % BigInt(85))] + result;
      n = n / BigInt(85);
    }

    return (
      result
        .replaceAll(/[^a-zA-Z0-9]/g, "")
        .slice(4, 12)
        .toUpperCase() || "0"
    );
  } catch {
    return "0";
  }
}
