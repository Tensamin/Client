/**
 * Sound playback utility
 * Handles playing UI sounds for various app events
 * 
 * Extracted from lib/sound.ts
 */

import { debugLog } from "@/lib/logger";

export type SoundName =
  | "call"
  | "call2"
  | "call_join"
  | "call_leave"
  | "message"
  | "stream_start_self"
  | "stream_end_self"
  | "stream_start_other"
  | "stream_end_other"
  | "stream_watch_other"
  | "stream_watch_end";

const SOUNDS_PATH = "/assets/sounds";

/**
 * Play a sound effect
 * @param sound - The name of the sound file (without extension)
 * @param loop - Whether to loop the sound
 * @returns A cleanup function to stop the sound
 */
export async function playSound(
  sound: SoundName | string,
  loop = false,
): Promise<() => Promise<void>> {
  try {
    const audioContext = new (window.AudioContext ||
      // @ts-expect-error webkit prefix
      window.webkitAudioContext)();
    const response = await fetch(`${SOUNDS_PATH}/${sound}.wav`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    source.loop = Boolean(loop);

    let stopped = false;
    const cleanup = async () => {
      if (stopped) return;
      stopped = true;
      try {
        source.onended = null;
        source.stop();
      } catch {
        /* ignore */
      }
      try {
        await audioContext.close();
      } catch {
        /* ignore */
      }
    };

    if (!loop) {
      source.onended = () => {
        if (!stopped) {
          stopped = true;
          audioContext.close().catch(() => {});
        }
      };
    }

    source.start(0);
    return cleanup;
  } catch (err: unknown) {
    debugLog("Sound", "Failed to play sound", err, "red");
    // return a no-op stop to keep the return type consistent
    return async () => {};
  }
}

/**
 * Preload a sound for faster playback
 */
export async function preloadSound(sound: SoundName | string): Promise<void> {
  try {
    await fetch(`${SOUNDS_PATH}/${sound}.wav`);
  } catch {
    // Ignore preload failures
  }
}
