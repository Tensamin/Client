/**
 * Debug logging utility
 * Extracted from context/storage.tsx for use across the application
 */

type LogColor = "green" | "red" | "yellow" | "purple";

/**
 * Logs a styled debug message to the console
 * @param sender - The module/component that is logging
 * @param message - The log message
 * @param extraInfo - Optional additional data to log
 * @param color - Optional color for the message (green, red, yellow, purple)
 */
export function debugLog(
  sender: string,
  message: string,
  extraInfo?: unknown,
  color?: LogColor,
) {
  const tagStyle =
    "background: #3f3f3f; padding: 1px 4px; border-radius: 2px; " +
    "font-size: 10px; font-weight: 700; letter-spacing: 0.5px;";

  const msgStyle =
    "padding: 1px 4px; border-radius: 2px; font-size: 10px; " +
    "font-family: 'Consolas', 'Monaco', monospace; " +
    (color === "green"
      ? "color: #a6d189;"
      : color === "red"
        ? "color: #e78284;"
        : color === "yellow"
          ? "color: #f9e2af;"
          : color === "purple"
            ? "color: #ca9ee6;"
            : "");

  console.log(
    "%c%s%c %c%s%c",
    tagStyle,
    sender,
    "",
    msgStyle,
    message,
    "",
    extraInfo !== undefined ? extraInfo : "",
  );
}

// Legacy export name for backwards compatibility
export const rawDebugLog = debugLog;
