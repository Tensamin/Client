"use client";

// Package Imports
import { useState } from "react";
import { motion } from "framer-motion";

// Lib Imports
import { Padding } from "@/lib/utils";

// Context Imports
import { CryptoProvider, useCryptoContext } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";
import { MessageProvider } from "@/context/message";
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Components
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Loading } from "@/components/loading";
import { UserModal } from "@/components/modals/user";
import { Communities, Conversations } from "@/components/modals/category";

// Pages
import LoginPage from "@/page/login";
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";
import ChatPage from "@/page/chat";

function MainPage() {
  const { ownUuid } = useCryptoContext();
  const { page, pageData } = usePageContext();
  const { translate } = useStorageContext();
  const [category, setCategory] = useState<"CONVERSATIONS" | "COMMUNITIES">(
    "CONVERSATIONS"
  );

  function PageSwitch() {
    const { open, isMobile } = useSidebar();

    let jsxPage;
    switch (page) {
      case "home":
        jsxPage = <HomePage />;
        break;
      case "settings":
        jsxPage = <SettingsPage />;
        break;
      case "chat":
        jsxPage = <ChatPage />;
        break;
      default:
        jsxPage = (
          <div>
            {translate("PAGE_UNKNOWN")} | {pageData}
          </div>
        );
        break;
    }

    return (
      <div className={`${open && !isMobile && `pl-${Padding / 2}`} h-full`}>
        <div
          className={`${open && !isMobile ? "rounded-tl-xl border-l" : ""} w-full h-full border-t border-input bg-background p-2`}
        >
          {jsxPage}
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-0">
        <SidebarHeader
          className={`p-0 pl-${Padding} pt-${Padding} pr-${Padding / 2} flex flex-col gap-${Padding * 3}`}
        >
          <div className="pt-2 pt-1 pl-1 pr-1" hidden />
          <UserModal key={ownUuid} uuid={ownUuid} size="big" />
          <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden p-1">
            <div className="relative grid grid-cols-2 w-full gap-2">
              {["COMMUNITIES", "CONVERSATIONS"].map((cat: string) => (
                <Button
                  key={cat}
                  variant="ghost"
                  type="button"
                  className="relative isolate rounded-full py-1.5 transition-colors dark:hover:bg-input/20 hover:bg-input/20"
                  onClick={() =>
                    setCategory(cat as "COMMUNITIES" | "CONVERSATIONS")
                  }
                  aria-pressed={category === cat}
                  aria-label={cat}
                >
                  {category === cat && (
                    <motion.span
                      aria-hidden="true"
                      layoutId="category-pill"
                      className="absolute inset-0 rounded-full bg-input/50 pointer-events-none border"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                    />
                  )}
                  <span className="relative z-10 hover:underline underline-offset-2 text-sm">
                    {translate(cat)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <div>
            {["COMMUNITIES", "CONVERSATIONS"].map((cat) => {
              if (cat !== category) return null;
              return category === "COMMUNITIES" ? (
                <Communities key={category} />
              ) : (
                <Conversations key={category} />
              );
            })}
          </div>
        </SidebarHeader>
        <SidebarContent></SidebarContent>
      </Sidebar>
      <div className="w-full h-screen flex flex-col bg-sidebar">
        <Navbar />
        <PageSwitch />
      </div>
    </>
  );
}

export default function Page() {
  const { page, pageData } = usePageContext();

  if (page === "error") return <Loading message={pageData || "ERROR"} />;
  if (page === "login")
    return (
      <CryptoProvider>
        <LoginPage />
      </CryptoProvider>
    );

  return (
    <CryptoProvider>
      <SocketProvider>
        <UserProvider>
          <MessageProvider>
            <SidebarProvider>
              <MainPage />
            </SidebarProvider>
          </MessageProvider>
        </UserProvider>
      </SocketProvider>
    </CryptoProvider>
  );
}
