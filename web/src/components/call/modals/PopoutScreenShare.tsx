// Package Imports
import { TrackReference } from "@livekit/components-core";
import { VideoTrack } from "@livekit/components-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Types
interface PopoutScreenShareProps {
  trackRef: TrackReference;
  title: string;
  onClose: () => void;
}

// Main
export function PopoutScreenShare({
  trackRef,
  title,
  onClose,
}: PopoutScreenShareProps) {
  const externalWindow = useRef<Window | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Open the new window
    const win = window.open("", "", "width=1280,height=720,left=100,top=100");

    if (!win) {
      onClose();
      return;
    }

    externalWindow.current = win;

    // Set up the document
    win.document.title = `${title}'s Screen Share - Tensamin`;
    win.document.body.style.margin = "0";
    win.document.body.style.padding = "0";
    win.document.body.style.overflow = "hidden";
    win.document.body.style.backgroundColor = "#000";
    win.document.body.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Copy styles from parent
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((style) => {
      win.document.head.appendChild(style.cloneNode(true));
    });

    // Add custom styles for the popout
    const customStyle = win.document.createElement("style");
    customStyle.textContent = `
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: #000;
        overflow: hidden;
      }
      .popout-container {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: #000;
      }
      .popout-header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
        z-index: 100;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .popout-container:hover .popout-header {
        opacity: 1;
      }
      .popout-header h3 {
        color: white;
        margin: 0;
        font-size: 14px;
        font-weight: 500;
      }
      .popout-controls {
        display: flex;
        gap: 8px;
      }
      .popout-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
      }
      .popout-btn:hover {
        background: rgba(255,255,255,0.2);
      }
      .popout-video {
        flex: 1;
        width: 100%;
        height: 100%;
      }
      .popout-video video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      }
    `;
    win.document.head.appendChild(customStyle);

    // Create container
    const containerDiv = win.document.createElement("div");
    containerDiv.id = "popout-root";
    win.document.body.appendChild(containerDiv);
    setContainer(containerDiv);

    // Handle window close
    const handleBeforeUnload = () => {
      onClose();
    };

    win.addEventListener("beforeunload", handleBeforeUnload);

    // Handle fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!win.document.fullscreenElement);
    };

    win.document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      win.removeEventListener("beforeunload", handleBeforeUnload);
      win.document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
      win.close();
      externalWindow.current = null;
      setContainer(null);
    };
  }, [title, onClose]);

  const toggleFullscreen = useCallback(() => {
    const win = externalWindow.current;
    if (!win) return;

    if (!win.document.fullscreenElement) {
      win.document.documentElement.requestFullscreen?.();
    } else {
      win.document.exitFullscreen?.();
    }
  }, []);

  const handleClose = useCallback(() => {
    externalWindow.current?.close();
    onClose();
  }, [onClose]);

  if (!container) {
    return null;
  }

  return createPortal(
    <div className="popout-container">
      <div className="popout-header">
        <h3>{title}&apos;s Screen Share</h3>
        <div className="popout-controls">
          <button
            className="popout-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>
          <button className="popout-btn" onClick={handleClose} title="Close">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="popout-video">
        <VideoTrack trackRef={trackRef} />
      </div>
    </div>,
    container,
  );
}
