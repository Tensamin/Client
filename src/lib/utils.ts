import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as React from "react";

const MOBILE_BREAKPOINT = 768;
export const RetryCount = 10;
export const ThemeSize = 9;
export const MaxSendBoxSize = 200; //px
export const InitialMessages = 30;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getColorFor(state: string) {
  switch (state) {
    case "NONE":
      return "bg-white border-gray-300";
    case "IDLE":
      return "bg-yellow-500 border-yellow-700";
    case "DND":
      return "bg-red-400 border-red-500";
    case "USER_OFFLINE":
      return "bg-gray-400 border-gray-500/50";
    case "IOTA_OFFLINE":
      return "bg-blue-500 border-blue-600";
    case "ONLINE":
      return "bg-green-500 border-green-700";
  }
}

export function handleError(sender: string, message: string, error: unknown) {
  let msg = "UNKNOWN";
  if (error) {
    msg = (error as Error).message;
  }
  alert("REMOVE THIS ERROR");
  console.error(sender, message, msg);
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
      const electron = window.require("electron");
      if (electron) return true;
    }
  } catch {}

  return false;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function getDisplayFromUsername(username: string, display_name: string) {
  if (display_name === "") {
    return capitalizeFirstLetter(username);
  } else {
    return display_name;
  }
}

export function capitalizeFirstLetter(content: string) {
  if (typeof content !== "string" || content.length === 0) {
    return "";
  }
  return content.charAt(0).toUpperCase() + content.slice(1);
}

export function convertStringToInitials(content: string) {
  if (!content || typeof content !== "string") {
    return "NA";
  }

  const words = content.split(" ").filter(Boolean);

  if (words.length === 0) {
    return "NA";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  } else {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
}
