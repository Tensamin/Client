"use client";

// Context Imports
import { usePageContext } from "@/context/page";

// Components
import { PageTransition } from "@/components/animation/page-transition";
import { Navbar } from "@/components/navbar";

// Pages
import Main from "@/components/sidebar/Main";
import ChatPage from "@/page/chat";
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";
import CallPage from "@/special/call/layout/page";

export default function Page() {
  const { page, pageInstance } = usePageContext();

  return (
    <PageTransition>
      <div className="w-full h-screen flex bg-sidebar">
        <Main />
        <div className="flex-1 h-full flex flex-col">
          <Navbar />
          <div className="flex-1 bg-background rounded-tl-xl border overflow-auto">
            {page === "home" && <HomePage key={`home-${pageInstance}`} />}
            {page === "settings" && (
              <SettingsPage key={`settings-${pageInstance}`} />
            )}
            {page === "chat" && <ChatPage key={`chat-${pageInstance}`} />}
            {page === "call" && <CallPage key={`call-${pageInstance}`} />}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
