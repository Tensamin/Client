"use client";

// Package Imports
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Lib Imports
import ls from "@/lib/local_storage";
import { isElectron } from "@/lib/utils";

// Context Imports
import { WebSocketProvider } from "@/components/context/websocket";
import { MessageProvider } from "@/components/context/message";
import { UsersProvider } from "@/components/context/users";
import { PageProvider } from "@/components/context/page";
import { CryptoProvider } from "@/components/context/crypto";
import { ThemeProvider } from "@/components/context/theme";
import { CallProvider } from "@/components/context/call";
import { CommunityProvider } from "@/components/context/communtiy";
import { SidebarProvider } from "@/components/ui/sidebar";

// Components
import { Loading } from "@/components/loading";
import { Page } from "@/components/page";

// Main
export default function LoadingWrapper() {
  let [isAuthenticated, setIsAuthenticated] = useState(false);
  let [isLoading, setIsLoading] = useState(true);

  // Electron + window state
  let [isElectronApp, setIsElectronApp] = useState(false);
  let [isFullscreen, setIsFullscreen] = useState(false);
  let [isMaximized, setIsMaximized] = useState(false);

  let router = useRouter();
  let pathname = usePathname();

  useEffect(() => {
    let private_key = ls.get("auth_private_key");
    let uuid = ls.get("auth_uuid");

    let authenticated = private_key && uuid;
    setIsAuthenticated(authenticated);

    if (pathname === "/login") {
      setIsLoading(false);
      return;
    }

    if (!authenticated) {
      router.push("/login");
      setIsLoading(true);
      return;
    }
  }, [router, pathname]);

  useEffect(() => {
    if (pathname === "/login") {
      setIsLoading(false);
      return;
    }

    if (isAuthenticated) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    try {
      setIsElectronApp(isElectron());
    } catch {
      setIsElectronApp(false);
    }
  }, []);

  useEffect(() => {
    if (!isElectronApp) return;

    let near = (a, b, tol = 8) => Math.abs(a - b) <= tol;

    let computeWindowStates = () => {
      let doc = document;

      let browserFS =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;

      let coverDisplay =
        near(window.innerWidth, screen.width) &&
        near(window.innerHeight, screen.height);

      let availW = screen.availWidth || screen.width;
      let availH = screen.availHeight || screen.height;
      let isMax =
        near(window.outerWidth, availW) && near(window.outerHeight, availH);

      setIsFullscreen(Boolean(browserFS) || coverDisplay);
      setIsMaximized(Boolean(isMax));
    };

    computeWindowStates();

    let onResize = () => computeWindowStates();
    let onFsChange = () => computeWindowStates();

    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
    };
  }, [isElectronApp]);

  useEffect(() => {
    let intervalId = setInterval(() => {
      let warningMessage = `
  %cDO NOT PASTE ANYTHING IN HERE!
`;
      let styles = ["color: red; font-size: 20px; font-weight: bold;"];

      if (ls.get("debug") !== "true" && ls.get("debug") !== "no-warning") {
        console.log(warningMessage, ...styles);
        console.log("Enabled debug mode to hide this warning.");
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  let roundedShell = isElectronApp && !isFullscreen && !isMaximized;

  let content = isLoading ? (
    <Loading />
  ) : pathname === "/login" ? (
    <Page />
  ) : isAuthenticated ? (
    <CryptoProvider>
      <UsersProvider>
        <WebSocketProvider>
          <MessageProvider>
            <CallProvider>
              <PageProvider>
                <CommunityProvider>
                  <ThemeProvider>
                    <SidebarProvider className="bg-sidebar">
                      <Page />
                    </SidebarProvider>
                  </ThemeProvider>
                </CommunityProvider>
              </PageProvider>
            </CallProvider>
          </MessageProvider>
        </WebSocketProvider>
      </UsersProvider>
    </CryptoProvider>
  ) : null;

  return (
    <div
      className={`min-h-screen ${
        roundedShell ? "overflow-hidden rounded-2xl" : ""
      }`}
    >
      {content}
    </div>
  );
}
