"use client";

// Package Imports
import { useState, useEffect } from "react";

// Context Imports
import { usePageContext } from "@/components/context/page";
import { useThemeContext } from "@/components/context/theme";

// Components
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/page/root/navbar";
import { AppSidebar } from "@/components/page/root/sidebar";
import { Main as ChatMain } from "@/components/page/chat/main";
import { Main as HomeMain } from "@/components/page/home/main";
import { Main as SettingsMain } from "@/components/page/settings/main";
import {
  VoiceExpanded,
  VoiceRearrangement,
} from "@/components/page/voice/main";
import { Main as CommunityMain } from "@/components/page/community/main";
import { GettingCalled } from "@/components/page/voice/parts";

export function Page() {
  let [isVisible, setIsVisible] = useState(false);
  let { page } = usePageContext();
  let { sidebarRightSide } = useThemeContext();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SidebarProvider className="bg-sidebar">
        <div className="flex flex-col w-screen h-screen overflow-hidden">
          <div className="flex h-12">
            <Navbar />
          </div>

          <div className="flex flex-1 overflow-hidden">
            {!sidebarRightSide ? <AppSidebar /> : null}

            <SidebarInset className="border-1 border-card rounded-4xl m-2 flex flex-col flex-1 overflow-hidden">
              <div
                className={`flex flex-col items-center gap-5 flex-1 overflow-auto p-5 h-full transition-all duration-175 ease-out ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
              >
                <GettingCalled />
                {page.name === "chat" ? <ChatMain data={page.data} /> : null}
                {page.name === "home" ? <HomeMain data={page.data} /> : null}
                {page.name === "settings" ? (
                  <SettingsMain data={page.data} />
                ) : null}
                {page.name === "voice-expanded" ? (
                  <VoiceExpanded data={page.data} />
                ) : null}
                {page.name === "voice-rearrangement" ? (
                  <VoiceRearrangement data={page.data} />
                ) : null}
                {page.name === "community" ? (
                  <CommunityMain data={page.data} />
                ) : null}
              </div>
            </SidebarInset>

            {sidebarRightSide ? <AppSidebar /> : null}
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </>
  );
}
