import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RetryCount = 10;

export function log(
  level: "info" | "warn" | "error" | "debug" = "info",
  sender: string,
  type: string,
  extraInfo?: any
) {
  console.log(sender, type, extraInfo);
}

export async function sha256(content: string | BufferSource) {
  let data: BufferSource;
  if (typeof content === "string") {
    const encoder = new TextEncoder();
    data = encoder.encode(content);
  } else {
    data = content;
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function isElectron() {
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes("Electron")
  ) {
    return true;
  }

  if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.electron
  ) {
    return true;
  }

  try {
    if (typeof window !== "undefined" && window.require) {
      let electron = window.require("electron");
      if (electron) return true;
    }
  } catch (e) {}

  return false;
}
