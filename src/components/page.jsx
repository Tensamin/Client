"use client";

// Package Imports
import { useState, useEffect } from "react";
import { LazyMotion, domAnimation, AnimatePresence, m, MotionConfig } from "framer-motion";

// Context Imports
import { usePageContext } from "@/components/context/page";
import { useThemeContext } from "@/components/context/theme";

// Components
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/page/root/navbar";
import { AppSidebar } from "@/components/page/root/sidebar";
import { Main as ChatMain } from "@/components/page/chat/main";
import { Main as HomeMain } from "@/components/page/home/main";
import { Main as SettingsMain } from "@/components/page/settings/main";
import { VoiceExpanded, VoiceRearrangement } from "@/components/page/voice/main";
import { Main as CommunityMain } from "@/components/page/community/main";
import { GettingCalled } from "@/components/page/voice/parts";

let variants = {
  initial: { opacity: 0, y: 16, scale: 0.99, filter: "blur(2px)" },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 26,
      mass: 0.9,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.992,
    filter: "blur(1px)",
    transition: { duration: 0.1, ease: [0.4, 0, 0.2, 1] },
  },
};

function PagePresence({ id, className, children }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={id}
            variants={variants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={className}
          >
            {children}
          </m.div>
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}

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
            <div className="relative h-full flex flex-col flex-1 bg-sidebar overflow-hidden">
              <GettingCalled />
              <PagePresence id={page.name+page.data} className="absolute inset-0 overflow-auto flex flex-col items-center min-h-full">
                {page.name === "chat" && <ChatMain data={page.data} />}
                {page.name === "home" && <HomeMain data={page.data} />}
                {page.name === "settings" && <SettingsMain data={page.data} />}
                {page.name === "voice-expanded" && <VoiceExpanded data={page.data} />}
                {page.name === "voice-rearrangement" && <VoiceRearrangement data={page.data} />}
                {page.name === "community" && <CommunityMain data={page.data} />}
              </PagePresence>
            </div>
          </SidebarInset>
          {sidebarRightSide && <AppSidebar />}
        </div>
      </div>
      <Toaster />
    </>
  );
}