/**
 * Application default settings
 * Consolidated from lib/defaults.ts and lib/utils.tsx
 */

// Audio defaults
export const audioDefaults = {
  channelCount: 1,
  sampleSize: 16,
  sampleRate: 48000,
} as const;

// Screen share defaults
export const screenShareDefaults = {
  audio: false,
  audioSource: "none",
  width: 1280,
  height: 720,
  frameRate: 60,
} as const;

// Chat defaults
export const chatDefaults = {
  showLinesInCodeBlocks: false,
  codeBlockShikiTheme: "houston",
  sendMessageReadFeedback: true,
} as const;

// UI constants
export const uiDefaults = {
  mobileBreakpoint: 768,
  maxSendBoxSize: 200, // px
  initialMessages: 30,
  responseTimeout: 20000,
  retryCount: 10,
  themeSize: 9,
} as const;

// Combined defaults object for backwards compatibility
export const defaults = {
  // Audio
  ...audioDefaults,
  
  // Screen share (prefixed for storage keys)
  call_screenShare_audio: screenShareDefaults.audio,
  call_screenShare_audioSource: screenShareDefaults.audioSource,
  call_screenShare_width: screenShareDefaults.width,
  call_screenShare_height: screenShareDefaults.height,
  call_screenShare_frameRate: screenShareDefaults.frameRate,
  
  // Chat
  ...chatDefaults,
} as const;

// Legacy named export for backwards compatibility
export const shortcuts = {
  "CmdOrCtrl+K": "test",
} as const;

export type DefaultSettings = typeof defaults;
