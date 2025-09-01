"use client";

// Package Imports
import { useState, useEffect } from "react";

// Context Imports
import { usePageContext } from "@/components/context/page";
import { useThemeContext } from "@/components/context/theme";

// Components
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
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
  let { page } = usePageContext();
  let { sidebarRightSide } = useThemeContext();
  let { open } = useSidebar();

  return (
    <>
      <div className="flex flex-col w-screen h-screen overflow-hidden">
        <div className="flex h-11">
          <Navbar />
        </div>

        <div className={`flex flex-1 overflow-hidden ${sidebarRightSide && "p-2 pr-0"}`}>
          {!sidebarRightSide && <AppSidebar />}
          <SidebarInset className={`flex flex-col flex-1 overflow-hidden ${sidebarRightSide && !open && "mr-2"}`}>
            {/*
              <div
                className={`flex flex-col items-center gap-5 flex-1 overflow-auto p-5 h-full transition-all duration-175 ease-out ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
              >
              */}
            <div className="h-full flex flex-col items-center flex-1 overflow-auto bg-sidebar">
              <GettingCalled />
              {page.name === "chat" && <ChatMain data={page.data} />}
              {page.name === "home" && <HomeMain data={page.data} />}
              {page.name === "settings" && <SettingsMain data={page.data} />}
              {page.name === "voice-expanded" && <VoiceExpanded data={page.data} />}
              {page.name === "voice-rearrangement" && <VoiceRearrangement data={page.data} />}
              {page.name === "community" && <CommunityMain data={page.data} />}
            </div>
            {/*
              </div>
              */}
          </SidebarInset>
          {sidebarRightSide && <AppSidebar />}
        </div>
      </div>
      <Toaster />
    </>
  );
}
