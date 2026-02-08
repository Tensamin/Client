/**
 * Platform detection utilities
 * Extracted from context/storage.tsx
 */

export type PlatformInfo = {
  isElectron: boolean;
  isTauri: boolean;
  isLinux: boolean;
  isWayland: boolean;
  isBrowser: boolean;
};

/**
 * Check if running in Electron environment
 */
export function checkIsElectron(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error ElectronAPI only available in Electron
  return Boolean(window.electronAPI);
}

/**
 * Check if running in Tauri environment
 */
export function checkIsTauri(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error Tauri internals only available in Tauri
  return Boolean(window.__TAURI_INTERNALS__);
}

/**
 * Get comprehensive platform information
 * This is async because some platform info requires calling Electron APIs
 */
export async function getPlatformInfo(): Promise<PlatformInfo> {
  const isElectron = checkIsElectron();
  const isTauri = checkIsTauri();

  let isLinux = false;
  let isWayland = false;

  if (isElectron) {
    try {
      // @ts-expect-error Electron API only available in Electron
      if (window.electronAPI?.getPlatformInfo) {
        // @ts-expect-error Electron API only available in Electron
        const info = await window.electronAPI.getPlatformInfo();
        isLinux = info.isLinux ?? false;
        isWayland = info.isWayland ?? false;
      }
    } catch {
      // Ignore errors, use defaults
    }
  }

  return {
    isElectron,
    isTauri,
    isLinux,
    isWayland,
    isBrowser: !isElectron && !isTauri,
  };
}

/**
 * Synchronous platform check (limited info)
 */
export function getPlatformInfoSync(): Pick<
  PlatformInfo,
  "isElectron" | "isTauri" | "isBrowser"
> {
  const isElectron = checkIsElectron();
  const isTauri = checkIsTauri();

  return {
    isElectron,
    isTauri,
    isBrowser: !isElectron && !isTauri,
  };
}
