import { clsx, type ClassValue } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";
import { UnixTimestamp } from "./types";

const MOBILE_BREAKPOINT = 768;
export const RetryCount = 10;
export const ThemeSize = 9;
export const MaxSendBoxSize = 200; //px
export const InitialMessages = 30;
export const responseTimeout = 20000;

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

export function formatRawMessage(input: string) {
  const formatted = input.toLowerCase().replaceAll("_", " ");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getCreationString(creationTimestamp: UnixTimestamp) {
  const now = new Date();
  const diffMs = now.getTime() - creationTimestamp;
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} minutes ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hours ago`;
  if (diffSecs < 2592000) return `${Math.floor(diffSecs / 86400)} days ago`;
  if (diffSecs < 31536000)
    return `${Math.floor(diffSecs / 2592000)} months ago`;
  return `${Math.floor(diffSecs / 31536000)} years ago`;
}

export const progressBar = {
  storage: 20,
  crypto: 30,
  socket: 100,
  socket_connecting: 50,
  socket_indentify: 60,
  socket_base: 40,
  DELAY: 250,
};

export function calculateOptimalLayout(
  count: number,
  containerWidth: number,
  containerHeight: number,
  gap: number = 16,
  aspectRatio: number = 16 / 9
) {
  if (count === 0) return { width: 0, height: 0, cols: 0 };

  let bestWidth = 0;
  let bestHeight = 0;
  let bestCols = 1;

  // Try all possible column counts
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);

    // Calculate max width based on column constraints
    const maxW = (containerWidth - (cols - 1) * gap) / cols;

    // Calculate max height based on row constraints
    const maxH = (containerHeight - (rows - 1) * gap) / rows;

    if (maxW <= 0 || maxH <= 0) continue;

    // Determine dimensions based on aspect ratio
    let w = maxW;
    let h = w / aspectRatio;

    // Check if height fits, if not, scale down
    if (h > maxH) {
      h = maxH;
      w = h * aspectRatio;
    }

    // Maximize area
    if (w > bestWidth) {
      bestWidth = w;
      bestHeight = h;
      bestCols = cols;
    }
  }

  return { width: bestWidth, height: bestHeight, cols: bestCols };
}
