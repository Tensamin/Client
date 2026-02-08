/**
 * Screen share preview management
 * Handles capturing and broadcasting screen share preview images
 * 
 * Extracted from context/call.tsx
 */

import { LocalVideoTrack } from "livekit-client";

const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 270;
const PREVIEW_QUALITY = 0.5;
const PREVIEW_UPDATE_INTERVAL = 60000; // 1 minute

/**
 * Capture a single frame from a screen share track as a preview image
 */
export async function captureScreenShareFrame(
  track: LocalVideoTrack,
): Promise<string | null> {
  const video = document.createElement("video");
  video.muted = true;
  video.srcObject = new MediaStream([track.mediaStreamTrack]);
  await video.play();

  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth = canvas.width;
  let drawHeight = canvas.width / videoAspect;
  let offsetX = 0;
  let offsetY = (canvas.height - drawHeight) / 2;

  if (videoAspect < canvasAspect) {
    drawWidth = canvas.height * videoAspect;
    drawHeight = canvas.height;
    offsetX = (canvas.width - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  const dataUrl = canvas.toDataURL("image/webp", PREVIEW_QUALITY);

  video.pause();
  video.srcObject = null;

  return dataUrl;
}

/**
 * Create a preview update message for data channel broadcast
 */
export function createPreviewMessage(preview: string | null): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    JSON.stringify({
      type: "stream_preview",
      preview,
    }),
  );
}

export { PREVIEW_UPDATE_INTERVAL };
