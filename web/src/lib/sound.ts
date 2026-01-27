import { rawDebugLog } from "@/context/storage";

export const playSound = async (
  sound: string,
  loop = false,
): Promise<() => Promise<void>> => {
  try {
    const audioContext = new (
      window.AudioContext ||
      // @ts-expect-error idk
      window.webkitAudioContext
    )();
    const response = await fetch(`/assets/sounds/${sound}.wav`);
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
    rawDebugLog("Sound Module", "Failed to play sound", err, "red");
    // return a no-op stop to keep the return type consistent
    return async () => {};
  }
};
